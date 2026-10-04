"use strict"

// Online play: deterministic lockstep over a PeerJS (WebRTC) data channel. Both browsers run the same game
// from a shared seed and only exchange player inputs, which reference cards by uid and rows by seat.
// Seat 0 hosts the room, seat 1 joins it. Each seat's inputs form a log that is resent after a reconnect
// and replayed to rebuild the match after a page reload.
const ONLINE_PROTOCOL = 2;
const PEER_PREFIX = "gwent-classic-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const GRACE_MS = 60000;
const HEARTBEAT_MS = 3000;
const SILENCE_MS = 10000;
const MAX_MESSAGE = 65536;
const MAX_LOG = 5000;
const REPLAY_SPEED = 0.02;
const TIMER_CHOICES = [0, 30, 60, 90];
const INPUT_KINDS = ["turn", "redraw", "medic", "pick", "discard", "row", "first"];
const WAIT_TEXT = {
	redraw: "is redrawing cards…",
	medic: "is choosing a unit to revive…",
	pick: "is choosing a card…",
	discard: "is choosing cards to discard…",
	row: "is choosing a row…",
	first: "is deciding who goes first…"
};
const SESSION_KEY = "gc-online-session";

function randomId(length, chars = CODE_CHARS) {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, b => chars[b % chars.length]).join("");
}

// Strips control characters; names are only ever rendered with textContent
function cleanName(name) {
	return String(name ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
}

// FNV-1a, for comparing game states
function hashString(str) {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36);
}

// Known deck rule ids from untrusted input, in canonical order
function cleanRules(rules) {
	return Array.isArray(rules) ? Object.keys(DeckMaker.RULES).filter(r => rules.includes(r)) : [];
}

function rulesText(rules) {
	return rules.length ? "Rules: " + rules.map(r => DeckMaker.RULES[r].label).join(", ") : "Standard deck rules";
}

const Online = {
	// ---- match (engine) state ----
	active: false,
	replaying: false,
	timeScale: 1,
	rng: Math.random,
	seat: 0,
	start: null,
	log: [[], []],
	pending: [[], []],
	replayLeft: 0,
	waiter: null,
	turnOpen: false,
	turnCount: 0,
	sums: {},
	peerSums: {},
	strikes: 0,
	rematch: {me: false, op: false},
	timers: {},

	// ---- room (connection) state ----
	peer: null,
	conn: null,
	role: null,
	code: "",
	token: "",
	connected: false,
	guestJoined: false,
	name: "",
	opponentName: "",
	timerSetting: 60,
	rulesSetting: [],
	ready: false,
	opponentReady: false,
	myDeck: null,
	opponentDeck: null,
	lastHeard: 0,
	beat: null,
	dropAt: 0,
	dropTimer: null,
	joinTimer: null,

	// ================= engine integration =================

	// [seat 0 player, seat 1 player]
	players() {
		return player_me.seat === 0 ? [player_me, player_op] : [player_op, player_me];
	},

	// Rows are sent as "<seat of the side><c|r|s>", the weather row as "w"
	rowCode(row) {
		if (row === weather)
			return "w";
		const i = board.row.indexOf(row);
		return i < 0 ? null : (i >= 3 ? player_me : player_op).seat + row.type[0];
	},

	decodeRow(code) {
		if (code === "w")
			return weather;
		if (typeof code !== "string" || code.length !== 2)
			return null;
		const player = this.players()[Number(code[0])];
		const index = {c: [3, 2], r: [4, 1], s: [5, 0]}[code[1]];
		if (!player || !index)
			return null;
		return board.row[index[player === player_me ? 0 : 1]];
	},

	// True when the player's next inputs come from the log or the network instead of this device's UI
	scripted(player) {
		return player.isRemote() || this.pending[player.seat].length > 0;
	},

	// Resolves with the seat's next input, waiting on the network if it hasn't arrived yet
	next(seat, kind) {
		if (this.pending[seat].length)
			return Promise.resolve(this.take(seat, kind));
		return new Promise(resolve => this.waiter = {seat, kind, resolve});
	},

	take(seat, kind) {
		const entry = this.pending[seat].shift();
		if (entry.r && --this.replayLeft === 0)
			this.setReplaying(false);
		if (entry.k !== kind) {
			this.fail("Expected " + kind + " from " + this.players()[seat].name + " but received " + entry.k + ".");
			return undefined;
		}
		return entry.d;
	},

	pump() {
		const w = this.waiter;
		if (!w || !this.pending[w.seat].length)
			return;
		this.waiter = null;
		w.resolve(this.take(w.seat, w.kind));
	},

	// Waits for the opponent (or the replay log) with the timer and a status line showing
	async waitFor(player, kind) {
		const live = !this.pending[player.seat].length;
		if (live) {
			this.startTimer(player);
			this.showWaiting(player, kind);
		}
		const d = await this.next(player.seat, kind);
		if (live) {
			this.stopTimer(player);
			this.showWaiting(null);
		}
		return d;
	},

	record(seat, kind, d) {
		const entry = {k: kind, d: d};
		this.log[seat].push(entry);
		this.send({t: "in", n: this.log[seat].length - 1, k: kind, d: d});
	},

	// Sends the local player's turn action before it is played out on this device
	commit(player, d) {
		if (!this.active || !player.isHuman() || this.replaying)
			return;
		this.turnOpen = false;
		this.stopTimer(player);
		this.record(player.seat, "turn", d);
	},

	async localTurn(player) {
		if (this.pending[player.seat].length)
			return this.applyTurn(player, await this.next(player.seat, "turn"));
		this.turnOpen = true;
		this.startTimer(player, () => this.timeoutPass(player));
	},

	async remoteTurn(player) {
		const session = game.session;
		const d = await this.waitFor(player, "turn");
		if (session !== game.session || d === undefined)
			return;
		await this.applyTurn(player, d);
	},

	// Plays a turn action received from the network (or the replay log), rejecting anything the UI wouldn't allow
	async applyTurn(player, d) {
		if (!d || typeof d !== "object")
			return this.fail("Invalid move from " + player.name + ".");
		const card = player.hand.cards.find(c => c.uid === d.c);
		switch (d.a) {
			case "pass":
				return player.passRound();
			case "leader":
				if (!player.leaderAvailable)
					break;
				return player.activateLeader();
			case "scorch":
				if (card?.name !== "Scorch")
					break;
				return player.playScorch(card);
			case "row": {
				const row = this.decodeRow(d.r);
				if (!card || card.name === "Scorch" || card.name === "Decoy" || !row || !ui.legalRows(card).includes(row))
					break;
				return player.playCardToRow(card, row);
			}
			case "decoy": {
				const row = this.decodeRow(d.r);
				const target = row?.cards.find(c => c.uid === d.x);
				if (card?.name !== "Decoy" || !row || !ui.legalRows(card).includes(row) || !target?.isUnit())
					break;
				return player.playCardAction(card, async () => await Promise.all([
					board.toHand(target, row),
					board.moveTo(card, row, player.hand)
				]));
			}
		}
		this.fail("Invalid move from " + player.name + ".");
	},

	// ui.queueCarousel for a player's card choice: shown locally and sent, or replayed from the opponent's picks
	async carousel(player, kind, container, count, action, predicate, ...view) {
		if (!this.active)
			return ui.queueCarousel(container, count, action, predicate, ...view);
		const session = game.session;
		if (this.scripted(player)) {
			const uids = await this.waitFor(player, kind);
			if (session !== game.session)
				return;
			if (!Array.isArray(uids) || uids.length > count)
				return this.fail("Invalid choice from " + player.name + ".");
			for (const uid of uids) {
				const i = container.cards.findIndex(c => c.uid === uid);
				if (i < 0 || (predicate && !predicate(container.cards[i])))
					return this.fail("Invalid choice from " + player.name + ".");
				await action(container, i);
				if (session !== game.session)
					return;
			}
			return;
		}
		const uids = [];
		this.startTimer(player, () => this.autoResolve());
		await ui.queueCarousel(container, count, async (c, i) => {
			uids.push(c.cards[i].uid);
			await action(c, i);
		}, predicate, ...view);
		// queueCarousel returns early when it had to queue behind another carousel
		await sleepUntil(() => ui.carousels.length === 0 && !Carousel.curr, 100);
		this.stopTimer(player);
		if (session === game.session)
			this.record(player.seat, kind, uids);
	},

	// ui.waitForRowSelection for an agile unit (close or ranged); null when cancelled
	async rowChoice(player, card) {
		if (!this.active)
			return ui.waitForRowSelection(card);
		const legal = [board.getRow(card, "close", card.holder), board.getRow(card, "ranged", card.holder)];
		if (this.scripted(player)) {
			const code = await this.waitFor(player, "row");
			if (code === null || code === undefined)
				return null;
			const row = this.decodeRow(code);
			if (!legal.includes(row)) {
				this.fail("Invalid row from " + player.name + ".");
				return null;
			}
			return row;
		}
		this.startTimer(player, () => this.autoResolve());
		let row = await ui.waitForRowSelection(card);
		this.stopTimer(player);
		if (!legal.includes(row))
			row = null;
		this.record(player.seat, "row", row && this.rowCode(row));
		return row;
	},

	// Any other choice; local() shows the UI and returns a JSON value, valid() checks the opponent's value
	async choice(player, kind, local, valid) {
		if (!this.active)
			return local();
		if (this.scripted(player)) {
			const d = await this.waitFor(player, kind);
			if (!valid(d)) {
				this.fail("Invalid choice from " + player.name + ".");
				return undefined;
			}
			return d;
		}
		this.startTimer(player, () => this.autoResolve());
		const d = await local();
		this.stopTimer(player);
		this.record(player.seat, kind, d);
		return d;
	},

	// Out of time in a choice: skip it if possible, otherwise take the card on show
	autoResolve() {
		if (Popup.curr)
			Popup.curr.selectYes();
		else if (Carousel.curr)
			Carousel.curr.bExit ? Carousel.curr.cancel() : Carousel.curr.select({stopPropagation() {}});
		else if (game.placedEffectsActive && ui.previewCard)
			ui.cancel();
	},

	// Out of time on the main turn: pass the round
	timeoutPass(player) {
		if (!this.turnOpen || game.currPlayer !== player)
			return;
		Carousel.curr?.cancel();
		if (ui.previewCard)
			ui.cancel();
		this.commit(player, {a: "pass"});
		AudioManager.playSFX("pass");
		player.passRound();
	},

	// ================= desync detection =================

	onTurnStart() {
		const n = ++this.turnCount;
		if (this.replaying)
			return;
		this.sums[n] = this.checksum();
		this.send({t: "sum", n: n, h: this.sums[n]});
		this.compareSum(n);
	},

	compareSum(n) {
		if (this.sums[n] === undefined || this.peerSums[n] === undefined)
			return;
		// Fire-and-forget effects (e.g. an Avenger summon) can still be landing, so one mismatch is tolerated
		if (this.sums[n] === this.peerSums[n])
			this.strikes = 0;
		else if (++this.strikes >= 2)
			this.fail("The two games went out of sync.");
		else
			console.warn("Online state mismatch at turn " + n, this.stateText());
		delete this.sums[n];
		delete this.peerSums[n];
	},

	stateText() {
		const ids = cards => cards.map(c => c.uid ?? c.name).sort().join(",");
		const parts = [game.roundCount];
		for (const p of this.players()) {
			const rows = p === player_me ? [3, 4, 5] : [2, 1, 0];
			parts.push(p.health, p.passed, p.leaderAvailable, ids(p.hand.cards), p.deck.cards.map(c => c.uid).join(","), ids(p.grave.cards),
				...rows.map(i => ids(board.row[i].cards) + "/" + (board.row[i].special?.name ?? "") + "/" + board.row[i].calcScore()));
		}
		parts.push(ids(weather.cards));
		return parts.join("|");
	},

	checksum() {
		return hashString(this.stateText());
	},

	// ================= match lifecycle =================

	// Builds the seat-based players from the host's start message and starts the game.
	// log (after a page reload) is replayed at high speed to catch up with the opponent.
	async beginMatch(start, log) {
		const decks = await Promise.all(start.decks.map(d => dm.loadDeck(d, true, true)));
		if (decks.includes(null) || decks.some(d => DeckMaker.onlineRuleWarnings(d.cards, start.rules)))
			return this.fail("A deck in the match is invalid.");
		this.active = true;
		this.start = start;
		this.log = [log?.[0] ?? [], log?.[1] ?? []];
		this.pending = this.log.map(l => l.map(e => ({...e, r: true})));
		this.replayLeft = this.pending[0].length + this.pending[1].length;
		this.waiter = null;
		this.turnOpen = false;
		this.turnCount = 0;
		this.sums = {};
		this.peerSums = {};
		this.strikes = 0;
		this.rematch = {me: false, op: false};
		this.opponentInBuilder = false;
		this.ready = this.opponentReady = false;
		this.opponentDeck = null;
		this.rng = seededRandom(start.seed + "/shared");
		this.stopAllTimers();
		this.showWaiting(null);
		this.setReplaying(this.replayLeft > 0);
		this.saveSession();

		const deckFor = s => ({faction: decks[s].faction, leader: card_dict[decks[s].leader], cards: decks[s].cards});
		const op = 1 - this.seat;
		Carousel.curr?.exit();
		ui.carousels = [];
		game.reset();
		game.endScreen.classList.add("hide");
		game.rematch_elem.textContent = "Rematch";
		player_me = new Player(0, start.names[this.seat], deckFor(this.seat), true, {seat: this.seat, rng: seededRandom(start.seed + "/" + this.seat)});
		player_op = new Player(1, start.names[op], deckFor(op), false, {seat: op, remote: true, rng: seededRandom(start.seed + "/" + op)});
		if (!titleScreen.classList.contains("hide"))
			closeTitleScreen();
		document.getElementById("lobby").classList.add("hide");
		document.getElementById("deck-customization").classList.add("hide");
		document.body.classList.add("online");
		game.startGame();
	},

	setReplaying(on) {
		this.replaying = on;
		this.timeScale = on ? REPLAY_SPEED : 1;
		this.curtain(on ? "resume" : this.dropTimer ? "reconnect" : null);
		if (!on && this.turnOpen && game.currPlayer === player_me)
			this.startTimer(player_me, () => this.timeoutPass(player_me));
	},

	onGameEnd() {
		if (!this.active)
			return;
		this.turnOpen = false;
		this.stopAllTimers();
		this.showWaiting(null);
		// The opponent's client may have finished first and already answered
		if (this.opponentInBuilder)
			this.endNote(this.opponentName + " went back to choose decks.");
		else if (this.rematch.op)
			game.rematch_elem.textContent = "Accept Rematch";
	},

	endNote(msg) {
		const note = document.getElementById("end-winner");
		note.textContent = msg;
		note.classList.remove("hide");
		ui.announce(msg);
	},

	// Ends the match on a rule violation or desync
	fail(msg) {
		if (!this.active)
			return;
		console.error("Online match error:", msg);
		this.send({t: "error", msg: "desync"});
		this.abort("Match ended", msg);
	},

	abort(title, msg) {
		this.leave();
		game.returnToMainMenu();
		ui.alert(title, msg);
	},

	forfeit() {
		this.send({t: "forfeit"});
		this.leave();
		game.returnToMainMenu();
	},

	// The opponent left or never came back
	opponentLeft(msg) {
		const wasConnected = this.connected;
		this.dropConnection();
		if (game.isPlaying()) {
			game.session++;
			Carousel.curr?.exit();
			ui.carousels = [];
			ui.hidePreview();
			player_op.health = 0;
			game.endGame(msg);
		} else if (game.state === GameState.END_SCREEN) {
			this.endNote(msg);
		} else if (wasConnected) {
			this.leave();
			game.returnToMainMenu();
			ui.alert("Opponent left", msg);
		}
	},

	requestRematch() {
		if (!this.connected)
			return ui.alert("Opponent left", this.opponentName + " is no longer in the room.");
		if (this.opponentInBuilder)
			return this.toBuilder();
		if (this.rematch.me)
			return;
		this.rematch.me = true;
		game.rematch_elem.textContent = "Waiting…";
		this.send({t: "rematch"});
		this.checkRematch();
	},

	checkRematch() {
		if (this.rematch.me && this.rematch.op && this.role === "host")
			this.hostStart(this.start.decks);
	},

	requestNewGame() {
		if (!this.connected)
			return ui.alert("Opponent left", this.opponentName + " is no longer in the room.");
		this.send({t: "newgame"});
		this.toBuilder();
	},

	// Both players go back to the deck builder, still connected
	toBuilder() {
		this.turnOpen = false;
		this.stopAllTimers();
		this.showWaiting(null);
		this.start = null;
		game.returnToCustomization();
		this.enterBuilder();
	},

	saveSession() {
		if (!this.connected)
			return;
		sessionStorage.setItem(SESSION_KEY, JSON.stringify({
			code: this.code, role: this.role, seat: this.seat, token: this.token,
			name: this.name, opponent: this.opponentName, timer: this.timerSetting, rules: this.rulesSetting, at: Date.now()
		}));
	},

	// ================= deck builder (room) =================

	enterBuilder() {
		document.getElementById("lobby").classList.add("hide");
		if (!titleScreen.classList.contains("hide"))
			closeTitleScreen();
		document.getElementById("deck-customization").classList.remove("hide");
		document.body.classList.remove("deck-only");
		document.body.classList.add("online");
		DeckMaker.onlineRules = this.rulesSetting;
		dm.setGameMode("ai", true);
		this.ready = false;
		this.opponentInBuilder = false;
		this.updatePanel();
	},

	updatePanel() {
		const timer = this.timerSetting ? this.timerSetting + "s turn timer" : "No turn timer";
		document.getElementById("online-room").textContent = "Room " + this.code + " · " + timer;
		document.getElementById("online-rules").textContent = rulesText(this.rulesSetting);
		document.getElementById("online-opponent").textContent = !this.connected ? "Opponent disconnected"
			: this.opponentName + (this.opponentReady ? " is ready" : " is choosing a deck");
		document.getElementById("online-opponent").classList.toggle("ready", this.connected && this.opponentReady);
		const start = document.getElementById("start-game");
		start.textContent = !this.connected ? "Start game" : this.ready ? "Cancel Ready" : "Ready";
		start.classList.toggle("waiting", this.connected && this.ready);
	},

	toggleReady() {
		if (this.ready) {
			this.ready = false;
			this.send({t: "ready", deck: null});
			return this.updatePanel();
		}
		const p1 = dm.playerDeck("p1");
		const warning = DeckMaker.ruleWarnings(p1.units, p1.special) + DeckMaker.onlineRuleWarnings(p1.deck.cards, this.rulesSetting);
		if (warning)
			return ui.alert("Invalid deck", warning);
		AudioManager.playSFX("ui_card_bank");
		this.ready = true;
		this.myDeck = {faction: p1.deck.faction, leader: card_dict.indexOf(p1.deck.leader), cards: p1.deck.cards.map(c => [c.index, c.count])};
		this.send({t: "ready", deck: this.myDeck});
		this.updatePanel();
		this.maybeStart();
	},

	maybeStart() {
		if (this.role === "host" && this.ready && this.opponentReady && !this.start)
			this.hostStart([this.myDeck, this.opponentDeck]);
	},

	// Host: validates both decks and starts a match with a fresh seed
	async hostStart(decks) {
		const valid = await Promise.all(decks.map(d => dm.loadDeck(d, true, true)));
		if (valid.includes(null) || valid.some(d => DeckMaker.onlineRuleWarnings(d.cards, this.rulesSetting))) {
			this.ready = this.opponentReady = false;
			this.send({t: "ready", deck: null, reset: true});
			this.updatePanel();
			return ui.alert("Invalid deck", "One of the decks breaks the deck rules. Both players need to ready up again.");
		}
		const start = {
			id: randomId(8),
			seed: randomId(16),
			timer: this.timerSetting,
			rules: this.rulesSetting,
			names: [this.name, this.opponentName],
			decks: valid.map(d => ({faction: d.faction, leader: d.leader, cards: d.cards.map(c => [c.index, c.count])}))
		};
		this.send({t: "start", start: start});
		this.beginMatch(start);
	},

	validStart(s) {
		return s && typeof s === "object" && typeof s.id === "string" && s.id.length <= 32
			&& typeof s.seed === "string" && s.seed.length <= 64 && TIMER_CHOICES.includes(s.timer)
			&& Array.isArray(s.rules) && cleanRules(s.rules).length === s.rules.length
			&& Array.isArray(s.names) && s.names.length === 2 && s.names.every(n => cleanName(n) === n && n)
			&& Array.isArray(s.decks) && s.decks.length === 2;
	},

	// ================= timers & status =================

	startTimer(player, onExpire) {
		const secs = this.start?.timer;
		if (!secs || this.replaying)
			return;
		this.stopTimer(player);
		const t = this.timers[player.tag] = {end: Date.now() + secs * 1000, onExpire: onExpire, expired: false};
		t.elem = document.getElementById("timer-" + player.tag);
		t.elem.classList.remove("hide", "low");
		t.tick = setInterval(() => this.tickTimer(t), 250);
		this.tickTimer(t);
	},

	tickTimer(t) {
		if (t.left !== undefined)
			return;
		const left = Math.max(0, t.end - Date.now());
		t.elem.textContent = Math.ceil(left / 1000);
		t.elem.classList.toggle("low", left <= 10000);
		if (left > 0 || t.expired)
			return;
		t.expired = true;
		if (t.onExpire) {
			t.onExpire();
			// Forced picks may need several clicks
			t.repeat = setInterval(t.onExpire, 500);
		}
	},

	stopTimer(player) {
		const t = this.timers[player.tag];
		if (!t)
			return;
		clearInterval(t.tick);
		clearInterval(t.repeat);
		t.elem.classList.add("hide");
		delete this.timers[player.tag];
	},

	stopAllTimers() {
		for (const tag of Object.keys(this.timers))
			this.stopTimer({tag: tag});
	},

	pauseTimers() {
		for (const t of Object.values(this.timers))
			if (t.left === undefined)
				t.left = t.end - Date.now();
	},

	resumeTimers() {
		for (const t of Object.values(this.timers)) {
			if (t.left === undefined)
				continue;
			t.end = Date.now() + t.left;
			delete t.left;
		}
	},

	showWaiting(player, kind) {
		const elem = document.getElementById("online-wait");
		const text = player && WAIT_TEXT[kind];
		elem.textContent = text ? player.name + " " + text : "";
		elem.classList.toggle("hide", !text);
	},

	// Full-stage cover: "resume" while replaying, "reconnect" while the connection is down
	curtain(mode) {
		const elem = document.getElementById("online-curtain");
		elem.classList.toggle("hide", !mode);
		elem.dataset.mode = mode ?? "";
		if (mode === "resume") {
			document.getElementById("online-curtain-title").textContent = "Resuming match";
			document.getElementById("online-curtain-desc").textContent = "Catching up with " + (this.opponentName || "your opponent") + "…";
		} else if (mode === "reconnect") {
			document.getElementById("online-curtain-title").textContent = "Connection lost";
			this.updateReconnectText();
		}
	},

	updateReconnectText() {
		const left = Math.max(0, Math.ceil((GRACE_MS - (Date.now() - this.dropAt)) / 1000));
		document.getElementById("online-curtain-desc").textContent = "Reconnecting to " + (this.opponentName || "your opponent") + "… " + left + "s";
	},

	// ================= connection =================

	async loadPeerJS() {
		if (window.Peer)
			return;
		await new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "lib/peerjs.min.js";
			script.onload = resolve;
			script.onerror = () => reject(new Error("Couldn't load the networking library. Check your internet connection."));
			document.head.appendChild(script);
		});
	},

	// A TURN relay is what lets players on different networks (mobile data, strict NATs) connect
	async iceConfig() {
		if (this.ice && Date.now() - this.ice.at < 6 * 3600000)
			return this.ice.config;
		const defaults = window.peerjs?.util?.defaultConfig?.iceServers || [];
		try {
			const res = await fetch("api/turn", {cache: "no-store", signal: AbortSignal.timeout(5000)});
			const servers = res.ok ? (await res.json()).iceServers : null;
			if (!Array.isArray(servers))
				return null;
			this.ice = {at: Date.now(), config: {iceServers: [...servers, ...defaults]}};
			return this.ice.config;
		} catch (err) {
			return null;
		}
	},

	async createPeer(id) {
		const config = await this.iceConfig();
		const options = config ? {debug: 1, config: config} : {debug: 1};
		return new Promise((resolve, reject) => {
			const peer = id ? new Peer(id, options) : new Peer(options);
			const onError = err => {
				peer.off("open", onOpen);
				peer.destroy();
				reject(err);
			};
			const onOpen = () => {
				peer.off("error", onError);
				resolve(peer);
			};
			peer.once("open", onOpen);
			peer.once("error", onError);
		});
	},

	setupPeer(peer) {
		this.peer = peer;
		peer.on("connection", conn => {
			if (this.role === "host" && this.peer === peer)
				this.bindConn(conn);
			else
				conn.close();
		});
		// The broker link only matters for new connections; get it back so the opponent can reconnect
		peer.on("disconnected", () => setTimeout(() => this.reconnectBroker(), 1000));
		peer.on("open", () => {
			if (this.peer === peer && this.role === "host" && !this.connected)
				Lobby.status("Waiting for an opponent to join…");
		});
		peer.on("error", err => this.onPeerError(err));
	},

	reconnectBroker() {
		const peer = this.peer;
		if (peer && !peer.destroyed && peer.disconnected && navigator.onLine && document.visibilityState === "visible")
			peer.reconnect();
	},

	peerErrorText(err) {
		switch (err?.type) {
			case "browser-incompatible": return "This browser doesn't support online play.";
			case "peer-unavailable": return "Room not found. Check the code and try again.";
			case "network": case "server-error": case "socket-error": case "socket-closed":
				return "Can't reach the matchmaking server. Check your internet connection.";
			default: return err?.message || "Connection failed.";
		}
	},

	onPeerError(err) {
		// Expected while the opponent is away; the reconnect loop keeps trying
		if (this.dropTimer)
			return;
		// Mobile OSes cut the broker socket when the app is backgrounded (e.g. to share the invite); keep the room
		const transient = ["network", "server-error", "socket-error", "socket-closed", "disconnected"].includes(err?.type);
		if (!this.connected && transient && this.role === "host" && this.peer && !this.peer.destroyed) {
			Lobby.status("Reconnecting to the server…");
			setTimeout(() => this.reconnectBroker(), 2000);
			return;
		}
		if (!this.connected) {
			Lobby.status(this.peerErrorText(err), true);
			Lobby.setBusy(false);
			this.closePeer();
		}
	},

	async host() {
		this.role = "host";
		this.seat = 0;
		this.token = randomId(16);
		await this.loadPeerJS();
		for (let attempt = 0; ; attempt++) {
			this.code = randomId(CODE_LENGTH);
			try {
				this.setupPeer(await this.createPeer(PEER_PREFIX + this.code));
				return;
			} catch (err) {
				if (err?.type !== "unavailable-id" || attempt >= 4)
					throw new Error(this.peerErrorText(err));
			}
		}
	},

	async join(code) {
		this.role = "guest";
		this.seat = 1;
		this.code = code;
		this.token = "";
		await this.loadPeerJS();
		try {
			this.setupPeer(await this.createPeer());
		} catch (err) {
			throw new Error(this.peerErrorText(err));
		}
		this.connectToHost();
		clearTimeout(this.joinTimer);
		this.joinTimer = setTimeout(() => {
			if (this.connected)
				return;
			Lobby.status("Couldn't connect to room " + code + ". Check the code and try again.", true);
			Lobby.setBusy(false);
			this.closePeer();
		}, 15000);
	},

	connectToHost() {
		if (!this.peer || this.peer.destroyed || this.peer.disconnected)
			return;
		if (this.conn && !this.conn.open)
			this.conn.close();
		this.conn = this.peer.connect(PEER_PREFIX + this.code, {reliable: true, serialization: "json"});
		this.bindConn(this.conn);
	},

	bindConn(conn) {
		conn.on("open", () => {
			if (this.role === "guest" && conn === this.conn) {
				this.lastHeard = Date.now();
				this.startHeartbeat();
				if (this.token)
					this.sendResume();
				else
					this.send({t: "hello", v: ONLINE_PROTOCOL, cards: card_dict.length, name: this.name});
			}
		});
		conn.on("data", m => this.onData(conn, m));
		conn.on("close", () => this.onConnClosed(conn));
		conn.on("error", () => this.onConnClosed(conn));
	},

	send(m) {
		if (this.conn?.open)
			this.conn.send(m);
	},

	onConnClosed(conn) {
		if (conn !== this.conn)
			return;
		this.conn = null;
		this.onDrop();
	},

	startHeartbeat() {
		clearInterval(this.beat);
		this.beat = setInterval(() => {
			if (!this.conn?.open)
				return;
			this.send({t: "ping"});
			if (Date.now() - this.lastHeard > SILENCE_MS) {
				const conn = this.conn;
				this.conn = null;
				conn.close();
				this.onDrop();
			}
		}, HEARTBEAT_MS);
	},

	// Host: the first message on a new connection decides whether it is a new guest or a returning one
	onHandshake(conn, m) {
		if (this.role !== "host" || !this.peer || (m.t !== "hello" && m.t !== "resume"))
			return;
		const reject = reason => {
			conn.send({t: "reject", reason: reason});
			setTimeout(() => conn.close(), 500);
		};
		if (m.t === "hello") {
			if (this.guestJoined)
				return reject("full");
			if (m.v !== ONLINE_PROTOCOL || m.cards !== card_dict.length)
				return reject("version");
			const name = cleanName(m.name);
			if (!name)
				return reject("name");
			this.guestJoined = true;
			this.opponentName = name;
			this.adopt(conn);
			this.send({t: "welcome", v: ONLINE_PROTOCOL, name: this.name, token: this.token, timer: this.timerSetting, rules: this.rulesSetting});
			this.onConnected();
		} else if (m.t === "resume") {
			if (!this.token || m.token !== this.token)
				return reject("token");
			this.adopt(conn);
			this.sendResume();
			this.onResume(m);
		}
	},

	adopt(conn) {
		if (this.conn && this.conn !== conn) {
			const old = this.conn;
			this.conn = null;
			old.close();
		}
		this.conn = conn;
		this.lastHeard = Date.now();
		this.startHeartbeat();
	},

	sendResume() {
		this.send({t: "resume", token: this.token, match: this.start?.id ?? null, have: this.log[1 - this.seat].length});
	},

	onConnected() {
		clearTimeout(this.joinTimer);
		this.connected = true;
		this.saveSession();
		Lobby.close();
		AudioManager.playSFX("menu_opening");
		this.enterBuilder();
		ui.announce("Connected to " + this.opponentName);
	},

	onData(conn, m) {
		if (!m || typeof m !== "object" || typeof m.t !== "string" || JSON.stringify(m).length > MAX_MESSAGE)
			return;
		if (conn !== this.conn)
			return this.onHandshake(conn, m);
		this.lastHeard = Date.now();
		switch (m.t) {
			case "ping":
				return;
			case "welcome":
				if (this.role !== "guest" || this.connected)
					return;
				this.opponentName = cleanName(m.name) || "Opponent";
				this.token = String(m.token ?? "").slice(0, 64);
				this.timerSetting = TIMER_CHOICES.includes(m.timer) ? m.timer : 0;
				this.rulesSetting = cleanRules(m.rules);
				this.guestJoined = true;
				return this.onConnected();
			case "reject":
				return this.onRejected(m.reason);
			case "resume":
				return this.onResume(m);
			case "sync":
				return this.onSync(m);
			case "in":
				return this.receiveInput(m);
			case "resend":
				for (let i = Math.max(0, Number(m.from) || 0); i < this.log[this.seat].length; i++)
					this.send({t: "in", n: i, ...this.log[this.seat][i]});
				return;
			case "sum":
				if (!this.start || !Number.isInteger(m.n) || typeof m.h !== "string")
					return;
				this.peerSums[m.n] = m.h;
				return this.compareSum(m.n);
			case "ready":
				if (m.reset)
					this.ready = false;
				this.opponentReady = !!m.deck;
				this.opponentDeck = m.deck ?? null;
				if (this.start)
					return;
				this.updatePanel();
				return this.maybeStart();
			case "start":
				if (this.role !== "guest" || !this.validStart(m.start))
					return;
				return this.beginMatch(m.start);
			case "rematch":
				if (!this.start)
					return;
				this.rematch.op = true;
				if (game.state === GameState.END_SCREEN && !this.rematch.me) {
					game.rematch_elem.textContent = "Accept Rematch";
					ui.announce(this.opponentName + " wants a rematch");
				}
				return this.checkRematch();
			case "newgame":
				if (!this.start)
					return;
				this.opponentInBuilder = true;
				if (game.state === GameState.END_SCREEN)
					this.toBuilder();
				return;
			case "forfeit":
				return this.opponentLeft(this.opponentName + " left the match.");
			case "bye":
				return this.opponentLeft(this.opponentName + " left the room.");
			case "error":
				if (!this.active)
					return;
				return this.abort("Match ended", "The two games went out of sync.");
		}
	},

	onRejected(reason) {
		clearTimeout(this.joinTimer);
		const text = {
			full: "That room already has two players.",
			version: "Your opponent is on a different version of the game. Both players should refresh the page.",
			token: "That match can no longer be resumed.",
			name: "Enter a name first."
		}[reason] ?? "The host refused the connection.";
		if (this.dropTimer)
			return this.abort("Can't reconnect", text);
		Lobby.status(text, true);
		Lobby.setBusy(false);
		this.closePeer();
	},

	receiveInput(m) {
		if (!this.start || !INPUT_KINDS.includes(m.k) || !Number.isInteger(m.n))
			return;
		const seat = 1 - this.seat;
		const log = this.log[seat];
		if (m.n < log.length)
			return;
		if (m.n > log.length)
			return this.send({t: "resend", from: log.length});
		if (log.length >= MAX_LOG)
			return this.fail("Too many moves.");
		const entry = {k: m.k, d: m.d};
		log.push(entry);
		this.pending[seat].push(entry);
		this.pump();
	},

	// Both sides announce what they have; the side that still holds the match brings the other up to date
	onResume(m) {
		this.reconnected();
		const mine = this.start?.id ?? null;
		const theirs = typeof m.match === "string" ? m.match : null;
		if (mine && theirs === mine) {
			for (let i = Math.max(0, Number(m.have) || 0); i < this.log[this.seat].length; i++)
				this.send({t: "in", n: i, ...this.log[this.seat][i]});
		} else if (mine && !theirs) {
			this.send({t: "sync", start: this.start, log: this.log});
		} else if (!mine && !theirs) {
			if (document.getElementById("deck-customization").classList.contains("hide"))
				this.enterBuilder();
			else if (this.ready)
				this.send({t: "ready", deck: this.myDeck});
		}
	},

	onSync(m) {
		if (this.start || !this.validStart(m.start) || !Array.isArray(m.log) || m.log.length !== 2)
			return;
		const entries = m.log.map(l => Array.isArray(l) ? l.filter(e => e && INPUT_KINDS.includes(e.k)).map(e => ({k: e.k, d: e.d})) : null);
		if (entries.includes(null) || entries.some(l => l.length > MAX_LOG))
			return;
		this.beginMatch(m.start, entries);
	},

	// The data channel closed or went silent: keep the room for the grace period and try to reconnect
	onDrop() {
		if (this.dropTimer || !this.connected)
			return;
		this.dropAt = Date.now();
		this.pauseTimers();
		if (!this.replaying)
			this.curtain("reconnect");
		let ticks = 0;
		this.dropTimer = setInterval(() => this.reconnectTick(ticks++), 1000);
		this.reconnectTick(ticks++);
	},

	reconnectTick(tick) {
		if (Date.now() - this.dropAt >= GRACE_MS)
			return this.giveUp();
		if (!this.replaying)
			this.updateReconnectText();
		const peer = this.peer;
		if (!peer || peer.destroyed)
			return;
		if (peer.disconnected)
			peer.reconnect();
		else if (this.role === "guest" && tick % 3 === 0)
			this.connectToHost();
	},

	reconnected() {
		clearInterval(this.dropTimer);
		this.dropTimer = null;
		this.resumeTimers();
		if (!this.replaying)
			this.curtain(null);
	},

	giveUp() {
		clearInterval(this.dropTimer);
		this.dropTimer = null;
		this.curtain(null);
		this.resumeTimers();
		if (!navigator.onLine || !this.peer || this.peer.disconnected)
			return this.abort("Connection lost", "Couldn't reconnect to " + this.opponentName + ". The match has ended.");
		this.opponentLeft(this.opponentName + " disconnected.");
	},

	// Closes the link to the opponent but keeps this device's view (e.g. the end screen)
	dropConnection() {
		this.connected = false;
		clearInterval(this.dropTimer);
		this.dropTimer = null;
		this.curtain(null);
		this.stopAllTimers();
		this.showWaiting(null);
		this.waiter = null;
		this.closePeer();
		sessionStorage.removeItem(SESSION_KEY);
		if (!document.getElementById("deck-customization").classList.contains("hide"))
			this.updatePanel();
	},

	closePeer() {
		clearTimeout(this.joinTimer);
		clearInterval(this.beat);
		const conn = this.conn, peer = this.peer;
		this.conn = null;
		this.peer = null;
		// Give a parting message time to go out
		setTimeout(() => {
			conn?.close();
			peer?.destroy();
		}, 300);
	},

	// Leaves the room and resets everything online
	leave() {
		if (!this.peer && !this.active && !this.connected && !document.body.classList.contains("online"))
			return;
		this.send({t: "bye"});
		this.dropConnection();
		this.active = false;
		this.setReplaying(false);
		this.start = null;
		this.turnOpen = false;
		this.role = null;
		this.code = this.token = this.opponentName = "";
		this.guestJoined = false;
		this.ready = this.opponentReady = false;
		this.log = [[], []];
		this.pending = [[], []];
		this.replayLeft = 0;
		this.rng = Math.random;
		this.rulesSetting = [];
		DeckMaker.onlineRules = [];
		document.body.classList.remove("online");
		dm.updateStats();
		document.getElementById("start-game").textContent = "Start game";
		document.getElementById("start-game").classList.remove("waiting");
		game.rematch_elem.textContent = "Rematch";
	},

	// After a page reload: rejoin the room saved for this tab
	async resumeSession() {
		let s;
		try {
			s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
		} catch (e) {}
		sessionStorage.removeItem(SESSION_KEY);
		if (!s || Date.now() - s.at > 10 * 60000 || !["host", "guest"].includes(s.role) || typeof s.code !== "string" || !s.token)
			return;
		this.role = s.role;
		this.seat = s.role === "host" ? 0 : 1;
		this.code = s.code;
		this.token = s.token;
		this.name = cleanName(s.name);
		this.opponentName = cleanName(s.opponent);
		this.timerSetting = TIMER_CHOICES.includes(s.timer) ? s.timer : 0;
		this.rulesSetting = cleanRules(s.rules);
		this.guestJoined = true;
		this.connected = true;
		this.saveSession();
		this.onDrop();
		try {
			await this.loadPeerJS();
			if (this.role === "guest") {
				this.setupPeer(await this.createPeer());
				this.connectToHost();
				return;
			}
			// The broker may still hold the room id from before the reload
			while (this.connected && !this.peer) {
				try {
					this.setupPeer(await this.createPeer(PEER_PREFIX + this.code));
				} catch (err) {
					if (err?.type !== "unavailable-id")
						throw err;
					await new Promise(r => setTimeout(r, 2000));
				}
			}
		} catch (err) {
			this.abort("Can't reconnect", this.peerErrorText(err));
		}
	}
};

// ================= lobby screen =================

const Lobby = {
	elem: document.getElementById("lobby"),
	nameInput: document.getElementById("lobby-name"),
	codeInput: document.getElementById("lobby-code"),
	timerButtons: [...document.querySelectorAll("#lobby-timer > button")],
	ruleButtons: [],

	// One toggle per deck rule, built from DeckMaker.RULES
	initRules() {
		const box = document.getElementById("lobby-rules");
		this.ruleButtons = Object.entries(DeckMaker.RULES).map(([id, rule]) => {
			const b = document.createElement("button");
			b.dataset.rule = id;
			b.textContent = rule.label;
			b.title = rule.desc;
			b.addEventListener("click", () => this.toggleRule(id));
			box.appendChild(b);
			return b;
		});
	},

	savedRules() {
		return cleanRules(Settings.onlineRules.get().split(","));
	},

	showRules() {
		const rules = this.savedRules();
		this.ruleButtons.forEach(b => b.setAttribute("aria-pressed", rules.includes(b.dataset.rule)));
	},

	toggleRule(id) {
		AudioManager.playSFX("ui_card_bank");
		const rules = this.savedRules();
		Settings.onlineRules.set(cleanRules(rules.includes(id) ? rules.filter(r => r !== id) : [...rules, id]).join(","));
		this.showRules();
	},

	open(code = "") {
		document.activeElement?.blur();
		this.elem.classList.remove("hide");
		document.getElementById("lobby-choose").classList.remove("hide");
		document.getElementById("lobby-room").classList.add("hide");
		this.nameInput.value = Settings.onlineName.get();
		this.codeInput.value = code;
		this.setTimer(Settings.onlineTimer.get(), true);
		this.showRules();
		this.status("");
		this.setBusy(false);
		(!this.nameInput.value ? this.nameInput : code ? document.getElementById("lobby-join") : document.getElementById("lobby-host")).focus();
	},

	close() {
		this.elem.classList.add("hide");
	},

	cancel() {
		Online.leave();
		this.close();
		document.getElementById("title-online").focus();
	},

	status(text, error = false) {
		const elem = document.getElementById("lobby-status");
		elem.textContent = text;
		elem.classList.toggle("error", error);
	},

	setBusy(busy) {
		["lobby-host", "lobby-join"].forEach(id => document.getElementById(id).disabled = busy);
	},

	setTimer(value, silent = false) {
		const secs = TIMER_CHOICES.includes(Number(value)) ? Number(value) : 60;
		if (!silent)
			AudioManager.playSFX("ui_card_bank");
		Settings.onlineTimer.set(String(secs));
		DeckMaker.checkRadio(this.timerButtons, b => Number(b.dataset.timer) === secs);
	},

	readName() {
		const name = cleanName(this.nameInput.value);
		if (!name) {
			this.status("Enter a name first.", true);
			this.nameInput.focus();
			return null;
		}
		this.nameInput.value = name;
		Settings.onlineName.set(name);
		Online.name = name;
		return name;
	},

	async host() {
		if (!this.readName())
			return;
		this.setBusy(true);
		this.status("Creating room…");
		Online.timerSetting = Number(Settings.onlineTimer.get());
		Online.rulesSetting = this.savedRules();
		try {
			await Online.host();
		} catch (err) {
			this.status(err.message, true);
			this.setBusy(false);
			Online.leave();
			return;
		}
		document.getElementById("lobby-choose").classList.add("hide");
		document.getElementById("lobby-room").classList.remove("hide");
		document.getElementById("lobby-room-code").textContent = Online.code;
		this.status("Waiting for an opponent to join…");
		document.getElementById("lobby-copy-link").focus();
	},

	async join() {
		if (!this.readName())
			return;
		const code = this.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
		this.codeInput.value = code;
		if (code.length !== CODE_LENGTH || [...code].some(c => !CODE_CHARS.includes(c))) {
			this.status("Enter the " + CODE_LENGTH + "-character room code.", true);
			this.codeInput.focus();
			return;
		}
		this.setBusy(true);
		this.status("Connecting to room " + code + "…");
		try {
			await Online.join(code);
		} catch (err) {
			this.status(err.message, true);
			this.setBusy(false);
			Online.leave();
		}
	},

	async share() {
		const url = location.origin + location.pathname + "?room=" + Online.code;
		if (!navigator.share)
			return this.copy(url, "Invite link");
		try {
			await navigator.share({title: "Gwent", text: "Join my Gwent match! Room code: " + Online.code, url: url});
		} catch (err) {
			if (err?.name !== "AbortError")
				this.copy(url, "Invite link");
		}
	},

	async copy(text, what) {
		try {
			await navigator.clipboard.writeText(text);
			this.status(what + " copied. Waiting for an opponent to join…");
		} catch (err) {
			this.status("Copy failed. " + what + ": " + text, true);
		}
	}
};

document.getElementById("title-online").addEventListener("click", () => {
	AudioManager.playSFX("menu_opening");
	Lobby.open();
});
document.getElementById("lobby-host").addEventListener("click", () => Lobby.host());
document.getElementById("lobby-join").addEventListener("click", () => Lobby.join());
document.getElementById("lobby-cancel").addEventListener("click", () => Lobby.cancel());
document.getElementById("lobby-copy-code").addEventListener("click", () => Lobby.copy(Online.code, "Room code"));
document.getElementById("lobby-copy-link").addEventListener("click", () => Lobby.share());
DeckMaker.bindRadioGroup(Lobby.timerButtons, b => Lobby.setTimer(b.dataset.timer));
Lobby.codeInput.addEventListener("input", () => Lobby.codeInput.value = Lobby.codeInput.value.toUpperCase());
Lobby.codeInput.addEventListener("keydown", e => e.key === "Enter" && Lobby.join());
Lobby.nameInput.addEventListener("keydown", e => e.key === "Enter" && (Lobby.codeInput.value ? Lobby.join() : Lobby.host()));
Lobby.elem.addEventListener("keydown", e => {
	if (e.key === "Escape" && !Popup.curr) {
		e.preventDefault();
		Lobby.cancel();
	}
});
Lobby.initRules();
addMouseEnterSFXBySelector("#lobby button");
document.getElementById("online-curtain-leave").addEventListener("click", () => Online.forfeit());

// A backgrounded tab may have missed heartbeats; check in as soon as it is visible again
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible" && Online.conn?.open)
		Online.send({t: "ping"});
	Online.reconnectBroker();
});
window.addEventListener("online", () => Online.reconnectBroker());

{
	const room = new URLSearchParams(location.search).get("room");
	if (room) {
		history.replaceState(null, "", location.pathname);
		Lobby.open(room.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH));
	} else {
		Online.resumeSession();
	}
}
