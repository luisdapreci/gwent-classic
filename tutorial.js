"use strict"

// The first story match doubles as a tutorial: the Innkeeper's tips, a seeded opening hand and two scripted plays
const StoryTutorial = {
	OPPONENT: "innkeeper",
	elem: document.getElementById("tutorial"),
	box: document.getElementById("tutorial-box"),
	rings: [],
	targets: [],
	done: null,
	raf: null,
	shownAt: 0,

	get state() {
		const tut = game.story?.tutorial;
		return tut?.active ? tut : null;
	},

	wanted(story) {
		return story.id === this.OPPONENT && !story.tournament && !StoryMode.data.tutorialDone;
	},

	newState() {
		return {active: true, seeded: [], forced: [], played: 0, lock: null, seen: new Set(), queue: [], turns: 0};
	},

	init() {
		const next = () => {
			if (!this.done)
				return;
			AudioManager.playSFX("ui_card");
			this.done();
		};
		document.getElementById("tutorial-next").addEventListener("click", next);
		document.getElementById("tutorial-skip").addEventListener("click", () => this.stop());
		this.elem.addEventListener("click", e => {
			if (e.target === this.elem && this.elem.classList.contains("blocking") && performance.now() - this.shownAt > 400)
				next();
		});
		EventManager.roundPassed.bind(e => {
			if (this.state && e.detail.player === player_op && !player_me.passed)
				this.state.queue.push("opPassed");
		});
		EventManager.gameStateChanged.bind(e => {
			if (e.detail.newState !== GameState.PLAYING)
				this.close();
		});
		EventManager.customizationOpened.bind(() => this.close());
		window.addEventListener("resize", () => this.placeRings());
	},

	// Called from StoryMode.applyModifiers, before the leaders and factions register their effects
	install() {
		game.gameStart.push(async () => {
			await this.gameStart();
			return true;
		});
		game.roundStart.push(async () => {
			await this.roundStart();
			return false;
		});
		game.turnStart.push(async () => {
			await this.turnStart();
			return false;
		});
		game.turnEnd.push(async () => {
			await this.turnEnd();
			return false;
		});
	},

	// ---------- match flow ----------

	async gameStart() {
		const tut = this.state;
		if (!tut)
			return;
		this.seed(tut);
		if (!await this.say("welcome") || !await this.say("goal", ["#stats-me"]))
			return;
		game.firstPlayer = player_me;
		await ui.playerNotification("first", player_me, 1200);
	},

	// Puts the scripted bond pair, a Morale Boost unit and a weather card on top of the deck, so they're in the opening hand
	seed(tut) {
		const deck = player_me.deck.cards;
		const units = deck.filter(c => c.isUnit());
		const bonds = units.filter(c => c.abilities.includes("bond"));
		const pairs = bonds.map(c => bonds.filter(o => o.name === c.name)).filter(g => g.length >= 2)
			.sort((a, b) => b[0].basePower - a[0].basePower);
		tut.forced = pairs.length ? pairs[0].slice(0, 2) : [...units].sort((a, b) => b.basePower - a.basePower).slice(0, 1);
		const morale = units.find(c => c.abilities.includes("morale") && !tut.forced.includes(c));
		const weathers = deck.filter(c => c.faction === "weather");
		// Foltest's leader ability fetches Impenetrable Fog from the deck
		const sky = weathers.find(c => c.abilities.includes("frost")) ?? weathers.find(c => c.name !== "Impenetrable Fog");
		tut.seeded = [...tut.forced, morale, sky].filter(Boolean);
		for (const c of [...tut.seeded].reverse())
			deck.unshift(...deck.splice(deck.indexOf(c), 1));
	},

	async beforeRedraw() {
		await this.say("hand", ["#hand-row"]) && await this.say("redraw");
	},

	canRedraw(card) {
		return !this.state?.seeded.includes(card);
	},

	async roundStart() {
		const tut = this.state;
		if (!tut || game.roundCount === 1)
			return;
		tut.queue = [];
		if (game.roundCount === 3)
			return void await this.say("round3");
		const winner = game.roundHistory[0]?.winner;
		const id = winner === player_me ? "round2Won" : winner ? "round2Lost" : "round2Draw";
		if (await this.say(id, ["#stats-me"]) && winner === player_me && player_me.deck.faction === "realms")
			await this.say("realms", ["#hand-row"]);
	},

	async turnStart() {
		const tut = this.state;
		if (!tut || game.currPlayer !== player_me)
			return;
		tut.turns++;
		if (tut.turns === 1 && !await this.say("rows", ["#field-me"]))
			return;
		tut.forced = tut.forced.filter(c => player_me.hand.cards.includes(c));
		if (tut.forced.length)
			return this.lockTo(tut.forced[0]);
		await this.hint(tut);
	},

	// At most one situational tip per turn
	async hint(tut) {
		let id = tut.queue.shift();
		if (!id && tut.turns >= 3 && !tut.seen.has("leader") && player_me.canActivateLeader())
			id = "leader";
		if (!id && tut.turns >= 4 && !tut.seen.has("passHint") && game.roundCount === 1 && !player_op.passed && player_me.total > player_op.total)
			id = "passHint";
		if (id)
			await this.say(id, {leader: ["#leader-me"], passHint: ["#pass-button"]}[id]);
	},

	async turnEnd() {
		const tut = this.state;
		if (!tut)
			return;
		if (game.currPlayer === player_op) {
			if (weather.cards.some(c => c.holder === player_op))
				await this.say("weatherOp", ["#weather"]);
			return;
		}
		const card = tut.lock;
		if (!card || player_me.hand.cards.includes(card))
			return;
		this.unlock();
		tut.forced.shift();
		tut.played++;
		if (tut.played === 1 && !await this.say("score", ["#score-total-me", ...this.rowElems(card).map(r => r.querySelector(".row-score"))]))
			return;
		if (tut.played === 2 && !await this.say("bond", this.rowElems(card)))
			return;
		if (!tut.forced.length)
			await this.say("free");
	},

	// ---------- scripted plays ----------

	lockTo(card) {
		const tut = this.state;
		tut.lock = card;
		document.body.classList.add("tutorial-lock");
		card.elem.classList.add("tutorial-target");
		this.prompt(this.line(tut.played ? "play2" : "play1", {card: card.name}), [card.elem]);
	},

	unlock() {
		const tut = game.story?.tutorial;
		if (tut)
			tut.lock = null;
		document.body.classList.remove("tutorial-lock");
		document.querySelectorAll(".tutorial-target").forEach(e => e.classList.remove("tutorial-target"));
	},

	locked() {
		return !!this.state?.lock;
	},

	// True (with a nudge) while a scripted play blocks other actions
	blocks() {
		if (!this.locked())
			return false;
		this.nudge();
		return true;
	},

	allows(card) {
		const lock = this.state?.lock;
		if (!lock || card === lock || !player_me.hand.cards.includes(card))
			return true;
		this.nudge();
		return false;
	},

	onPreview(card) {
		const tut = this.state;
		if (!tut || card.holder !== player_me || !player_me.hand.cards.includes(card) || this.elem.classList.contains("blocking"))
			return;
		if (tut.lock === card)
			return this.prompt(this.line("playRow"), this.rowElems(card));
		const id = card.faction === "weather" ? "weather" : card.abilities.includes("morale") ? "morale" : null;
		if (id && !tut.lock)
			this.prompt(this.line(id), []);
		else if (!tut.lock)
			this.hide();
	},

	onPreviewEnd() {
		const tut = this.state;
		if (!tut || !this.elem.classList.contains("prompting"))
			return;
		// selectRow hides the preview before disabling the board: wait to tell a played card from a cancelled one
		setTimeout(() => {
			if (this.state !== tut || !this.elem.classList.contains("prompting"))
				return;
			if (tut.lock && ui.isInteractive() && player_me.hand.cards.includes(tut.lock))
				this.lockTo(tut.lock);
			else
				this.hide();
		}, 0);
	},

	rowElems(card) {
		return ui.legalRows(card).map(r => r.elem_parent).filter(Boolean);
	},

	// ---------- coach box ----------

	line(id, vars) {
		return StoryMode.text(campaign.tutorial[id]).replace(/\{(\w+)\}/g, (m, k) => vars?.[k] ?? m);
	},

	// A tip the player dismisses; resolves false if the tutorial was skipped or the match left meanwhile
	say(id, targets = [], vars) {
		const tut = this.state;
		if (!tut)
			return Promise.resolve(false);
		if (tut.seen.has(id))
			return Promise.resolve(true);
		tut.seen.add(id);
		this.done?.();
		const session = game.session;
		return new Promise(resolve => {
			this.done = () => {
				this.done = null;
				this.hide();
				resolve(session === game.session && !!this.state);
			};
			this.show(this.line(id, vars), targets, true);
		});
	},

	// An instruction that leaves the board playable
	prompt(text, targets) {
		this.show(text, targets, false);
	},

	show(text, targets, blocking) {
		const opp = game.story.opp;
		const portrait = document.getElementById("tutorial-portrait");
		for (const [p, v] of Object.entries(StoryMode.portraitStyle(opp)))
			portrait.style.setProperty(p, v);
		document.getElementById("tutorial-name").textContent = t(opp.name);
		const textElem = document.getElementById("tutorial-text");
		const changed = textElem.textContent !== text || this.elem.classList.contains("hide");
		textElem.textContent = text;
		this.elem.classList.toggle("blocking", blocking);
		this.elem.classList.toggle("prompting", !blocking);
		this.box.setAttribute("role", blocking ? "dialog" : "status");
		this.elem.classList.remove("hide");
		this.setRings(targets);
		this.shownAt = performance.now();
		if (changed) {
			this.box.style.animation = "none";
			void this.box.offsetWidth;
			this.box.style.animation = "";
			ui.announce(t(opp.name) + ": " + text);
		}
		if (blocking)
			document.getElementById("tutorial-next").focus();
	},

	hide() {
		this.elem.classList.add("hide");
		this.elem.classList.remove("blocking", "prompting");
		this.setRings([]);
	},

	nudge() {
		this.box.classList.remove("nudge");
		void this.box.offsetWidth;
		this.box.classList.add("nudge");
	},

	setRings(targets) {
		this.targets = targets.map(x => typeof x === "string" ? document.querySelector(x) : x).filter(Boolean);
		while (this.rings.length < this.targets.length) {
			const ring = document.createElement("div");
			ring.className = "tutorial-ring";
			this.elem.appendChild(ring);
			this.rings.push(ring);
		}
		this.rings.forEach((r, i) => r.classList.toggle("hide", i >= this.targets.length));
		this.placeRings();
		// Hand cards slide around as cards are drawn and played
		if (this.targets.length && !this.raf) {
			const follow = () => {
				this.placeRings();
				this.raf = this.targets.length ? requestAnimationFrame(follow) : null;
			};
			this.raf = requestAnimationFrame(follow);
		}
	},

	placeRings() {
		this.targets.forEach((el, i) => {
			const r = el.getBoundingClientRect();
			const s = this.rings[i].style;
			s.left = r.left - 4 + "px";
			s.top = r.top - 4 + "px";
			s.width = r.width + 8 + "px";
			s.height = r.height + 8 + "px";
		});
	},

	// ---------- ending ----------

	// Skip: the match goes on without tips or restrictions
	stop() {
		const tut = game.story?.tutorial;
		if (tut)
			tut.active = false;
		this.close();
	},

	close() {
		this.unlock();
		this.hide();
		this.done?.();
	}
};

StoryTutorial.init();
