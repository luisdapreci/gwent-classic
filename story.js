"use strict"

// Story mode: persistent collection, campaign progression, matches against campaign opponents and their rewards
const StoryMode = {
	VERSION: 1,
	FACTIONS: ["realms", "nilfgaard", "monsters", "scoiatael", "skellige"],
	PRICES: {common: 20, ability: 60, hero: 250, leader: 800},
	STAR_BONUS: 0.25,
	// Fourth star, hidden until the three regular ones are earned
	SECRET_OBJECTIVE: "noHeroes",
	RANDOM_SLOTS: 3,
	SHOP_SIZE: 8,
	SHOP_REFRESH: 3,
	save: new SavedObject("gc-story", {}),

	get data() {
		return this.save.get();
	},

	commit() {
		this.save.set(this.data);
	},

	// Picks the current language from a campaign {en, es} text
	text(obj) {
		return obj ? Lang.current === "es" ? obj.es : obj.en : "";
	},

	// Loads the save, starting a new one if there is none; an invalid save is backed up before being replaced
	init() {
		const raw = this.save.get();
		if (!raw || !raw.version)
			return this.save.set(this.newSave());
		const clean = this.sanitize(raw);
		if (clean)
			return this.save.set(clean);
		console.warn("Story save is invalid; a backup was kept in gc-story-backup");
		localStorage?.setItem("gc-story-backup", JSON.stringify(raw));
		this.save.set(this.newSave());
	},

	newSave() {
		const save = {
			version: this.VERSION, crowns: 0, collection: {}, decks: {}, activeFaction: "realms", unlockedFactions: [],
			progress: {}, pending: [], matches: 0, last: null, shop: null, tournament: null, seenChapters: [], master: false,
			stats: {wins: 0, losses: 0, streak: 0, bestStreak: 0, crownsEarned: 0, tournamentsWon: 0}
		};
		this.unlockFaction("realms", save);
		return save;
	},

	async reset() {
		if (!await ui.confirm(t("Reset story progress?"), t("Your collection, crowns and campaign progress will be lost."), t("Reset"), t("Cancel")))
			return false;
		this.save.set(this.newSave());
		return true;
	},

	// ---------- collection ----------

	owned(index, save = this.data) {
		return save.collection[index] ?? 0;
	},

	maxCopies(index) {
		return Number(card_dict[index]?.count) || (card_dict[index]?.row === "leader" ? 1 : 0);
	},

	// Adds copies up to the card's max; copies beyond it are paid out at half their shop price
	addCard(index, n = 1, save = this.data) {
		const room = Math.max(0, this.maxCopies(index) - this.owned(index, save));
		const added = Math.min(room, n);
		if (added)
			save.collection[index] = this.owned(index, save) + added;
		const crowns = (n - added) * Math.round(this.price(index) / 2);
		save.crowns += crowns;
		return {index, added, crowns};
	},

	removeCard(index, n = 1) {
		const left = this.owned(index) - n;
		if (left > 0)
			this.data.collection[index] = left;
		else
			delete this.data.collection[index];
		for (const deck of Object.values(this.data.decks))
			deck.cards = deck.cards.map(([i, c]) => [i, i === index ? Math.min(c, Math.max(left, 0)) : c]).filter(([, c]) => c > 0);
	},

	rarity(card) {
		if (card.row === "leader")
			return "leader";
		const abilities = card.ability.split(" ").filter(Boolean);
		if (abilities.includes("hero"))
			return "hero";
		return abilities.length || card.row === "agile" ? "ability" : "common";
	},

	price(index) {
		return this.PRICES[this.rarity(card_dict[index])];
	},

	isUnlocked(faction, save = this.data) {
		return save.unlockedFactions.includes(faction);
	},

	// Grants a faction's starter cards and leader and makes the starter its deck
	unlockFaction(faction, save = this.data) {
		if (this.isUnlocked(faction, save))
			return false;
		save.unlockedFactions.push(faction);
		const starter = campaign.starters[faction];
		this.addCard(starter.leader, 1, save);
		for (const [index, n] of starter.cards)
			this.addCard(index, n, save);
		save.decks[faction] = {leader: starter.leader, cards: starter.cards.map(c => [...c])};
		return true;
	},

	// The deck builder's view of story decks (same interface as Settings' SavedDeck)
	deckStore: {
		lastFaction: {
			get: () => StoryMode.data.activeFaction,
			set: faction => {
				StoryMode.data.activeFaction = faction;
				StoryMode.commit();
			}
		},
		deck: faction => ({
			get: () => {
				const deck = StoryMode.data.decks[faction];
				return {leader: deck.leader, cards: deck.cards.map(([index, count]) => ({index, count: Math.min(count, StoryMode.owned(index))}))};
			},
			setCards: cards => {
				StoryMode.data.decks[faction].cards = cards.map(c => [c.index, c.count]);
				StoryMode.commit();
			},
			setLeader: leader => {
				StoryMode.data.decks[faction].leader = leader.index;
				StoryMode.commit();
			}
		})
	},

	// The active story deck in the engine's format, or null if it breaks the deck rules
	playerDeck() {
		const faction = this.data.activeFaction;
		const deck = this.deckStore.deck(faction).get();
		const cards = deck.cards.filter(c => c.count > 0);
		const {units, special} = DeckMaker.countCards(cards);
		const warning = DeckMaker.ruleWarnings(units, special);
		return {deck: {faction, leader: card_dict[deck.leader], cards}, warning};
	},

	// ---------- campaign progress ----------

	opponent(id) {
		return campaign.opponents[id];
	},

	chapter(id) {
		return campaign.chapters.find(c => c.id === id);
	},

	progressOf(id) {
		return this.data.progress[id] ??= {wins: 0, losses: 0, stars: [false, false, false, false], seen: false};
	},

	secretRevealed(id) {
		return this.progressOf(id).stars.slice(0, 3).every(Boolean);
	},

	// The stars shown for an opponent: the secret one only once revealed
	visibleStars(id) {
		const stars = this.progressOf(id).stars;
		return this.secretRevealed(id) ? stars : stars.slice(0, 3);
	},

	beaten(id) {
		return (this.data.progress[id]?.wins ?? 0) > 0;
	},

	// Every campaign opponent (side and secret ones too) beaten with all four stars
	allStars() {
		return Object.keys(campaign.opponents).every(id => this.data.progress[id]?.stars.every(Boolean));
	},

	// The Gwent Master title, kept once earned even if new opponents are added later
	isMaster() {
		return this.data.master === true;
	},

	// Grants the title and every card still missing; the number of cards added, or null if not earned now
	awardMaster() {
		if (this.isMaster() || !this.allStars())
			return null;
		let added = 0;
		card_dict.forEach((c, i) => added += this.addCard(i, this.maxCopies(i) - this.owned(i)).added);
		this.data.master = true;
		this.commit();
		return added;
	},

	chapterOpponents(chapterId) {
		return Object.keys(campaign.opponents).filter(id => campaign.opponents[id].chapter === chapterId);
	},

	// Secret opponents stay off the map and journal until they can be challenged
	isHidden(id) {
		return !!this.opponent(id).hidden && !this.isAvailable(id) && !this.beaten(id);
	},

	chapterBoss(chapterId) {
		return this.chapterOpponents(chapterId).find(id => campaign.opponents[id].boss);
	},

	isChapterOpen(chapterId) {
		const i = campaign.chapters.findIndex(c => c.id === chapterId);
		const after = campaign.chapters[i]?.opensAfter;
		if (after)
			return this.beaten(after);
		return i === 0 || i > 0 && this.beaten(this.chapterBoss(campaign.chapters[i - 1].id));
	},

	// Non-boss opponents whose wins count toward bossAfter (side battles don't)
	bossCounted(chapterId) {
		return this.chapterOpponents(chapterId).filter(id => !campaign.opponents[id].boss && !campaign.opponents[id].side);
	},

	// The boss opens after the chapter's required opponents and bossAfter optional wins
	isBossReady(chapterId) {
		const chapter = this.chapter(chapterId);
		return (chapter.required ?? []).every(id => this.beaten(id)) && this.bossCounted(chapterId).filter(id => this.beaten(id)).length >= chapter.bossAfter;
	},

	isAvailable(id) {
		const opp = this.opponent(id);
		return !!opp && this.isChapterOpen(opp.chapter) && (!opp.boss || this.isBossReady(opp.chapter))
			&& (!opp.requires || this.beaten(opp.requires));
	},

	winCrowns(id) {
		return this.chapter(this.opponent(id).chapter).winCrowns;
	},

	// Crowns for the next win against an opponent (first win, boss bonus, or rematch)
	nextWinCrowns(id) {
		const base = this.winCrowns(id);
		return this.beaten(id) ? Math.round(base / 2) : base * (this.opponent(id).boss ? 2 : 1);
	},

	// Why an opponent can't be challenged yet, or ""
	lockReason(id) {
		const opp = this.opponent(id);
		if (!this.isChapterOpen(opp.chapter))
			return t("Locked");
		if (opp.requires && !this.beaten(opp.requires))
			return t("Defeat {name} first.", {name: t(this.opponent(opp.requires).name)});
		if (opp.boss && !this.isBossReady(opp.chapter)) {
			const chapter = this.chapter(opp.chapter);
			const required = (chapter.required ?? []).filter(r => !this.beaten(r));
			if (required.length)
				return t("Defeat {name} first.", {name: t(this.opponent(required[0]).name)});
			const left = chapter.bossAfter - this.bossCounted(opp.chapter).filter(o => this.beaten(o)).length;
			return left === 1
				? t("Defeat one more opponent in {chapter} first.", {chapter: t(chapter.name)})
				: t("Defeat {n} more opponents in {chapter} first.", {n: left, chapter: t(chapter.name)});
		}
		return "";
	},

	// Map locations: opponents sharing a place get one pin; only open chapters (and secrets once available) are shown
	places() {
		const places = new Map();
		for (const [id, opp] of Object.entries(campaign.opponents)) {
			if (!this.isChapterOpen(opp.chapter) || this.isHidden(id))
				continue;
			const key = opp.place ?? id;
			const place = campaign.places?.[opp.place];
			if (!places.has(key))
				places.set(key, {key, name: place?.name ?? opp.name, x: place?.x ?? opp.pin.x, y: place?.y ?? opp.pin.y, chapter: opp.chapter, ids: []});
			places.get(key).ids.push(id);
		}
		return [...places.values()];
	},

	placeOf(id) {
		return this.places().find(p => p.ids.includes(id));
	},

	// CSS url() for an image path under img/; absolute because custom properties resolve against the stylesheet
	artURL(path) {
		return "url('" + new URL("img/" + path, document.baseURI).href + "')";
	},

	cardImage(index) {
		const c = card_dict[index];
		return "img/lg/" + c.deck + "_" + c.filename + ".jpg";
	},

	// portrait: an lg/ card image name, or a path under img/ (e.g. "icons/x.png"); none = faction shield
	portraitArt(opp) {
		const p = opp.portrait;
		return this.artURL(!p ? "icons/deck_shield_" + opp.deck.faction + ".png" : p.includes("/") ? p : "lg/" + p + ".jpg");
	},

	// Custom properties for a round portrait: art plus its framing from portrait-frames.js (keyed by lg/ image name)
	frameStyle(name, art) {
		const f = name && portraitFrames[name];
		return f ? {"--art": art, "--art-x": f[0] + "%", "--art-y": f[1] + "%", "--art-zoom": f[2] + "%"} : {"--art": art};
	},

	portraitStyle(opp) {
		return this.frameStyle(opp.portrait, this.portraitArt(opp));
	},

	// Framed portrait in a board profile circle ("me"/"op"); no style = the default silhouette
	boardPortrait(tag, style) {
		const el = document.querySelector("#stats-" + tag + " .profile-img");
		for (const p of ["--art", "--art-x", "--art-y", "--art-zoom"])
			el.style.removeProperty(p);
		for (const [p, v] of Object.entries(style || {}))
			el.style.setProperty(p, v);
		el.classList.toggle("story-art", !!style);
	},

	// A modifier's rule, prefixed by its flavor name (e.g. "Partisans: Your opponent goes first.")
	modifierText(m) {
		const name = this.modifierName(m);
		const rule = this.modifierRule(m);
		return name ? t(name) + ": " + rule : rule;
	},

	modifierName(m) {
		return m.name ?? {ambush: "Ambush", terms: "Terms", frostborn: "Children of the Frost", whiteFrost: "White Frost"}[m.id];
	},

	modifierRule(m) {
		switch (m.id) {
		case "weather":
			return m.rounds.length >= 3
				? t("{card} at the start of every round.", {card: card_dict[m.card].name})
				: t("{card} at the start of round {rounds}.", {card: card_dict[m.card].name, rounds: m.rounds.join(", ")});
		case "ambush": return t("Your opponent goes first.");
		case "frostborn": return t("Your opponent's close combat row ignores Biting Frost.");
		case "extraDraw": return m.side === "both" ? t("Both players draw an extra card when round 1 starts.") : t("You draw an extra card when round 1 starts.");
		case "informants": return t("You discard a random card when round 1 starts.");
		case "leaderBlocked": return t("Your leader is blocked for the whole match.");
		case "whiteFrost": return t("Weather halves the strength of your heroes.");
		case "heroTaken": return t("One random hero is taken from your deck for this match.");
		case "heroLimit": return t("You can play only one hero per round.");
		case "scorchHeroes": return t("Scorch can destroy your heroes.");
		case "heroDebt": return t("Each hero you play makes you discard a random card.");
		case "heroFeeds": return m.row === "close"
			? t("Each hero you play gives your opponent's close combat units +1 for the round.")
			: t("Each hero you play gives all your opponent's units +1 for the round.");
		case "terms": return t(DeckMaker.RULES[m.rule].desc);
		}
		return "";
	},

	// ---------- shop ----------

	// Cards from unlocked factions and neutrals, never fixed rewards or leaders, weighted toward commons
	shopCandidates() {
		const fixed = this.fixedRewards();
		const pool = card_dict.map((c, i) => i).filter(i => {
			const c = card_dict[i];
			return c.row !== "leader" && [...this.data.unlockedFactions, "neutral", "special", "weather"].includes(c.deck)
				&& !fixed.has(i) && this.owned(i) < this.maxCopies(i);
		});
		const weights = {common: 6, ability: 4, hero: 1};
		return this.weightedPick(pool, i => weights[this.rarity(card_dict[i])], this.SHOP_SIZE);
	},

	// The current stock, restocked every SHOP_REFRESH matches
	shop() {
		const save = this.data;
		if (!save.shop || save.matches >= save.shop.refreshAt) {
			save.shop = {stock: this.shopCandidates(), refreshAt: save.matches + this.SHOP_REFRESH};
			this.commit();
		}
		return save.shop;
	},

	buy(index) {
		const shop = this.shop();
		const price = this.price(index);
		if (!shop.stock.includes(index) || this.data.crowns < price || this.owned(index) >= this.maxCopies(index))
			return false;
		this.data.crowns -= price;
		this.addCard(index);
		shop.stock.splice(shop.stock.indexOf(index), 1);
		this.commit();
		return true;
	},

	// ---------- matches ----------

	// The opponent's deck; rematches swap a few cards for random ones from their faction pool
	opponentDeck(opp, rematch) {
		const cards = Card.expandIDCounts(opp.deck.cards.map(([index, count]) => ({index, count})))
			.map(c => card_dict.indexOf(c));
		if (rematch) {
			const used = new Map();
			cards.forEach(i => used.set(i, (used.get(i) ?? 0) + 1));
			const pool = card_dict.map((c, i) => i).filter(i => {
				const c = card_dict[i];
				return c.deck === opp.deck.faction && c.row !== "leader" && !c.ability.split(" ").includes("hero") && (used.get(i) ?? 0) < Number(c.count);
			});
			const units = cards.map((i, n) => n).filter(n => DeckMaker.countCards([{index: cards[n], count: 1}]).units);
			for (let k = 0; k < this.RANDOM_SLOTS && pool.length && units.length; k++) {
				const slot = units.splice(randomInt(units.length), 1)[0];
				const pick = pool.splice(randomInt(pool.length), 1)[0];
				cards[slot] = pick;
			}
		}
		const counts = new Map();
		cards.forEach(i => counts.set(i, (counts.get(i) ?? 0) + 1));
		return {faction: opp.deck.faction, leader: card_dict[opp.deck.leader], cards: [...counts].map(([index, count]) => ({index, count}))};
	},

	// Deck terms the opponent imposes, or "" if the deck meets them
	termsWarning(opp, cards) {
		const rules = opp.modifiers.filter(m => m.id === "terms").map(m => m.rule);
		return rules.length ? DeckMaker.onlineRuleWarnings(cards, rules) : "";
	},

	// Cards that can be staked: copies the player owns beyond those in any saved deck
	stakeableCards() {
		return Object.keys(this.data.collection).map(Number).filter(i => {
			const inDecks = Math.max(0, ...Object.values(this.data.decks).map(d => d.cards.find(([c]) => c === i)?.[1] ?? 0));
			return card_dict[i].row !== "leader" && this.owned(i) > inDecks;
		});
	},

	// wager: {crowns: n} or {card: index}; only on rematches of beaten opponents. Stakes are paid up front.
	async startMatch(id, wager = null) {
		const opp = this.opponent(id);
		if (!opp || !this.isAvailable(id))
			return false;
		const rematch = this.beaten(id);
		return this.launch({id, opp, rematch, wager: rematch ? wager : null});
	},

	// The current round of the tournament run; wagers are allowed in every round
	async startTournamentMatch(wager = null) {
		const run = this.data.tournament;
		if (!run)
			return false;
		return this.launch({id: run.id, opp: this.tournamentOpponent(run), rematch: false, wager, tournament: true});
	},

	async launch(story) {
		const opp = story.opp;
		const {deck, warning} = this.playerDeck();
		const terms = this.termsWarning(opp, deck.cards);
		if (warning || terms) {
			await ui.alert(t("Invalid deck"), warning + terms);
			return false;
		}
		let wager = story.wager;
		if (wager && (wager.crowns && wager.crowns > this.data.crowns || wager.card !== undefined && !this.stakeableCards().includes(wager.card)))
			wager = null;
		if (wager?.crowns)
			this.data.crowns -= wager.crowns;
		else if (wager?.card !== undefined)
			this.removeCard(wager.card);
		this.commit();

		game.reset();
		game.endScreen.classList.add("hide");
		player_me?.reset();
		player_op?.reset();
		const oppDeck = this.opponentDeck(opp, story.rematch);
		player_me = new Player(0, t("Geralt"), deck);
		player_me.setMaster(this.isMaster());
		player_op = new Player(1, t(opp.name), oppDeck);
		player_op.controller = new ControllerAI(player_op, opp.level);
		this.boardPortrait("me", this.frameStyle("neutral_geralt", this.artURL("lg/neutral_geralt.jpg")));
		this.boardPortrait("op", opp.portrait && this.portraitStyle(opp));
		game.story = {...story, wager, oppDeck, weatherPlayed: false, heroPlayed: false, wentFirst: null};
		document.body.classList.add("story");
		document.getElementById("deck-customization").classList.add("hide");
		game.startGame();
		return true;
	},

	rematch() {
		const story = game.story;
		if (story && !story.tournament)
			this.startMatch(story.id);
	},

	// Called by Game.startGame before the players are set up, so a blocked leader never registers its effects
	applyModifiers(story) {
		const opp = story.opp;
		for (const m of opp.modifiers) {
			switch (m.id) {
			case "weather":
				game.roundStart.push(async () => {
					if (m.rounds.includes(game.roundCount))
						await board.toWeather(new Card(card_dict[m.card], player_op));
					return false;
				});
				break;
			case "ambush":
				game.gameStart.push(async () => {
					game.firstPlayer = player_op;
					await ui.playerNotification("first", player_op, 1200);
					return true;
				});
				break;
			case "frostborn":
				game.weatherImmune.push(board.row[2]);
				break;
			case "extraDraw":
				game.roundStart.push(async () => {
					for (const p of m.side === "both" ? [player_me, player_op] : [player_me])
						await p.deck.draw(p.hand);
					return true;
				});
				break;
			case "informants":
				game.roundStart.push(async () => {
					const hand = player_me.hand.cards;
					if (hand.length)
						await board.toGrave(hand[randomInt(hand.length)], player_me.hand);
					return true;
				});
				break;
			case "leaderBlocked":
				player_me.leaderBlockedBy = {name: t(opp.name)};
				player_me.disableLeader();
				break;
			case "whiteFrost":
				game.weatherHeroes.push(...board.row.slice(3));
				break;
			case "heroTaken":
				game.gameStart.push(async () => {
					const heroes = player_me.deck.cards.filter(c => c.isHero());
					if (heroes.length) {
						const card = heroes[randomInt(heroes.length)];
						player_me.deck.removeCard(card);
						await this.ruleNotice(m, t("{card} is taken for this match.", {card: card.name}), card);
					}
					return true;
				});
				break;
			case "heroLimit":
				game.heroLimit = {player: player_me, max: 1, played: 0, message: this.modifierText(m)};
				game.roundStart.push(async () => {
					game.heroLimit.played = 0;
					return false;
				});
				game.heroPlaced.push(async (card, owner) => {
					if (owner === player_me)
						game.heroLimit.played++;
				});
				break;
			case "scorchHeroes":
				game.scorchHeroes.push(...board.row.slice(3));
				break;
			case "heroDebt":
				game.heroPlaced.push(async (card, owner) => {
					const hand = player_me.hand.cards;
					if (owner !== player_me || !hand.length)
						return;
					const paid = hand[randomInt(hand.length)];
					await board.toGrave(paid, player_me.hand);
					await this.ruleNotice(m, t("{card} is discarded.", {card: paid.name}), paid);
				});
				break;
			case "heroFeeds": {
				const rows = m.row === "close" ? [board.row[2]] : board.row.slice(0, 3);
				game.roundStart.push(async () => {
					game.rowBonus.clear();
					return false;
				});
				game.heroPlaced.push(async (card, owner) => {
					if (owner !== player_me)
						return;
					rows.forEach(r => game.rowBonus.set(r, (game.rowBonus.get(r) ?? 0) + 1));
					await Promise.all(rows.flatMap(r => r.cards.filter(c => !c.isHero()).map(c => c.animate("morale"))));
					rows.forEach(r => r.updateScore());
				});
				break;
			}
			}
		}
	},

	// Banner for a story rule taking effect, with the affected card's art
	async ruleNotice(m, text, card) {
		const name = this.modifierName(m);
		await ui.notification("leader", 2200, name ? t(name) + ": " + text : text, card && smallURL(card.faction + "_" + card.filename));
	},

	OBJECTIVES: {
		sweep: {label: "Win 2–0", check: () => game.roundHistory.every(r => r.winner === player_me)},
		noLeader: {label: "Win without using your leader", check: () => player_me.leaderAvailable || !!player_me.leaderBlockedBy || !player_me.leader.activated.length},
		margin20: {label: "Win the final round by 20 or more", check: () => {
			const last = game.roundHistory[game.roundHistory.length - 1];
			return !!last && last.score_me - last.score_op >= 20;
		}},
		hand3: {label: "Finish with 3 or more cards in hand", check: () => player_me.hand.cards.length >= 3},
		noWeather: {label: "Win without playing weather", check: () => !game.story.weatherPlayed},
		second: {label: "Win while going second", check: () => game.story.wentFirst === false},
		noHeroes: {label: "Win without playing a hero", check: () => !game.story.heroPlayed}
	},

	objectiveLabels(opp, id) {
		const labels = [t("Win"), ...opp.objectives.map(o => t(this.OBJECTIVES[o].label))];
		return this.secretRevealed(id) ? [...labels, t(this.OBJECTIVES[this.SECRET_OBJECTIVE].label)] : labels;
	},

	// Records the result and grants rewards; the pick-1-of-3 waits in save.pending until the map shows it
	onGameEnd(story) {
		const {id, opp, rematch, wager} = story;
		const won = player_op.health <= 0 && player_me.health > 0;
		const draw = player_op.health <= 0 && player_me.health <= 0;
		const save = this.data;
		const stats = save.stats;
		const result = {id, won, draw, stars: [false, false, false, false], starsNew: [false, false, false, false], newStars: 0, crowns: 0, cards: [], unlocked: null, wager: null};
		save.matches++;

		if (story.tournament)
			this.tournamentResult(result);
		else if (won) {
			const progress = this.progressOf(id);
			result.stars = [true, ...opp.objectives.map(o => !!this.OBJECTIVES[o].check())];
			const revealed = result.stars.every((s, i) => s || progress.stars[i]);
			result.stars.push(revealed && !!this.OBJECTIVES[this.SECRET_OBJECTIVE].check());
			const base = this.winCrowns(id);
			if (!rematch) {
				result.crowns += base * (opp.boss ? 2 : 1);
				for (const [index, n] of opp.rewards)
					result.cards.push(this.addCard(index, n));
				if (opp.unlocks && this.unlockFaction(opp.unlocks))
					result.unlocked = opp.unlocks;
			} else
				result.crowns += Math.round(base / 2);
			result.stars.forEach((s, i) => {
				if (s && !progress.stars[i]) {
					progress.stars[i] = true;
					result.starsNew[i] = true;
					result.newStars++;
				}
			});
			result.crowns += Math.round(result.newStars * base * this.STAR_BONUS);
			const pick = this.rewardChoices(opp, rematch);
			if (pick.length)
				save.pending.push({kind: "reward", cards: pick});
			progress.wins++;
			stats.wins++;
			stats.streak++;
			stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
		} else {
			if (!draw) {
				this.progressOf(id).losses++;
				stats.losses++;
			}
			stats.streak = 0;
		}

		if (wager?.crowns) {
			const back = won ? wager.crowns * 2 : draw ? wager.crowns : 0;
			result.crowns += back;
			result.wager = {crowns: wager.crowns, won, returned: back};
		} else if (wager?.card !== undefined) {
			if (won || draw)
				this.addCard(wager.card);
			const winnings = won ? this.wagerChoices(story.oppDeck) : [];
			if (winnings.length)
				save.pending.push({kind: "wager", cards: winnings});
			result.wager = {card: wager.card, won, kept: won || draw};
		}

		save.crowns += result.crowns;
		stats.crownsEarned += result.crowns;
		result.cards.forEach(c => stats.crownsEarned += c.crowns);
		this.commit();
		story.result = result;
		return result;
	},

	// Quitting mid-match counts as a loss; a staked card or crowns stay lost, and a tournament run ends
	forfeit() {
		const story = game.story;
		if (!story || story.result)
			return;
		if (story.tournament)
			this.data.tournament = null;
		else
			this.progressOf(story.id).losses++;
		this.data.stats.losses++;
		this.data.stats.streak = 0;
		this.data.matches++;
		this.commit();
	},

	// ---------- tournaments ----------

	tournament(id) {
		return campaign.tournaments[id];
	},

	isTournamentOpen(id) {
		const tour = this.tournament(id);
		return !!tour && this.beaten(tour.requires);
	},

	openTournaments() {
		return Object.keys(campaign.tournaments).filter(id => this.isTournamentOpen(id));
	},

	tournamentsAt(placeKey) {
		return this.openTournaments().filter(id => this.tournament(id).place === placeKey);
	},

	// Pays the fee and draws every round's entrant, deck and modifier up front so a reload resumes the same bracket
	enterTournament(id) {
		const tour = this.tournament(id);
		if (!this.isTournamentOpen(id) || this.data.tournament || this.data.crowns < tour.fee)
			return false;
		const entrants = [...tour.entrants.keys()];
		this.data.crowns -= tour.fee;
		this.data.tournament = {
			id, round: 0,
			entrants: tour.rounds.map(() => entrants.splice(randomInt(entrants.length), 1)[0]),
			decks: tour.rounds.map(r => randomInt(ai_decks[r.decks].length)),
			mods: tour.rounds.map(() => randomInt(tour.modifiers.length))
		};
		this.commit();
		return true;
	},

	withdrawTournament() {
		this.data.tournament = null;
		this.commit();
	},

	// The opponent of a round, in the same shape as campaign opponents
	tournamentOpponent(run, round = run.round) {
		const tour = this.tournament(run.id);
		const r = tour.rounds[round];
		const modifier = tour.modifiers[run.mods[round]];
		const deck = ai_decks[r.decks][run.decks[round]];
		const entrant = tour.entrants[run.entrants[round]];
		return {name: entrant.name, portrait: entrant.portrait, level: r.level, music: tour.music,
			deck: r.noHeroes ? {...deck, cards: deck.cards.filter(([i]) => this.rarity(card_dict[i]) !== "hero")} : deck,
			modifiers: modifier ? [modifier] : [], objectives: [], rewards: [], dialogue: {}, tournament: run.id};
	},

	// Advances or ends the run: crowns per round won, the champion's purse and the first leader prize not owned yet
	tournamentResult(result) {
		const save = this.data;
		const run = save.tournament;
		const tour = run && this.tournament(run.id);
		if (!tour)
			return;
		const stats = save.stats;
		result.tournament = {id: run.id, round: run.round + 1, rounds: tour.rounds.length};
		if (result.won) {
			stats.wins++;
			stats.streak++;
			stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
			result.crowns += tour.perRound;
			if (++run.round < tour.rounds.length)
				return;
			result.crowns += tour.champion;
			result.tournament.champion = true;
			stats.tournamentsWon++;
			const prize = tour.prizes.find(i => !this.owned(i));
			if (prize !== undefined)
				result.cards.push(this.addCard(prize));
			else {
				const heroes = this.heroChoices();
				if (heroes.length)
					save.pending.push({kind: "reward", cards: heroes});
			}
			save.tournament = null;
		} else {
			stats.streak = 0;
			if (result.draw)
				return;
			stats.losses++;
			result.tournament.eliminated = true;
			save.tournament = null;
		}
	},

	// Three heroes not owned yet from unlocked factions and neutrals (a champion who owns every leader prize)
	heroChoices() {
		const fixed = this.fixedRewards();
		const pool = card_dict.map((c, i) => i).filter(i => {
			const c = card_dict[i];
			return this.rarity(c) === "hero" && [...this.data.unlockedFactions, "neutral"].includes(c.deck) && !fixed.has(i) && !this.owned(i);
		});
		return this.weightedPick(pool, () => 1, 3);
	},

	// Weighted random choice of up to n distinct items
	weightedPick(items, weight, n) {
		const pool = [...items], picked = [];
		while (picked.length < n && pool.length) {
			let r = Math.random() * pool.reduce((a, x) => a + weight(x), 0);
			const k = pool.findIndex(x => (r -= weight(x)) < 0);
			picked.push(pool.splice(k < 0 ? pool.length - 1 : k, 1)[0]);
		}
		return picked;
	},

	fixedRewards() {
		return new Set([...campaign.reserved, ...Object.values(campaign.opponents).flatMap(o => o.rewards.map(([i]) => i))]);
	},

	// Three cards from the opponent's faction (or every unlocked faction) and neutrals, never maxed or fixed rewards
	rewardChoices(opp, rematch) {
		const factions = this.isUnlocked(opp.deck.faction) ? [opp.deck.faction] : this.data.unlockedFactions;
		const fixed = this.fixedRewards();
		const pool = card_dict.map((c, i) => i).filter(i => {
			const c = card_dict[i];
			return c.row !== "leader" && [...factions, "neutral", "special", "weather"].includes(c.deck)
				&& !fixed.has(i) && this.owned(i) < this.maxCopies(i);
		});
		const weights = {common: 6, ability: 4, hero: rematch ? 0.5 : 1};
		return this.weightedPick(pool, i => weights[this.rarity(card_dict[i])], 3);
	},

	// A beaten opponent's deck cards the player can still add
	wagerChoices(oppDeck) {
		return oppDeck.cards.map(c => c.index).filter(i => this.owned(i) < this.maxCopies(i));
	},

	// Lets the player choose each pending reward (survives reloads until picked)
	async resolvePending() {
		while (this.data.pending.length) {
			const item = this.data.pending[0];
			const container = new CardContainer();
			container.cards = item.cards.map(i => {
				const card = new Card(card_dict[i], player_me);
				card.index = i;
				return card;
			});
			let chosen = null;
			const title = item.kind === "wager" ? t("Choose a card from your opponent's deck") : t("Choose your reward");
			while (chosen === null)
				await ui.queueCarousel(container, 1, (c, i) => chosen = c.cards[i].index, () => true, false, false, title);
			this.addCard(chosen);
			this.data.pending.shift();
			this.commit();
			AudioManager.playSFX("ui_card_bank");
		}
	},

	// "Continue" on the end screen (after Game.returnToMainMenu reset the board): outro, results, then the map
	async finish() {
		const story = game.story;
		game.story = null;
		document.getElementById("deck-customization").classList.add("hide");
		if (story?.tournament)
			StoryUI.view = {kind: "tournament", id: story.id};
		StoryUI.show();
		if (story?.result) {
			await StoryUI.dialogue(...this.outro(story));
			await StoryUI.showResult(story.result, story.opp);
			if (story.result.won && !story.rematch && story.opp.credits)
				await StoryUI.showCredits(story.opp);
		}
		await this.openMap();
	},

	// [speaker source, dialogue part] after a match: rematches don't hand out reward cards again, and fights Dandelion retells as cards stay told
	outro(story) {
		const {opp, result} = story;
		if (story.tournament && result.tournament?.champion)
			return [{name: this.tournament(story.id).name, dialogue: this.tournament(story.id).dialogue}, "champion"];
		if (!story.rematch || story.tournament)
			return [opp, result.won ? "win" : "loss"];
		if (opp.dialogue.rematch)
			return [opp, "rematch"];
		const pool = opp.retold ? (result.won ? campaign.rematch.retoldWin : campaign.rematch.retoldLoss) : result.won ? campaign.rematch.win : null;
		return pool ? [{...opp, dialogue: {rematch: [pool[randomInt(pool.length)]]}}, "rematch"] : [opp, "loss"];
	},

	// Leaving a match without finishing it
	async leaveMatch() {
		this.forfeit();
		if (game.story?.tournament)
			StoryUI.view = {kind: "tournament", id: game.story.id};
		game.story = null;
		await this.openMap();
	},

	async openMap() {
		document.body.classList.remove("story");
		StoryUI.show();
		await this.resolvePending();
		StoryUI.render();
		const added = this.awardMaster();
		if (added !== null)
			await StoryUI.showMaster(added);
		await this.playOpeners();
	},

	// Main chapters tell their opener as soon as they open; post-game ones the first time they are visited
	async playOpeners(visited) {
		if (this.openersPlaying)
			return;
		this.openersPlaying = true;
		try {
			for (const chapter of campaign.chapters) {
				if (!StoryUI.isOpen() || !this.isChapterOpen(chapter.id) || this.data.seenChapters.includes(chapter.id)
					|| chapter.opensAfter && chapter.id !== visited)
					continue;
				await StoryUI.chapterOpener(chapter);
				this.data.seenChapters.push(chapter.id);
				this.commit();
			}
		} finally {
			this.openersPlaying = false;
		}
	},

	// ---------- deck builder ----------

	openDeck() {
		StoryUI.hide();
		dm.story = true;
		document.body.classList.add("story", "deck-only");
		document.getElementById("deck-back").textContent = "\u2039 " + t("Map");
		dm.loadFactionDeck(this.data.activeFaction, true);
		dm.updateDeckTitle();
		document.getElementById("deck-customization").classList.remove("hide");
		AudioManager.playSFX("menu_opening");
	},

	closeDeck() {
		dm.story = false;
		document.body.classList.remove("story", "deck-only");
		document.getElementById("deck-back").textContent = "\u2039 " + t("Main Menu");
		dm.loadFactionDeck(Settings.getLastFaction(dm.owner).get(), true);
		dm.updateDeckTitle();
		document.getElementById("deck-customization").classList.add("hide");
		this.openMap();
	},

	// ---------- save files ----------

	exportSave() {
		const blob = new Blob([JSON.stringify(this.data, null, "\t")], {type: "application/json"});
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "gwent-story-save.json";
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	},

	async importSave(file) {
		let parsed = null;
		try {
			parsed = JSON.parse(await file.text());
		} catch {}
		const clean = parsed && this.sanitize(parsed);
		if (!clean) {
			await ui.alert(t("Invalid save file"), t("The file is not a valid Gwent story save."));
			return false;
		}
		this.save.set(clean);
		return true;
	},

	// Rebuilds a save from untrusted data keeping only known, valid fields; null if it can't be trusted
	sanitize(raw) {
		const isCount = (n, max = Infinity) => Number.isInteger(n) && n >= 0 && n <= max;
		if (!raw || typeof raw !== "object" || raw.version !== this.VERSION || !isCount(raw.crowns))
			return null;
		const save = {version: this.VERSION, crowns: raw.crowns, collection: {}, decks: {}, progress: {}, pending: [],
			matches: isCount(raw.matches) ? raw.matches : 0, stats: {}};
		for (const [key, n] of Object.entries(raw.collection ?? {})) {
			const index = Number(key);
			if (!card_dict[index] || !isCount(n, this.maxCopies(index)))
				return null;
			if (n)
				save.collection[index] = n;
		}
		const unlocked = Array.isArray(raw.unlockedFactions) ? raw.unlockedFactions : [];
		if (!unlocked.includes("realms") || unlocked.some(f => !this.FACTIONS.includes(f)))
			return null;
		save.unlockedFactions = [...new Set(unlocked)];
		save.activeFaction = save.unlockedFactions.includes(raw.activeFaction) ? raw.activeFaction : "realms";
		for (const faction of save.unlockedFactions) {
			const deck = raw.decks?.[faction];
			const leader = card_dict[deck?.leader];
			if (!leader || leader.row !== "leader" || leader.deck !== faction || !save.collection[deck.leader] || !Array.isArray(deck.cards))
				return null;
			const cards = [];
			for (const entry of deck.cards) {
				const [index, n] = Array.isArray(entry) ? entry : [];
				const card = card_dict[index];
				if (!card || card.row === "leader" || ![faction, "neutral", "special", "weather"].includes(card.deck) || !isCount(n, save.collection[index] ?? 0))
					return null;
				if (n)
					cards.push([index, n]);
			}
			save.decks[faction] = {leader: deck.leader, cards};
		}
		for (const [id, p] of Object.entries(raw.progress ?? {})) {
			if (!campaign.opponents[id] || !isCount(p?.wins) || !isCount(p?.losses) || !Array.isArray(p.stars) || ![3, 4].includes(p.stars.length))
				return null;
			// Saves from before the secret star have three
			const stars = [0, 1, 2, 3].map(i => p.stars[i] === true);
			save.progress[id] = {wins: p.wins, losses: p.losses, stars, seen: p.seen === true};
		}
		// Saves from before chapter openers count every chapter already played in as seen
		save.seenChapters = Array.isArray(raw.seenChapters)
			? campaign.chapters.map(c => c.id).filter(id => raw.seenChapters.includes(id))
			: campaign.chapters.filter(c => this.chapterOpponents(c.id).some(id => save.progress[id]?.wins > 0)).map(c => c.id);
		save.last = campaign.opponents[raw.last] ? raw.last : null;
		save.master = raw.master === true;
		const stock = raw.shop?.stock;
		save.shop = Array.isArray(stock) && isCount(raw.shop.refreshAt) && stock.length <= this.SHOP_SIZE && stock.every(i => Number.isInteger(i) && card_dict[i] && card_dict[i].row !== "leader")
			? {stock: [...stock], refreshAt: raw.shop.refreshAt} : null;
		for (const item of Array.isArray(raw.pending) ? raw.pending : []) {
			if (!["reward", "wager"].includes(item?.kind) || !Array.isArray(item.cards) || !item.cards.every(i => Number.isInteger(i) && card_dict[i] && card_dict[i].row !== "leader"))
				return null;
			save.pending.push({kind: item.kind, cards: item.cards.slice(0, 40)});
		}
		for (const key of ["wins", "losses", "streak", "bestStreak", "crownsEarned", "tournamentsWon"])
			save.stats[key] = isCount(raw.stats?.[key]) ? raw.stats[key] : 0;
		// An invalid tournament run is dropped rather than rejecting the whole save
		const run = raw.tournament, tour = campaign.tournaments[run?.id];
		const indices = (list, max) => Array.isArray(list) && list.length === tour.rounds.length && list.every((i, r) => isCount(i, max(r) - 1));
		save.tournament = tour && isCount(run.round, tour.rounds.length - 1)
			&& indices(run.entrants, () => tour.entrants.length) && new Set(run.entrants).size === run.entrants.length
			&& indices(run.decks, r => ai_decks[tour.rounds[r].decks].length) && indices(run.mods, () => tour.modifiers.length)
			? {id: run.id, round: run.round, entrants: [...run.entrants], decks: [...run.decks], mods: [...run.mods]} : null;
		return save;
	}
};

// Builds an element: attrs may hold class, text, style (custom properties), on<event> handlers or plain attributes
function storyEl(tag, attrs = {}, ...children) {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v === undefined || v === null || v === false)
			continue;
		if (k === "class")
			e.className = v;
		else if (k === "text")
			e.textContent = v;
		else if (k === "style")
			Object.entries(v).forEach(([p, val]) => e.style.setProperty(p, val));
		else if (k.startsWith("on"))
			e.addEventListener(k.slice(2), v);
		else
			e.setAttribute(k, v === true ? "" : v);
	}
	e.append(...children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false));
	return e;
}

// Story screen: campaign map, side panel (journal / location / opponent), dialogue and modals
const StoryUI = {
	el: document.getElementById("story-screen"),
	map: document.getElementById("story-map"),
	inner: document.getElementById("story-map-inner"),
	pins: document.getElementById("story-pins"),
	fog: document.getElementById("story-fog"),
	path: document.querySelector("#story-path polyline"),
	token: document.getElementById("story-token"),
	panel: document.getElementById("story-panel"),
	modal: document.getElementById("story-modal"),
	modalBox: document.getElementById("story-modal-box"),
	dlg: document.getElementById("story-dialogue"),
	view: {kind: "journal"},
	wager: null,
	zoom: 1,
	pan: {x: 0, y: 0},
	modalDone: null,
	dialogueState: null,

	init() {
		document.getElementById("story-back").addEventListener("click", () => {
			// The title fades in over the map (z 88 > 87); hiding the map first would flash the board
			openTitleScreen();
			clearTimeout(this.hideTimer);
			this.hideTimer = setTimeout(() => this.hide(), 650);
		});
		document.getElementById("story-open-deck").addEventListener("click", () => StoryMode.openDeck());
		document.getElementById("story-open-collection").addEventListener("click", () => this.openCollection());
		document.getElementById("story-open-shop").addEventListener("click", () => this.openShop());
		document.getElementById("story-open-stats").addEventListener("click", () => this.openStats());
		document.getElementById("story-open-options").addEventListener("click", () => this.openOptions());
		document.getElementById("story-zoom-in").addEventListener("click", () => this.zoomBy(1.4));
		document.getElementById("story-zoom-out").addEventListener("click", () => this.zoomBy(1 / 1.4));
		document.getElementById("story-import-file").addEventListener("change", async e => {
			const file = e.target.files[0];
			e.target.value = "";
			if (file && await StoryMode.importSave(file)) {
				this.closeModal();
				this.view = {kind: "journal"};
				this.render();
				StoryMode.playOpeners();
			}
		});
		this.modal.addEventListener("click", e => e.target === this.modal && this.closeModal());
		this.dlg.addEventListener("click", e => !e.target.closest("button") && this.dialogueState?.next());
		document.getElementById("story-dialogue-skip").addEventListener("click", () => this.dialogueState?.finish());
		document.getElementById("story-dialogue-guide").addEventListener("click", () => guide.open());
		["#title-story", "#story-back", "#story-actions > button", "#story-zoom > button"].forEach(addMouseEnterSFXBySelector);
		this.initPanZoom();
		// Capture phase: runs before the global handler that clicks focused role=button elements
		document.addEventListener("keydown", e => this.onKey(e), true);
		new ResizeObserver(() => this.applyTransform()).observe(this.map);
	},

	isOpen() {
		return !this.el.classList.contains("hide");
	},

	// Theme of the chapter on screen (viewed chapter, place, opponent or tournament), else of the newest open chapter
	mapMusic() {
		if (this.creditsPlaying)
			return;
		const v = this.view ?? {};
		const chapterOfPlace = key => Object.entries(campaign.opponents).find(([id, o]) => (o.place ?? id) === key)?.[1].chapter;
		const id = v.kind === "chapter" ? v.chapter
			: v.kind === "opponent" ? campaign.opponents[v.id]?.chapter
			: v.kind === "place" ? chapterOfPlace(v.place)
			: v.kind === "tournament" ? chapterOfPlace(StoryMode.tournament(v.id)?.place)
			: null;
		const chapter = campaign.chapters.find(c => c.id === id) ?? campaign.chapters.filter(c => StoryMode.isChapterOpen(c.id)).pop();
		ui.setMusicTrack(ui.music[chapter?.music] ? chapter.music : "map");
	},

	show() {
		clearTimeout(this.hideTimer);
		const opening = !this.isOpen();
		this.el.classList.remove("hide");
		document.body.classList.add("story-map");
		this.mapMusic();
		if (opening)
			this.focusChapter();
		this.render();
	},

	hide() {
		this.el.classList.add("hide");
		document.body.classList.remove("story-map");
		this.closeModal();
	},

	onKey(e) {
		if (!this.isOpen() || Popup.curr || Carousel.curr || guide.isOpen())
			return;
		if (this.dialogueState) {
			if (["Enter", " ", "ArrowRight"].includes(e.key))
				this.dialogueState.next();
			else if (e.key === "Escape")
				this.dialogueState.finish();
			else
				return;
		} else if (e.key === "Escape") {
			if (!this.modal.classList.contains("hide"))
				this.closeModal();
			else if (this.view.kind !== "journal")
				this.back();
			else
				return;
		} else
			return;
		e.preventDefault();
		e.stopPropagation();
	},

	render() {
		if (!this.isOpen())
			return;
		this.mapMusic();
		document.getElementById("story-crowns").textContent = t("{n} crowns", {n: StoryMode.data.crowns});
		this.renderPins();
		this.renderFog();
		this.renderPath();
		this.renderPanel();
	},

	// ---------- map ----------

	renderPins() {
		this.pins.replaceChildren();
		const last = StoryMode.data.last && StoryMode.placeOf(StoryMode.data.last);
		let tokenPlace = last;
		for (const place of StoryMode.places()) {
			const opps = place.ids.map(id => ({id, opp: StoryMode.opponent(id)}));
			const available = opps.filter(o => StoryMode.isAvailable(o.id));
			const fresh = available.find(o => !StoryMode.beaten(o.id));
			const shown = fresh ?? available[0] ?? opps[0];
			const boss = opps.some(o => o.opp.boss);
			const tournaments = StoryMode.tournamentsAt(place.key);
			tokenPlace ??= fresh && place;
			const classes = ["story-pin", "faction-" + shown.opp.deck.faction,
				boss && "boss", !available.length && "locked", fresh && "available",
				available.length && !fresh && !tournaments.length && opps.every(o => StoryMode.beaten(o.id)) && "done",
				this.view.place === place.key && "selected"].filter(Boolean).join(" ");
			// Lock and count are child spans: the pin's ::after is the shared data-title tooltip
			const pin = storyEl("button", {
				class: classes, "aria-label": t(place.name) + (available.length ? "" : " (" + t("Locked") + ")"), "data-title": t(place.name),
				style: {"--x": place.x, "--y": place.y, ...StoryMode.portraitStyle(shown.opp)},
				onclick: () => this.openPlace(place.key)
			},
				storyEl("span", {class: "pin-art", "aria-hidden": "true"}),
				!available.length && storyEl("span", {class: "pin-lock", "aria-hidden": "true", text: "\uD83D\uDD12"}),
				opps.length > 1 && storyEl("span", {class: "pin-count", "aria-hidden": "true", text: String(opps.length)}));
			if (opps.length === 1 && StoryMode.beaten(shown.id))
				pin.append(storyEl("span", {class: "pin-stars", text: this.starText(shown.id)}));
			this.pins.append(pin);
		}
		tokenPlace ??= StoryMode.places()[0];
		if (tokenPlace) {
			this.token.style.setProperty("--x", tokenPlace.x);
			this.token.style.setProperty("--y", tokenPlace.y);
			this.token.classList.toggle("boss", tokenPlace.ids.some(id => StoryMode.opponent(id).boss));
		}
	},

	// Darkens the map except around the chapters that are open
	renderFog() {
		const ctx = this.fog.getContext("2d");
		const w = this.fog.width, h = this.fog.height;
		ctx.globalCompositeOperation = "source-over";
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(6, 5, 4, 0.84)";
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = "destination-out";
		for (const chapter of campaign.chapters.filter(c => StoryMode.isChapterOpen(c.id))) {
			for (const r of chapter.reveal) {
				ctx.save();
				ctx.translate(r.x / 100 * w, r.y / 100 * h);
				ctx.scale(r.rx / 100 * w, r.ry / 100 * h);
				const g = ctx.createRadialGradient(0, 0, 0.55, 0, 0, 1);
				g.addColorStop(0, "rgba(0, 0, 0, 1)");
				g.addColorStop(1, "rgba(0, 0, 0, 0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(0, 0, 1, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		}
	},

	// Dotted route through the bosses of the open chapters
	renderPath() {
		const points = campaign.chapters.filter(c => StoryMode.isChapterOpen(c.id))
			.map(c => StoryMode.placeOf(StoryMode.chapterBoss(c.id)))
			.filter(Boolean)
			.map(p => p.x + "," + p.y);
		this.path.setAttribute("points", points.length > 1 ? points.join(" ") : "");
	},

	initPanZoom() {
		const pointers = new Map();
		let last = null, pinch = null;
		this.map.addEventListener("pointerdown", e => {
			if (e.target.closest("button"))
				return;
			pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
			this.map.setPointerCapture(e.pointerId);
			this.map.classList.add("gesturing");
			last = {x: e.clientX, y: e.clientY};
			if (pointers.size === 2) {
				const [a, b] = [...pointers.values()];
				pinch = {dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom};
			}
		});
		this.map.addEventListener("pointermove", e => {
			if (!pointers.has(e.pointerId))
				return;
			pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
			if (pinch && pointers.size === 2) {
				const [a, b] = [...pointers.values()];
				const rect = this.map.getBoundingClientRect();
				this.zoomTo(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
				return;
			}
			this.pan.x += e.clientX - last.x;
			this.pan.y += e.clientY - last.y;
			last = {x: e.clientX, y: e.clientY};
			this.map.classList.toggle("dragging", this.zoom > 1);
			this.applyTransform();
		});
		const end = e => {
			pointers.delete(e.pointerId);
			if (pointers.size < 2)
				pinch = null;
			const rest = [...pointers.values()][0];
			last = rest ? {...rest} : null;
			this.map.classList.remove("dragging");
			if (!pointers.size)
				this.map.classList.remove("gesturing");
		};
		this.map.addEventListener("pointerup", end);
		this.map.addEventListener("pointercancel", end);
		this.map.addEventListener("wheel", e => {
			e.preventDefault();
			const rect = this.map.getBoundingClientRect();
			this.zoomTo(this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - rect.left, e.clientY - rect.top);
		}, {passive: false});
	},

	zoomBy(factor) {
		this.zoomTo(this.zoom * factor, this.map.clientWidth / 2, this.map.clientHeight / 2);
	},

	// Zooms onto the latest open chapter's region
	focusChapter() {
		const chapter = campaign.chapters.filter(c => StoryMode.isChapterOpen(c.id)).pop();
		const r = chapter?.reveal[0];
		if (!r)
			return;
		const w = this.map.clientWidth, h = this.map.clientHeight;
		this.zoom = clamp(1, 2.2, 0.9 * Math.min(50 / r.rx, 50 / r.ry));
		this.pan = {x: w / 2 - r.x / 100 * w * this.zoom, y: h / 2 - r.y / 100 * h * this.zoom};
		this.applyTransform();
	},

	// Zooms keeping the map point under (cx, cy) in place
	zoomTo(zoom, cx, cy) {
		zoom = clamp(1, 3, zoom);
		this.pan.x = cx - (cx - this.pan.x) * zoom / this.zoom;
		this.pan.y = cy - (cy - this.pan.y) * zoom / this.zoom;
		this.zoom = zoom;
		this.applyTransform();
	},

	applyTransform() {
		const w = this.map.clientWidth, h = this.map.clientHeight;
		this.pan.x = clamp(w - w * this.zoom, 0, this.pan.x);
		this.pan.y = clamp(h - h * this.zoom, 0, this.pan.y);
		this.inner.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
		this.inner.style.setProperty("--zoom", this.zoom);
		this.maybeHiRes();
	},

	// Large desktop screens zoomed past what the 2560px map shows sharply get the 4096px one (too heavy for phones)
	maybeHiRes() {
		if (this.hiRes || !matchMedia("(pointer: fine)").matches || innerWidth < 1200)
			return;
		const img = document.getElementById("story-map-img");
		if (img.clientWidth * this.zoom * devicePixelRatio <= 2600)
			return;
		this.hiRes = true;
		const hi = new Image();
		hi.src = "img/map/continent-4096.jpg";
		hi.decode().then(() => {
			img.removeAttribute("srcset");
			img.src = hi.src;
		}).catch(() => this.hiRes = false);
	},

	// ---------- side panel ----------

	starText(id) {
		return StoryMode.visibleStars(id).map(s => s ? "\u2605" : "\u2606").join("");
	},

	stars(id) {
		const stars = StoryMode.visibleStars(id);
		return storyEl("span", {class: "story-stars", "aria-label": t("{n} of {total} stars", {n: stars.filter(Boolean).length, total: stars.length})},
			stars.map((s, i) => storyEl("span", {class: [!s && "off", i === 3 && "secret"].filter(Boolean).join(" "), text: s ? "\u2605" : "\u2606"})));
	},

	levelText(opp) {
		return t(factions[opp.deck.faction].name) + " \u00b7 " + t(ControllerAI.difficulties[opp.level].label);
	},

	portrait(opp, large = false) {
		return storyEl("div", {class: "story-portrait faction-" + opp.deck.faction + (large ? " large" : ""), style: StoryMode.portraitStyle(opp)});
	},

	cardThumb(index, unowned = false) {
		const card = card_dict[index];
		return storyEl("button", {class: "story-card-btn", "aria-label": card.name, onclick: () => ui.viewCard(new Card(card, player_me))},
			storyEl("img", {class: "story-card" + (unowned ? " unowned" : ""), src: StoryMode.cardImage(index), alt: "", loading: "lazy", draggable: "false"}));
	},

	openPlace(key) {
		const place = StoryMode.places().find(p => p.key === key);
		if (!place)
			return;
		AudioManager.playSFX("ui_card");
		StoryMode.playOpeners(place.chapter);
		if (place.ids.length === 1 && !StoryMode.tournamentsAt(key).length)
			return this.openOpponent(place.ids[0], {kind: "journal"});
		this.view = {kind: "place", place: key};
		this.render();
	},

	openOpponent(id, from = this.view) {
		this.wager = null;
		this.view = {kind: "opponent", id, place: StoryMode.placeOf(id)?.key, from};
		this.render();
	},

	back() {
		this.view = this.view.from ?? {kind: "journal"};
		this.render();
	},

	renderPanel() {
		const view = this.view;
		const content = view.kind === "opponent" ? this.opponentView(view.id)
			: view.kind === "tournament" ? this.tournamentView(view.id)
			: view.kind === "place" ? this.listView(StoryMode.places().find(p => p.key === view.place))
			: view.kind === "chapter" ? this.listView(null, view.chapter)
			: this.journalView();
		this.panel.replaceChildren(...content.filter(Boolean));
		this.panel.scrollTop = 0;
	},

	journalView() {
		const rows = campaign.chapters.map(chapter => {
			const open = StoryMode.isChapterOpen(chapter.id);
			const ids = StoryMode.chapterOpponents(chapter.id).filter(id => !StoryMode.isHidden(id));
			const beaten = ids.filter(id => StoryMode.beaten(id)).length;
			const stars = ids.reduce((a, id) => a + StoryMode.progressOf(id).stars.filter(Boolean).length, 0);
			const maxStars = ids.reduce((a, id) => a + StoryMode.visibleStars(id).length, 0);
			const status = !open ? t("Locked") : beaten === ids.length ? t("Completed") : t("{n} of {total} defeated", {n: beaten, total: ids.length});
			return storyEl("button", {class: "story-row", disabled: !open, onclick: () => {
				this.view = {kind: "chapter", chapter: chapter.id};
				this.render();
				StoryMode.playOpeners(chapter.id);
			}},
				storyEl("div", {}, storyEl("b", {text: t(chapter.name)}), storyEl("small", {text: status})),
				open && storyEl("span", {class: "story-stars", text: stars + "/" + maxStars + " \u2605"}));
		});
		const tournaments = StoryMode.openTournaments();
		return [storyEl("h2", {text: t("Journal")}), this.masterBadge(), storyEl("p", {class: "story-kicker", text: t("Choose a place on the map or a chapter below.")}), ...rows,
			tournaments.length > 0 && storyEl("h3", {text: t("Tournaments")}),
			...tournaments.map(id => this.tournamentRow(id, {kind: "journal"}))];
	},

	tournamentRow(id, from) {
		const tour = StoryMode.tournament(id);
		const run = StoryMode.data.tournament;
		const status = run?.id === id ? t("In progress: round {n} of {total}", {n: run.round + 1, total: tour.rounds.length})
			: t("Entry fee: {n} crowns", {n: tour.fee});
		return storyEl("button", {class: "story-row", onclick: () => this.openTournament(id, from)},
			this.trophy(tour),
			storyEl("div", {}, storyEl("b", {text: t(tour.name)}), storyEl("small", {text: status})));
	},

	// A tournament's emblem: its `emblem` lg/ image, else the art of its first leader prize
	trophy(tour, large = false) {
		const prize = card_dict[tour.prizes[0]];
		const art = tour.emblem ?? prize.deck + "_" + prize.filename;
		return storyEl("div", {class: "story-portrait faction-" + prize.deck + (large ? " large" : ""),
			style: StoryMode.frameStyle(art, StoryMode.artURL("lg/" + art + ".jpg"))});
	},

	openTournament(id, from = this.view) {
		AudioManager.playSFX("ui_card");
		this.wager = null;
		this.view = {kind: "tournament", id, from};
		this.render();
	},

	listView(place, chapterId = place?.chapter) {
		const chapter = StoryMode.chapter(chapterId);
		const ids = place ? place.ids : StoryMode.chapterOpponents(chapterId).filter(id => !StoryMode.isHidden(id));
		const from = this.view;
		const rows = ids.map(id => {
			const opp = StoryMode.opponent(id);
			const reason = StoryMode.lockReason(id);
			return storyEl("button", {class: "story-row", onclick: () => this.openOpponent(id, from)},
				this.portrait(opp),
				storyEl("div", {}, storyEl("b", {text: t(opp.name) + (opp.boss ? " \u2654" : "")}), storyEl("small", {text: reason || this.levelText(opp)})),
				StoryMode.beaten(id) && this.stars(id));
		});
		return [
			storyEl("button", {class: "btn-ghost story-back-link", text: "\u2039 " + t("Journal"), onclick: () => { this.view = {kind: "journal"}; this.render(); }}),
			storyEl("h2", {text: t(place ? place.name : chapter.name)}),
			place && storyEl("p", {class: "story-kicker", text: t(chapter.name)}),
			!place && this.epigraph(chapter),
			...rows,
			...(place ? StoryMode.tournamentsAt(place.key) : []).map(id => this.tournamentRow(id, from)),
			...this.rumor(chapter),
			!place && StoryMode.data.seenChapters.includes(chapter.id) && storyEl("div", {class: "story-buttons"},
				storyEl("button", {class: "btn-ghost", text: t("Replay Story"), onclick: () => this.chapterOpener(chapter)}))
		];
	},

	epigraph(chapter) {
		const e = chapter.epigraph;
		return e && storyEl("blockquote", {class: "story-epigraph"},
			storyEl("p", {text: StoryMode.text(e)}),
			storyEl("cite", {text: "\u2014 " + StoryMode.text(e.source)}));
	},

	// One tavern rumor about the chapter, drawn anew on each render
	rumor(chapter) {
		const rumors = chapter.rumors ?? [];
		return rumors.length ? [storyEl("h3", {text: t("Rumors")}),
			storyEl("p", {class: "story-rumor", text: StoryMode.text(rumors[Math.floor(Math.random() * rumors.length)])})] : [];
	},

	opponentView(id) {
		const opp = StoryMode.opponent(id);
		const progress = StoryMode.progressOf(id);
		const reason = StoryMode.lockReason(id);
		const beaten = StoryMode.beaten(id);
		const {deck, warning} = StoryMode.playerDeck();
		const terms = StoryMode.termsWarning(opp, deck.cards);
		const labels = StoryMode.objectiveLabels(opp, id);
		const crowns = StoryMode.nextWinCrowns(id);
		const record = [opp.boss && t("Chapter boss"), beaten && t("Won {w} \u00b7 Lost {l}", {w: progress.wins, l: progress.losses})].filter(Boolean);
		const out = [
			this.topBar(
				storyEl("button", {class: "btn-gold", text: t("Challenge"), disabled: !!(reason || warning || terms), onclick: () => this.challenge(id)}),
				progress.seen && storyEl("button", {class: "btn-ghost", text: t("Replay Story"), onclick: () => this.dialogue(opp, "intro")})),
			storyEl("div", {class: "story-opponent-head"},
				this.portrait(opp, true),
				storyEl("div", {},
					storyEl("h2", {text: t(opp.name)}),
					storyEl("p", {class: "story-kicker", text: this.levelText(opp)}),
					record.length > 0 && storyEl("p", {class: "story-dim", text: record.join(" \u00b7 ")}),
					reason && storyEl("p", {class: "story-warn", text: reason}),
					...this.deckSummary(deck, warning + terms),
					opp.rumor && storyEl("p", {class: "story-rumor", text: StoryMode.text(opp.rumor)})))
		];
		if (opp.modifiers.length)
			out.push(storyEl("h3", {text: t("Special rules")}), storyEl("ul", {class: "story-list"}, opp.modifiers.map(m => storyEl("li", {text: StoryMode.modifierText(m)}))));
		out.push(storyEl("div", {class: "story-cols"},
			storyEl("section", {},
				storyEl("h3", {text: t("Objectives")}),
				storyEl("ul", {class: "story-list stars"}, labels.map((l, i) => storyEl("li", {class: [progress.stars[i] && "earned", i === 3 && "secret"].filter(Boolean).join(" "), text: l})))),
			storyEl("section", {},
				storyEl("h3", {text: beaten ? t("Rematch reward") : t("Reward")}),
				storyEl("p", {class: "story-tight", text: t("{n} crowns and a card of your choice", {n: crowns})}),
				!beaten && storyEl("div", {class: "story-rewards"}, opp.rewards.map(([i]) => this.cardThumb(i))),
				!beaten && opp.unlocks && storyEl("p", {class: "story-dim", text: t("Unlocks the {name} faction.", {name: t(factions[opp.unlocks].name)})}))));
		if (beaten)
			out.push(...this.wagerSection());
		return out;
	},

	// Back link with the view's actions beside it, so they never need scrolling to
	topBar(...actions) {
		return storyEl("div", {class: "story-topbar"},
			storyEl("button", {class: "btn-ghost story-back-link", text: "\u2039 " + t("Back"), onclick: () => this.back()}),
			actions);
	},

	deckSummary(deck, warning) {
		return [
			storyEl("p", {class: "story-dim", text: t("Your deck") + ": " + t(factions[deck.faction].name) + " \u00b7 " + t("{n} unit cards", {n: DeckMaker.countCards(deck.cards).units})}),
			warning ? storyEl("p", {class: "story-warn", text: warning}) : null
		];
	},

	// Entry screen, or the current round of a run in progress (one run at a time)
	tournamentView(id) {
		const tour = StoryMode.tournament(id);
		const run = StoryMode.data.tournament;
		const crowns = StoryMode.data.crowns;
		const {deck, warning} = StoryMode.playerDeck();
		const active = run?.id === id;
		const opp = active && StoryMode.tournamentOpponent(run);
		const terms = active ? StoryMode.termsWarning(opp, deck.cards) : "";
		const busy = !active && run && StoryMode.tournament(run.id);
		const actions = active ? [
			storyEl("button", {class: "btn-gold", text: t("Play Round {n}", {n: run.round + 1}), disabled: !!(warning || terms), onclick: () => this.challengeTournament()}),
			storyEl("button", {class: "btn-ghost", text: t("Withdraw"), onclick: async () => {
				if (await ui.confirm(t("Withdraw from the tournament?"), t("Your entry fee is not refunded."), t("Withdraw"), t("Cancel"))) {
					StoryMode.withdrawTournament();
					this.render();
				}
			}})
		] : [
			storyEl("button", {class: "btn-gold", text: t("Enter \u00b7 {n} crowns", {n: tour.fee}), disabled: !!(busy || warning || crowns < tour.fee), onclick: () => {
				if (StoryMode.enterTournament(id)) {
					AudioManager.playSFX("ui_card_bank");
					this.render();
					this.dialogue({name: tour.name, dialogue: tour.dialogue}, "entry");
				}
			}})
		];
		const out = [
			this.topBar(...actions),
			storyEl("div", {class: "story-opponent-head"},
				this.trophy(tour, true),
				storyEl("div", {},
					storyEl("h2", {text: t(tour.name)}),
					storyEl("p", {class: "story-kicker", text: t(campaign.places[tour.place]?.name ?? "") + " \u00b7 " + t("{n} rounds", {n: tour.rounds.length})}),
					storyEl("p", {class: "story-dim", text: t("Single elimination: lose once and you're out. Each round is tougher than the last.")}),
					...this.deckSummary(deck, warning + terms),
					busy && storyEl("p", {class: "story-warn", text: t("Finish the {name} first.", {name: t(busy.name)})}),
					!active && !busy && crowns < tour.fee && storyEl("p", {class: "story-warn", text: t("You need {n} crowns to enter.", {n: tour.fee})}),
					tour.rumor && storyEl("p", {class: "story-rumor", text: StoryMode.text(tour.rumor)})))
		];

		if (active) {
			out.push(storyEl("ol", {class: "story-bracket"}, tour.rounds.map((r, i) => {
				const rival = i <= run.round && StoryMode.tournamentOpponent(run, i);
				return storyEl("li", {class: i < run.round ? "won" : i === run.round ? "current" : ""},
					rival ? this.portrait(rival) : storyEl("div", {class: "story-portrait unknown"}),
					storyEl("span", {text: t("Round {n}", {n: i + 1})}),
					storyEl("b", {text: rival ? t(rival.name) : "?"}));
			})));
			out.push(storyEl("h3", {text: t("Round {n} of {total}", {n: run.round + 1, total: tour.rounds.length})}),
				storyEl("div", {class: "story-row story-row-static"}, this.portrait(opp),
					storyEl("div", {}, storyEl("b", {text: t(opp.name)}), storyEl("small", {text: t(factions[opp.deck.faction].name)}))));
			if (opp.modifiers.length)
				out.push(storyEl("h3", {text: t("Special rules")}), storyEl("ul", {class: "story-list"}, opp.modifiers.map(m => storyEl("li", {text: StoryMode.modifierText(m)}))));
			out.push(storyEl("p", {class: "story-dim", text: run.round + 1 < tour.rounds.length
				? t("Win to earn {n} crowns and advance.", {n: tour.perRound})
				: t("Win the final to earn {n} crowns and the grand prize.", {n: tour.perRound + tour.champion})}));
			out.push(...this.wagerSection());
			return out;
		}

		const prizes = tour.prizes.filter(i => !StoryMode.owned(i));
		out.push(storyEl("h3", {text: t("Prizes")}),
			storyEl("ul", {class: "story-list"},
				storyEl("li", {text: t("Entry fee: {n} crowns", {n: tour.fee})}),
				storyEl("li", {text: t("{n} crowns for each round you win", {n: tour.perRound})}),
				storyEl("li", {text: prizes.length ? t("Champion: {n} more crowns and a leader card", {n: tour.champion}) : t("Champion: {n} more crowns and a hero of your choice", {n: tour.champion})})),
			prizes.length > 0 && storyEl("div", {class: "story-rewards"}, prizes.map(i => this.cardThumb(i))));
		return out;
	},

	async challengeTournament() {
		const wager = this.wager;
		this.wager = null;
		this.hide();
		if (!await StoryMode.startTournamentMatch(wager))
			this.show();
	},

	wagerSection() {
		const crowns = StoryMode.data.crowns;
		const set = wager => {
			this.wager = wager;
			this.renderPanel();
		};
		const option = (label, wager, disabled) => storyEl("button", {class: "btn-ghost story-small-btn", role: "radio", text: label, disabled,
			"aria-checked": JSON.stringify(this.wager) === JSON.stringify(wager) ? "true" : "false", onclick: () => set(wager)});
		const stakeable = StoryMode.stakeableCards();
		const card = this.wager?.card;
		return [
			storyEl("h3", {text: t("Wager")}),
			storyEl("div", {class: "story-wager", role: "radiogroup", "aria-label": t("Wager")},
				option(t("None"), null, false),
				[10, 25, 50].map(n => option(t("{n} crowns", {n}), {crowns: n}, crowns < n)),
				storyEl("button", {class: "btn-ghost story-small-btn", role: "radio", disabled: !stakeable.length,
					"aria-checked": card !== undefined ? "true" : "false",
					text: card !== undefined ? card_dict[card].name : t("A card\u2026"),
					onclick: () => this.pickStake(stakeable)})),
			storyEl("p", {class: "story-dim", text: this.wager?.crowns ? t("Win to double your stake; lose and it's gone.")
				: card !== undefined ? t("Win to keep it and take a card from their deck; lose and it's gone.")
				: this.view.kind === "tournament" ? t("Stake crowns or a spare card on this match.") : t("Stake crowns or a spare card on this rematch.")})
		];
	},

	pickStake(stakeable) {
		const container = new CardContainer();
		container.cards = stakeable.map(i => Object.assign(new Card(card_dict[i], player_me), {index: i}));
		ui.queueCarousel(container, 1, (c, i) => {
			this.wager = {card: c.cards[i].index};
			this.renderPanel();
		}, () => true, true, true, t("Choose a card to stake"));
	},

	async challenge(id) {
		const opp = StoryMode.opponent(id);
		const progress = StoryMode.progressOf(id);
		if (!progress.seen) {
			await this.dialogue(opp, "intro");
			progress.seen = true;
		}
		StoryMode.data.last = id;
		StoryMode.commit();
		const wager = this.wager;
		this.wager = null;
		this.hide();
		if (!await StoryMode.startMatch(id, wager))
			this.show();
	},

	// ---------- dialogue ----------

	// Fixed speakers besides the opponent: [name, portrait art]
	SPEAKERS: {
		narrator: ["Dandelion", "neutral_dandelion"],
		geralt: ["Geralt", "neutral_geralt"],
		ciri: ["Ciri", "neutral_ciri"]
	},

	// A chapter's epigraph and opening narration (no opponent speaks in it)
	chapterOpener(chapter) {
		const lines = [chapter.epigraph && {who: "chronicle", ...chapter.epigraph}, ...chapter.opener ?? []].filter(Boolean);
		return this.dialogue({name: chapter.name, dialogue: {opener: lines}}, "opener");
	},

	// Plays an opponent's intro/win/loss lines; resolves when they end or are skipped
	dialogue(opp, part) {
		const lines = opp.dialogue?.[part] ?? [];
		if (!lines.length || !this.isOpen())
			return Promise.resolve();
		const portrait = document.getElementById("story-dialogue-portrait");
		const name = document.getElementById("story-dialogue-name");
		const text = document.getElementById("story-dialogue-text");
		document.getElementById("story-dialogue-hint").textContent = matchMedia("(pointer: coarse)").matches ? t("Tap to continue") : t("Click or press Enter to continue");
		document.getElementById("story-dialogue-guide").classList.toggle("hide", !(opp.guide && part === "intro"));
		return new Promise(resolve => {
			let i = 0;
			const show = () => {
				const line = lines[i];
				const narrator = line.who === "narrator";
				const chronicle = line.who === "chronicle";
				const speaker = this.SPEAKERS[line.who];
				this.dlg.classList.toggle("narrator", narrator);
				this.dlg.classList.toggle("chronicle", chronicle);
				name.textContent = chronicle ? StoryMode.text(line.source) : speaker ? t(speaker[0]) : t(opp.name);
				portrait.style.setProperty("--art", chronicle ? "none" : speaker ? StoryMode.artURL("lg/" + speaker[1] + ".jpg") : StoryMode.portraitArt(opp));
				portrait.style.animation = "none";
				void portrait.offsetWidth;
				portrait.style.animation = "";
				text.textContent = StoryMode.text(line);
				ui.announce((name.textContent ? name.textContent + ": " : "") + text.textContent);
			};
			const finish = () => {
				this.dlg.classList.add("hide");
				this.dialogueState = null;
				resolve();
			};
			this.dialogueState = {
				next: () => {
					AudioManager.playSFX("ui_card");
					if (++i >= lines.length)
						finish();
					else
						show();
				},
				finish
			};
			show();
			this.dlg.classList.remove("hide");
			document.getElementById("story-dialogue-box").focus();
		});
	},

	// ---------- modals ----------

	openModal(...children) {
		this.modalBox.className = "";
		this.modalBox.replaceChildren(...children.filter(Boolean));
		this.modal.classList.remove("hide");
		this.modalBox.scrollTop = 0;
		AudioManager.playSFX("open");
		return new Promise(resolve => this.modalDone = resolve);
	},

	closeModal() {
		if (this.modal.classList.contains("hide"))
			return;
		this.modal.classList.add("hide");
		this.modalDone?.();
		this.modalDone = null;
		this.render();
	},

	masterBadge(always = false) {
		return (always || StoryMode.isMaster()) && storyEl("p", {class: "story-master", text: "\u2605 " + t("Gwent Master")});
	},

	// Dandelion's scene and the title card for 4 stars on every battle
	async showMaster(added) {
		await this.dialogue({dialogue: {master: campaign.master}}, "master");
		const done = this.openModal(
			storyEl("div", {class: "story-result-title"}, storyEl("h2", {text: t("Gwent Master")}),
				storyEl("p", {class: "story-kicker", text: t("Every battle won with all four stars")})),
			this.masterBadge(true),
			storyEl("div", {class: "story-result-notes"},
				storyEl("p", {class: "story-dim", text: added ? t("{n} missing cards were added to your collection. It is now complete.", {n: added}) : t("Your collection was already complete.")}),
				storyEl("p", {class: "story-dim", text: t("Your title now appears next to your name in every match, online too.")})),
			this.closeButton(t("Continue")));
		this.modalBox.classList.add("result");
		AudioManager.playSFX("game_win");
		setTimeout(() => fx.burst(this.modalBox.querySelector(".story-master"), "gold"), 300);
		return done;
	},

	closeButton(text = t("Close")) {
		return storyEl("div", {class: "story-buttons"}, storyEl("button", {class: "btn-gold", text, onclick: () => this.closeModal()}));
	},

	showResult(result, opp) {
		const run = result.tournament;
		const tour = run && StoryMode.tournament(run.id);
		const title = result.won ? t("Victory") : result.draw ? t("Draw") : t("Defeat");
		const lines = [];
		for (const c of result.cards.filter(c => !c.added))
			lines.push(storyEl("p", {class: "story-dim", text: t("{name} was already in your collection: +{n} crowns", {name: card_dict[c.index].name, n: c.crowns})}));
		if (result.unlocked)
			lines.push(storyEl("p", {class: "story-warn", text: t("New faction unlocked: {name}. Its starter deck is ready in the deck builder.", {name: t(factions[result.unlocked].name)})}));
		if (result.wager?.crowns)
			lines.push(storyEl("p", {class: "story-dim", text: result.wager.won ? t("Wager won: +{n} crowns", {n: result.wager.returned}) : result.draw ? t("Wager returned") : t("Wager lost: {n} crowns", {n: result.wager.crowns})}));
		else if (result.wager?.card !== undefined)
			lines.push(storyEl("p", {class: "story-dim", text: result.wager.kept ? t("You keep {name}.", {name: card_dict[result.wager.card].name}) : t("Wager lost: {name}", {name: card_dict[result.wager.card].name})}));
		if (!result.won && !result.draw && !tour)
			lines.push(storyEl("p", {class: "story-dim", text: t("Losing costs nothing. Adjust your deck and try again.")}));
		const rewards = [
			result.crowns > 0 && storyEl("figure", {class: "story-result-coin"},
				storyEl("span", {class: "story-coin", "aria-hidden": "true"}),
				storyEl("figcaption", {text: t("+{n} crowns", {n: result.crowns})})),
			...result.cards.filter(c => c.added).map(c => storyEl("figure", {},
				this.cardThumb(c.index),
				storyEl("figcaption", {text: card_dict[c.index].name})))
		].filter(Boolean);
		let stars;
		if (tour) {
			stars = storyEl("p", {class: "story-result-round" + (run.champion ? " champion" : ""), text: run.champion ? t("Champion of the {name}!", {name: t(tour.name)})
				: run.eliminated ? t("Eliminated in round {n}.", {n: run.round})
				: result.draw ? t("A draw: round {n} will be replayed.", {n: run.round})
				: t("Round {n} of {total} won.", {n: run.round, total: run.rounds})});
		} else {
			const progress = StoryMode.progressOf(result.id);
			stars = storyEl("div", {class: "story-result-stars"}, StoryMode.objectiveLabels(opp, result.id).map((l, i) =>
				storyEl("div", {class: [progress.stars[i] && "earned", result.starsNew?.[i] && "new", i === 3 && "secret"].filter(Boolean).join(" "), text: l})));
		}
		const done = this.openModal(
			storyEl("div", {class: "story-result-title" + (result.won ? "" : " lose")}, storyEl("h2", {text: title}),
				storyEl("p", {class: "story-kicker", text: t(opp.name) + (tour ? " \u00b7 " + t(tour.name) : "")})),
			stars,
			rewards.length > 0 && storyEl("section", {class: "story-result-rewards"}, storyEl("h3", {text: t("Rewards")}), storyEl("div", {}, rewards)),
			lines.length > 0 && storyEl("div", {class: "story-result-notes"}, lines),
			this.closeButton(t("Continue")));
		this.modalBox.classList.add("result");
		stars.querySelectorAll(".new").forEach((s, i) => setTimeout(() => fx.burst(s, "gold"), 300 + i * 250));
		if (run?.champion)
			setTimeout(() => fx.burst(stars, "gold"), 300);
		return done;
	},

	// Dandelion's epilogue, then a closing card with the player's totals
	async showCredits(opp) {
		this.creditsPlaying = true;
		ui.setMusicTrack("farewell-old-friend");
		await this.dialogue(opp, "credits");
		const data = StoryMode.data;
		const total = card_dict.reduce((a, c, i) => a + StoryMode.maxCopies(i), 0);
		const owned = Object.values(data.collection).reduce((a, n) => a + n, 0);
		const stars = Object.values(data.progress).reduce((a, p) => a + p.stars.filter(Boolean).length, 0);
		const row = (label, value) => [storyEl("dt", {text: label}), storyEl("dd", {text: String(value)})];
		const done = this.openModal(
			storyEl("div", {class: "story-result-title"}, storyEl("h2", {text: t("The End")}), storyEl("p", {class: "story-kicker", text: t("Path of the Witcher")})),
			this.masterBadge(StoryMode.allStars()),
			storyEl("dl", {class: "story-stats story-credits-stats"},
				row(t("Wins"), data.stats.wins), row(t("Losses"), data.stats.losses), row(t("Stars"), stars),
				row(t("Tournaments won"), data.stats.tournamentsWon), row(t("Crowns earned"), data.stats.crownsEarned),
				row(t("Collection"), Math.floor(100 * owned / total) + "%")),
			storyEl("p", {class: "story-dim", text: t("Thank you for playing. Rematches and tournaments stay open on the map.")}),
			this.closeButton(t("Continue")));
		this.modalBox.classList.add("result");
		AudioManager.playSFX("game_win");
		await done;
		this.creditsPlaying = false;
		this.mapMusic();
	},

	openShop() {
		const shop = StoryMode.shop();
		const crowns = StoryMode.data.crowns;
		const grid = storyEl("div", {class: "story-grid"}, shop.stock.map(i => {
			const price = StoryMode.price(i);
			const maxed = StoryMode.owned(i) >= StoryMode.maxCopies(i);
			return storyEl("figure", {},
				this.cardThumb(i),
				storyEl("figcaption", {text: card_dict[i].name + " (" + StoryMode.owned(i) + "/" + StoryMode.maxCopies(i) + ")"}),
				storyEl("button", {class: "btn-gold", text: maxed ? t("Owned") : t("Buy \u00b7 {n}", {n: price}), disabled: maxed || crowns < price, onclick: () => {
					if (StoryMode.buy(i)) {
						AudioManager.playSFX("ui_card_bank");
						this.openShop();
						this.render();
					}
				}}));
		}));
		const left = shop.refreshAt - StoryMode.data.matches;
		return this.openModal(
			storyEl("h2", {text: t("Card Trader")}),
			storyEl("p", {class: "story-kicker story-shop-wallet"},
				storyEl("span", {class: "story-coin", "aria-hidden": "true"}),
				storyEl("b", {text: t("{n} crowns", {n: crowns})}),
				" \u00b7 " + (left === 1 ? t("New stock after the next match") : t("New stock in {n} matches", {n: left}))),
			shop.stock.length ? grid : storyEl("p", {class: "story-dim", text: t("Sold out. Come back after a few matches.")}),
			this.closeButton());
	},

	openCollection(tab = StoryMode.data.activeFaction) {
		const tabs = [...StoryMode.FACTIONS, "neutral"];
		const cards = card_dict.map((c, i) => i).filter(i => {
			const c = card_dict[i];
			return StoryMode.maxCopies(i) > 0 && (tab === "neutral" ? ["neutral", "special", "weather"].includes(c.deck) : c.deck === tab);
		}).sort((a, b) => {
			const x = card_dict[a], y = card_dict[b];
			return (x.row === "leader") - (y.row === "leader") || Number(y.strength || 0) - Number(x.strength || 0) || x.name.localeCompare(y.name);
		});
		const total = card_dict.reduce((a, c, i) => a + StoryMode.maxCopies(i), 0);
		const owned = Object.values(StoryMode.data.collection).reduce((a, n) => a + n, 0);
		this.modalBox.replaceChildren();
		const content = [
			storyEl("h2", {text: t("Collection")}),
			storyEl("p", {class: "story-kicker", text: t("{n} of {total} cards ({p}%)", {n: owned, total, p: Math.floor(100 * owned / total)})}),
			storyEl("div", {class: "story-tabs", role: "tablist"}, tabs.map(f => storyEl("button", {
				class: "btn-ghost story-small-btn", role: "tab", "aria-selected": f === tab ? "true" : "false",
				text: f === "neutral" ? t("Neutral & Special") : t(factions[f].name) + (StoryMode.isUnlocked(f) ? "" : " \uD83D\uDD12"),
				onclick: () => this.openCollection(f)}))),
			storyEl("div", {class: "story-grid"}, cards.map(i => storyEl("figure", {},
				this.cardThumb(i, !StoryMode.owned(i)),
				storyEl("figcaption", {text: StoryMode.owned(i) + "/" + StoryMode.maxCopies(i)})))),
			this.closeButton()
		];
		if (!this.modal.classList.contains("hide")) {
			this.modalBox.replaceChildren(...content.filter(Boolean));
			return;
		}
		return this.openModal(...content);
	},

	openStats() {
		const s = StoryMode.data.stats;
		const played = s.wins + s.losses;
		const tile = (label, value) => storyEl("div", {}, storyEl("b", {text: String(value)}), storyEl("span", {text: label}));
		const faction = f => {
			const ids = card_dict.map((c, i) => i).filter(i => card_dict[i].deck === f && StoryMode.maxCopies(i));
			const max = ids.reduce((a, i) => a + StoryMode.maxCopies(i), 0);
			const owned = ids.reduce((a, i) => a + StoryMode.owned(i), 0);
			const p = Math.floor(100 * owned / max);
			return storyEl("li", {class: p === 100 ? "complete" : ""},
				storyEl("span", {class: "story-stats-shield", style: {"background-image": `url("img/icons/deck_shield_${f}.png")`}}),
				storyEl("span", {text: t(factions[f].name)}),
				storyEl("span", {class: "story-stats-bar", role: "progressbar", "aria-valuenow": p, "aria-valuemin": 0, "aria-valuemax": 100,
					style: {"--p": p + "%"}}),
				storyEl("span", {class: "story-stats-count", text: owned + "/" + max}),
				storyEl("b", {text: p + "%"}));
		};
		const done = this.openModal(
			storyEl("h2", {text: t("Stats")}),
			this.masterBadge(),
			storyEl("div", {class: "story-stats-tiles"},
				tile(t("Wins"), s.wins), tile(t("Losses"), s.losses),
				tile(t("Win rate"), played ? Math.round(100 * s.wins / played) + "%" : "\u2013"),
				tile(t("Stars"), Object.values(StoryMode.data.progress).reduce((a, p) => a + p.stars.filter(Boolean).length, 0)),
				tile(t("Current streak"), s.streak), tile(t("Best streak"), s.bestStreak),
				tile(t("Tournaments won"), s.tournamentsWon), tile(t("Crowns earned"), s.crownsEarned)),
			storyEl("h3", {text: t("Collection")}),
			storyEl("ul", {class: "story-stats-collection"}, StoryMode.FACTIONS.map(faction)),
			this.closeButton());
		this.modalBox.classList.add("story-stats-box");
		return done;
	},

	openOptions() {
		return this.openModal(
			storyEl("h2", {text: t("Story Options")}),
			storyEl("p", {class: "story-dim", text: t("Your story progress is saved in this browser. Export a backup to keep it safe or move it to another device.")}),
			storyEl("div", {class: "story-buttons"},
				storyEl("button", {class: "btn-ghost", text: t("Export Save"), onclick: () => StoryMode.exportSave()}),
				storyEl("button", {class: "btn-ghost", text: t("Import Save"), onclick: () => document.getElementById("story-import-file").click()}),
				storyEl("button", {class: "btn-ghost", text: t("Reset Progress"), onclick: async () => {
					if (await StoryMode.reset()) {
						this.view = {kind: "journal"};
						this.closeModal();
						StoryMode.playOpeners();
					}
				}})),
			this.closeButton());
	}
};

StoryMode.init();
StoryUI.init();
EventManager.roundStarted.bind(e => {
	if (game.story && e.detail.round === 1)
		game.story.wentFirst = e.detail["starting-player"] === player_me;
});
document.getElementById("title-story").addEventListener("click", () => {
	closeTitleScreen();
	document.getElementById("deck-customization").classList.add("hide");
	StoryUI.view = {kind: "journal"};
	StoryMode.openMap();
}, false);
