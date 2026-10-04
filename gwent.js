"use strict"

class Enum {constructor(val){this.val = val;} toString(){return this.val;}};

const DURATION_CARD_PLACEMENT = 1000;

const DUR_FADE_STEP = 10;

const CLICK_EVENT_SFX = () => AudioManager.playSFX('ui_card');

const addMouseEnterSFXBySelector = selector => {
	[...document.querySelectorAll(selector)].forEach(e =>
	e.addEventListener('mouseenter', CLICK_EVENT_SFX));
};

// Makes a clickable non-button element keyboard focusable; Enter/Space is handled globally via role=button
function makeAccessible(elem, label) {
	if (!elem)
		return;
	elem.tabIndex = 0;
	elem.setAttribute("role", "button");
	if (label)
		elem.setAttribute("aria-label", label);
}

class Controller {}

// Plays the moves sent by the online opponent
class ControllerRemote {
	async startTurn(player){
		await Online.remoteTurn(player);
	}
}

// Makes decisions for an AI-controlled player (either side of the board)
class ControllerAI {
	// easy: no mulligan, often plays a random viable option; normal: weighted random; hard: plays for card advantage across rounds;
	// (hard caps the player's unit strength and heroes); expert: hard, but with tighter caps
	static difficulties = {
		easy: {label: "Easy", redraws: 0, randomChance: 0.5},
		normal: {label: "Normal", redraws: 2, randomChance: 0},
		hard: {label: "Hard", redraws: 2, randomChance: 0, strategic: true, deckLimits: {strength: 180, hero: 4}},
		expert: {label: "Expert", redraws: 2, randomChance: 0, strategic: true, deckLimits: {strength: 130, hero: 3}}
	};
	
	// Leader abilities that score no points: the first return a unit to hand, the rest only reshape hands, decks or turns
	static drawLeaders = ["emhyr_relentless", "eredin_bringer_of_death"];
	static utilityLeaders = ["emhyr_emperor", "eredin_destroyer", "crach_an_craite"];
	
	static difficulty(level = Settings.aiDifficulty.get()) {
		return ControllerAI.difficulties[level] ?? ControllerAI.difficulties.normal;
	}
	
	// A player's close, ranged and siege rows
	static rowsOf(player) {
		const me = player === player_me;
		return {close: board.row[me ? 3 : 2], ranged: board.row[me ? 4 : 1], siege: board.row[me ? 5 : 0]};
	}
	
	constructor(player, level) {
		this.player = player;
		this.difficulty = ControllerAI.difficulty(level);
	}
	
	myRows() {
		return Object.values(ControllerAI.rowsOf(this.player));
	}
	
	// Points still needed to take the lead; ties go to a Nilfgaard deck facing another faction
	pointsToLead() {
		const me = this.player, op = me.opponent();
		const winsTies = me.deck.faction === "nilfgaard" && op.deck.faction !== "nilfgaard";
		return op.total - me.total + (winsTies ? 0 : 1);
	}
	
	// Rates every option, then picks one according to the difficulty
	async startTurn(player){
		if (player.opponent().passed && this.pointsToLead() <= 0) {
			await player.passRound();
			return;
		}
		const max = this.getMaximums();
		const data = this.getBoardData();
		const options = player.hand.cards.map(c => 
			({...this.rateCard(c, max, data), action: async () => await this.playCard(c, max, data)}) );
		if (player.leaderAvailable)
			options.push( {...this.rateLeader(player.leader, max, data), leader: true, action: async () => await player.activateLeader()} );
		const pass = {weight: this.weightPass(options), action: async () => await player.passRound()};
		const choice = this.difficulty.strategic ? this.chooseStrategic(options, pass) : this.chooseAction([...options, pass]);
		await (choice ?? pass).action();
	}
	
	// Easy/Normal: a weighted random option, which Easy often swaps for a uniformly random one
	chooseAction(options) {
		const viable = options.filter(o => o.weight > 0);
		if (!viable.length)
			return null;
		if (Math.random() < this.difficulty.randomChance)
			return viable[randomInt(viable.length)];
		let rand = Math.random() * viable.reduce((a, o) => a + o.weight, 0);
		for (const o of viable) {
			rand -= o.weight;
			if (rand < 0)
				return o;
		}
		return viable[viable.length - 1];
	}
	
	// Hard: takes free cards first, spends as little as possible to win rounds and gives up the ones that cost too much
	chooseStrategic(options, pass) {
		const me = this.player, op = me.opponent();
		const viable = options.filter(o => o.weight > 0);
		if (!viable.length)
			return pass;
		const need = this.pointsToLead();
		const mustWin = me.health === 1;
		const cardAdv = me.hand.cards.length - op.hand.cards.length;
		const advantage = viable.filter(o => o.advantage);
		const scoring = viable.filter(o => o.points > 0);
		const best = (list, key) => list.reduce((a, o) => o[key] > a[key] ? o : a);
		const cheapest = list => list.reduce((a, o) => o.value < a.value || o.value === a.value && o.points < a.points ? o : a);
		
		if (op.passed) {
			// Any cost is worth it when the round decides the game; otherwise keep enough cards for the next rounds
			const affordable = plan => plan && (mustWin || op.health === 1 || plan.cards <= Math.max(1, cardAdv + 2));
			const plan = this.cheapestPlan(scoring, need);
			if (!affordable(plan)) {
				if (mustWin && scoring.length)
					return best(scoring, "points");
				// The round is given up, but free cards are still worth taking
				return advantage.length ? best(advantage, "weight") : pass;
			}
			const spy = advantage.find(o => affordable(this.cheapestPlan(scoring.filter(s => s !== o), need - o.points)));
			return spy ?? best(plan.plays, "points");
		}
		// Final round: nothing left to save cards for
		if (mustWin && op.health === 1)
			return best(viable, "weight");
		if (advantage.length)
			return best(advantage, "weight");
		const ahead = need <= 0 && me.total > 0;
		const overtake = scoring.filter(o => o.points >= need);
		// Lost the first round: must win this one too, so keep pace with the cheapest cards that do it
		if (mustWin) {
			if (ahead)
				return cheapest(scoring.length ? scoring : viable);
			return overtake.length ? cheapest(overtake) : best(scoring.length ? scoring : viable, "points");
		}
		// Won the first round: the opponent must win this one, so make them pay for it unless a card lead can end the game
		if (op.health === 1)
			return !ahead && cardAdv >= 1 && overtake.length ? cheapest(overtake) : pass;
		// First round: stay ahead cheaply, and pass when the opponent would need more cards than it's worth to them
		if (ahead)
			return cardAdv >= 1 || -need >= 10 ? pass : cheapest(scoring.length ? scoring : viable);
		if (overtake.length)
			return cheapest(overtake);
		const plan = this.cheapestPlan(scoring, need);
		return plan && plan.cards <= 1 + Math.max(0, cardAdv) ? best(plan.plays, "points") : pass;
	}
	
	// The fewest cards (then least value spent) whose points together reach need; the leader costs no card
	cheapestPlan(plays, need) {
		plays = [...plays].sort((a, b) => b.points - a.points).slice(0, 12);
		let plan = null;
		for (let mask = 1; mask < 1 << plays.length; mask++) {
			const set = plays.filter((o, i) => mask & 1 << i);
			if (set.reduce((a, o) => a + o.points, 0) < need)
				continue;
			const cards = set.filter(o => !o.leader).length;
			const value = set.reduce((a, o) => a + o.value, 0);
			if (!plan || cards < plan.cards || cards === plan.cards && value < plan.value)
				plan = {plays: set, cards: cards, value: value};
		}
		return plan;
	}
	
	// Collects the strongest non-hero units of each row and of each side of the board
	getMaximums(){
		const rmax = board.row.map(r => ({row: r, cards: r.maxUnits()}));
		const mine = this.myRows();
		const strongest = rows => {
			const power = rows.reduce((a, r) => Math.max(a, r.cards[0]?.power ?? -1), -1);
			return rows.filter(r => r.cards[0]?.power === power).flatMap(r => r.cards.map(c => ({row: r.row, card: c})));
		};
		return {rmax: rmax, me: strongest(rmax.filter(r => mine.includes(r.row))), op: strongest(rmax.filter(r => !mine.includes(r.row)))};
	}
	
	// Collects data about the types of cards on this player's side of the board and in each player's grave
	getBoardData(){
		let data = this.countCards(new CardContainer());
		this.myRows().forEach(r => this.countCards(r, data));
		data.grave_me = this.countCards(this.player.grave);
		data.grave_op = this.countCards(this.player.opponent().grave);
		return data;
	}
	
	// Catalogs the kinds of cards in a given CardContainer
	countCards(container, data){
		data = data ? data : {spy: [], medic: [], bond: {}, scorch: []};
		container.cards.filter(c => c.isUnit()).forEach(c => {
			for (let x of c.abilities) {
				switch (x) {
					case "spy":
					case "medic":
						data[x].push(c);
						break;
					case "scorch_r": case "scorch_c": case "scorch_s":
						data["scorch"].push(c);
						break;
					case "bond":
						if (!data.bond[c.name])
							data.bond[c.name] = 0;
						data.bond[c.name]++;
				}
			}
		});
		return data;
	}
	
	// Swaps a card from the hand with the deck if beneficial
	redraw() {
		let card = this.discardOrder({holder:this.player})[0];
		if (!card) {
			const keep = ["spy", "medic", "muster", "bond", "scorch", "scorch_c", "scorch_r", "scorch_s", "avenger", "avenger_kambi", "berserker"];
			card = this.player.hand.cards
				.filter(c => c.isUnit() && c.basePower <= 5 && !c.abilities.some(a => keep.includes(a)))
				.sort((a, b) => a.basePower - b.basePower)[0];
		}
		if (card && card.power < 15) {
			this.player.deck.swap(this.player.hand, card);
		}
	}
	
	// Orders discardable cards from most to least discardable
	discardOrder(card) {
		let cards = [];
		let groups = {};
		let musters = card.holder.hand.cards.filter(c => c.abilities.includes("muster"));
		while (musters.length > 0) {
			let curr = musters.pop();
			let i = curr.name.indexOf('-');
			let name = i === -1 ? curr.name : curr.name.substring(0, i).trim();
			if (!groups[name])
				groups[name] = [];
			let group = groups[name];
			group.push(curr);
			for (let j=musters.length-1; j>=0; j--)
				if (musters[j].name.startsWith(name))
					group.push( musters.splice(j,1)[0] );
		}
		
		for (let group of Object.values(groups)) {
			group.sort(Card.compare);
			group.pop();
			cards.push(...group);
		}
		
		let weathers = card.holder.hand.cards.filter(c => c.row === "weather");
		if (weathers.length > 1){
			weathers.splice(randomInt(weathers.length), 1);
			cards.push(...weathers);
		}
		
		let normal = card.holder.hand.cards.filter(c => c.abilities.length === 0 && !c.hero);
		normal.sort(Card.compare);
		cards.push(...normal);
		return cards;
	}
	
	// The strongest non-spy unit in the deck, for abilities that pick a card from it
	bestDeckCard() {
		return this.player.deck.cards.filter(c => ["close", "ranged", "siege", "agile"].includes(c.row) && !c.abilities.includes("spy"))
			.reduce((a, c) => !a || c.basePower > a.basePower ? c : a, undefined);
	}
	
	// Tells the Player that this object controls to play a card
	async playCard(c, max, data){
		if (c.name === "Commander's Horn")
			await this.horn(c);
		else if (c.name === "Mardroeme")
			await this.mardroeme(c);
		else if (c.name === "Decoy")
			await this.decoy(c, max, data);
		else if (c.name === "Scorch")
			await this.scorch(c, max, data);
		else
			await this.player.playCard(c);
	}
	
	// Plays a Commander's Horn to the most beneficial row. Assumes at least one viable row.
	async horn(card){
		const rows = this.myRows();
		const gains = rows.map(r => this.hornGain(r));
		await this.player.playCardToRow(card, rows[gains.indexOf(Math.max(...gains))]);
	}
	
	// Plays a Mardroeme to the most beneficial row. Assumes at least one viable row.
	async mardroeme(card){
		const {ranged, close} = ControllerAI.rowsOf(this.player);
		await this.player.playCardToRow(card, this.weightMardroemeRow(card, ranged) > this.weightMardroemeRow(card, close) ? ranged : close);
	}
	
	// Selects a card to remove from a Grave. Assumes at least one valid card.
	medic(card, grave){
		let data = this.countCards(grave);
		let targ;
		if (data.spy.length){
			targ = data.spy.reduce((a, c) => c.power < a.power ? c : a);
		} else if (data.medic.length) {
			targ = data.medic.reduce((a, c) => c.power > a.power ? c : a);
		} else if (data.scorch.length) {
			targ = data.scorch[randomInt(data.scorch.length)];
		} else {
			let units = grave.findCards(c => c.isUnit());
			targ = units.reduce( (a,c) => a.power < c.power ? c : a, units[0] );
		}
		return targ;
	}
	
	// The unit a medic-like ability would take from owner's grave, if any
	reviveTarget(owner) {
		return owner.grave.findCard(c => c.isUnit()) ? this.medic(null, owner.grave) : undefined;
	}
	
	// Picks the unit a Decoy takes back: an enemy spy, a medic or scorch unit to reuse, else one of the strongest units
	decoyTarget(max, data) {
		if (data.spy.length)
			return data.spy.reduce((a, c) => c.power < a.power ? c : a);
		if (data.medic.length && this.reviveTarget(this.player))
			return data.medic[randomInt(data.medic.length)];
		if (data.scorch.length)
			return data.scorch[randomInt(data.scorch.length)];
		return max.me[randomInt(max.me.length)]?.card;
	}
	
	// Returns a unit to the Hand and replaces it with a Decoy. Assumes at least one valid card.
	async decoy(card, max, data) {
		const targ = this.decoyTarget(max, data);
		const row = board.row.find(r => r.cards.includes(targ));
		await this.player.playCardAction(card, async () => await Promise.all([
			board.toHand(targ, row),
			board.moveTo(card, row, this.player.hand)
		]));
	}
	
	// Tells the controlled Player to play the Scorch card
	async scorch(card, max, data){
		await this.player.playScorch(card);
	}

	// Gets the row that would be best for the passed agile card
	determineAgileRow(card)
	{
		const close = board.getRow(card, "close", card.holder);
		const ranged = board.getRow(card, "ranged", card.holder);
		const vClose = close.getVirtualCopy();
		const vRanged = ranged.getVirtualCopy();
		vClose.cards.push(card);
		vClose.updateState(card, true);
		vRanged.cards.push(card);
		vRanged.updateState(card, true);
		const dif = (vClose.calcScore() - close.calcScore()) - (vRanged.calcScore() - ranged.calcScore());
		return dif > 0 ? close : dif < 0 ? ranged : Math.random() >0.5 ? close : ranged; 
	}

	// Assigns a weight for how likely the controller is to pass the round (Easy/Normal)
	weightPass(options){
		const me = this.player, op = me.opponent();
		if (me.health === 1)
			return 0;
		const dif = op.total - me.total;
		const cardAdv = me.hand.cards.length - op.hand.cards.length;
		if (op.passed) {
			// Winning now ends the game, so only concede a deficit the hand can't cover
			if (op.health === 1)
				return dif >= options.reduce((a, o) => a + Math.max(0, o.points), 0) ? 100 : 0;
			// startTurn already passes when ahead: concede only big deficits
			return dif > 15 + 5 * Math.max(0, cardAdv) ? 100 : 0;
		}
		if (Math.abs(dif) > 30)
			return 100;
		if (dif <= 0)
			return Math.floor(-dif + 5 * Math.max(0, cardAdv));
		// Conceding a round is only worth it when it preserves a card advantage
		return Math.floor(cardAdv > 0 ? dif + 5 * cardAdv : dif * 0.3);
	}
	
	// Rates activating the leader like a card (see rateCard). It costs no card, so it's cheap to use.
	rateLeader(card, max, data) {
		const ability = card.abilities[0];
		const weight = Math.max(0, ability_dict[ability].weight?.(card, this, max, data) ?? 0);
		const draws = ControllerAI.drawLeaders.includes(ability);
		const points = draws || ControllerAI.utilityLeaders.includes(ability) ? 0 : weight;
		return {weight: weight, points: points, value: draws ? 0 : 3, advantage: draws && weight > 0};
	}
	
	// Assigns a weight for how likely the controller will use a scorch-row card
	weightScorchRow(card, max, row_name) {
		const row = ControllerAI.rowsOf(this.player.opponent())[row_name];
		if (row.total < 10)
			return 0;
		return max.rmax[board.row.indexOf(row)].cards.reduce((a,c) => a + c.power, 0);
	}
	
	// Calculates a weight for how likely the controller will use a horn (card or leader) on this row
	weightHornRow(card, row){
		return this.hornGain(row);
	}
	
	// Points a Commander's Horn effect would add to a row; one per row, so none if its special slot is taken
	hornGain(row){
		if (row.special !== null)
			return 0;
		const dif = [0, 0];
		this.calcRowPower(row, dif, true);
		row.effects.horn++;
		this.calcRowPower(row, dif, false);
		row.effects.horn--;
		return dif[1] - dif[0];
	}
	
	// Calculates weight for playing a card on a given row, min 0
	weightRowChange(card, row){
		return Math.max(0, this.weightRowChangeTrue(card, row));
	}
	
	// Calculates weight for playing a card on the given row
	weightRowChangeTrue(card, row) {
		let dif = [0,0];
		this.calcRowPower(row, dif, true);
		row.updateState(card, true);
		this.calcRowPower(row, dif, false);
		if (!card.isSpecial())
			dif[0] -= row.calcCardScore(card);
		row.updateState(card, false);
		return dif[1] - dif[0];
	}
	
	// Calculates the weight for playing a weather card: the opponent's loss minus this player's
	weightWeather(card) {
		const types = Object.values(weather.types);
		// Skellige Storm carries several weather types
		const rows = card.name === "Clear Weather"
			? types.filter(t => t.count > 0).flatMap(t => t.rows)
			: types.filter(t => t.count === 0 && card.abilities.includes(t.name)).flatMap(t => t.rows);
		let dif = [0,0];
		rows.forEach( r => {
			let state = r.effects.weather;
			this.calcRowPower(r, dif, true);
			r.effects.weather = !state;
			this.calcRowPower(r, dif, false);
			r.effects.weather = state;
		});
		return dif[1] - dif[0];
	}
	
	// Calculates the weight for playing a mardroeme card
	weightMardroemeRow(card, row){
		if (card.name === "Mardroeme" && row.special !== null)
			return 0;
		const {ranged, close} = ControllerAI.rowsOf(card.holder);
		const hand = card.holder.hand.cards;
		if (card.name !== "Ermion" && row === ranged && hand.some(c => c.name === "Ermion"))
			return 0;
		const n = row.cards.filter(c => c.name === (row === ranged ? "Young Berserker" : "Berserker")).length;
		if (!n && !hand.some(c => c.abilities.includes("berserker")))
			return 0;
		return Math.max(1, row === close ? 10*n : 8*n*n - 2*n);
	}
	
	// Weighs reviving owner's best grave unit (to the board, or to hand for leaders) on top of the card's own score
	weightMedic(data, score, owner){
		const targ = this.reviveTarget(owner);
		if (!targ)
			return Math.min(1, score);
		const grave = owner === this.player ? data.grave_me : data.grave_op;
		return score + targ.basePower + (grave.spy.length ? 50 : grave.medic.length ? 15 : grave.scorch.length ? 10 : 0);
	}
	
	// Calculates the weight for cards with the berserker ability
	weightBerserker(card, row, score){
		if (card.holder.hand.cards.filter(c => c.abilities.includes("mardroeme")).length < 1 && !row.effects.mardroeme > 0)
			return score;
		score -= card.basePower;
		if (card.row === "close")
			score += 14;
		else {
			let n = 0;
			if (!row.effects.mardroeme)
				n = row.cards.filter(c => c.name === "Young Berserker").length;
			else
				n = row.cards.filter(c => c.name === "Transformed Young Vildkaarl").length;
			score = 8*((n+1)*(n+1) - n*n) + n*score;
		}
		return Math.max(1, score);
	}
	
	// Calculates the weight for a leader playing a weather card from the deck (Skellige Storm's first ability is "storm")
	weightWeatherFromDeck(card, weather_id) {
		const found = card.holder.deck.findCard(c => c.row === "weather" && c.abilities[0] === weather_id);
		return found ? Math.max(0, this.weightWeather(found)) : 0;
	}
	
	weightCard(card, max, data){
		return this.rateCard(card, max, data).weight;
	}
	
	// Rates playing a card: points = immediate change in the score difference, weight = desirability,
	// value = what the card is worth if kept for later, advantage = it gains cards rather than points
	rateCard(card, max, data){
		// Specials are kept for when they swing the most, so they count as worth at least base points
		const rated = (points, base, weight = points, advantage = false) => 
			({points: points, value: Math.max(points, base), weight: Math.max(0, weight), advantage: advantage});
		if (card.name === "Decoy") {
			const targ = this.decoyTarget(max, data);
			const weight = !targ ? 0 : data.spy.includes(targ) ? 50 : data.medic.includes(targ) ? 15 : data.scorch.includes(targ) ? 10 : 1;
			return rated(targ ? -targ.power : 0, 8, weight, data.spy.includes(targ));
		}
		if (card.name === "Commander's Horn")
			return rated(Math.max(0, ...this.myRows().map(r => this.hornGain(r))), 18);
		if (card.name === "Scorch")
			return rated(this.scorchGain(max), 12);
		if (card.name === "Mardroeme") {
			const {ranged, close} = ControllerAI.rowsOf(this.player);
			return rated(Math.max(this.weightMardroemeRow(card, ranged), this.weightMardroemeRow(card, close)), 10);
		}
		if (card.row === "weather")
			return rated(this.weightWeather(card), 8);
		
		const row = card.row === "agile" ? this.determineAgileRow(card) : board.getRow(card, card.row, this.player);
		let points = row.calcCardScore(card);
		let weight, advantage = false, extraValue = card.hero ? 2 : 0;
		const ability = card.abilities[card.abilities.length - 1];
		switch(ability)
		{
			case "bond": 
			case "morale":
			case "horn":
				points = this.weightRowChange(card, row); break;
			case "medic": {
				const targ = this.reviveTarget(this.player);
				weight = this.weightMedic(data, points, this.player);
				// A revived spy lands on the opponent's side
				advantage = !!targ?.abilities.includes("spy");
				points += !targ ? 0 : advantage ? -targ.basePower : targ.basePower;
				extraValue += 3;
				break;
			}
			case "spy": {
				// points is the strength handed to the opponent; value comes from the 2 draws
				const cardAdv = this.player.hand.cards.length - this.player.opponent().hand.cards.length;
				advantage = this.player.deck.cards.length > 0;
				weight = !advantage ? 1 : Math.max(1, 20 + 5 * Math.max(0, -cardAdv) + (game.roundCount < 3 ? 5 : 0) - points);
				return rated(-points, 0, weight, advantage);
			}
			case "muster": points += this.musterPoints(card); break;
			case "scorch": points += this.scorchGain(max); break;
			case "scorch_c": points += this.weightScorchRow(card, max, "close"); break;
			case "scorch_r": points += this.weightScorchRow(card, max, "ranged"); break;
			case "scorch_s": points += this.weightScorchRow(card, max, "siege"); break;
			case "mardroeme": points += this.weightMardroemeRow(card, row); break;
			case "berserker":
				points = this.weightBerserker(card, row, points); break;
			case "avenger": case "avenger_kambi": {
				// Its summon arrives when it leaves the board, usually at the end of the round
				const summon = ability_dict[ability].weight();
				return rated(points, 0, points + summon, summon > 0);
			}
		}
		return rated(points, card.basePower + extraValue, weight ?? points, advantage);
	}
	
	// Points of the units a muster card summons from the deck
	musterPoints(card) {
		const group = ability_dict["muster"].group(card);
		return this.player.deck.cards.filter(c => c.name.startsWith(group))
			.reduce((a, c) => a + board.getRow(c, c.row === "agile" ? "close" : c.row, this.player).calcCardScore(c), 0);
	}
	
	// Points swing of a Scorch, which destroys the strongest non-hero units on the whole board
	scorchGain(max) {
		const power = max.me.concat(max.op).reduce((a, x) => Math.max(a, x.card.power), 0);
		const burnt = side => side.filter(x => x.card.power === power).length * power;
		return burnt(max.op) - burnt(max.me);
	}
	
	// Calculates the current power of a row associated with each Player
	calcRowPower(r, dif, add){
		r.findCards(c => c.isUnit()).forEach(c => {
			let p = r.calcCardScore(c); 
			c.holder === this.player ? (dif[0]+= add ? p : -p) : (dif[1]+= add ? p : -p);
		});
	}
}

// Can make actions during turns like playing cards that it owns
class Player {
	// id 0 is the bottom (human) player; the top player is an AI unless human is true (pass and play)
	// online = {seat, rng, remote}: seat is shared by both clients, rng is that seat's seeded stream
	constructor(id, name, deck, human = id === 0, online = null) {
		this.id = id;
		this.tag = (id === 0) ? "me" : "op";
		this.name = name;
		this.seat = online?.seat ?? id;
		this.rng = online?.rng ?? Math.random;
		this.controller = online?.remote ? new ControllerRemote() : human ? new Controller() : new ControllerAI(this);
		
		this.hand = !this.isHuman() ? new HandAI() : new Hand(document.getElementById(id === 0 ? "hand-row" : "hand-row-op"), this.tag);
		this.grave =  new Grave( document.getElementById("grave-" + this.tag));
		this.deck = new Deck(deck.faction, document.getElementById("deck-" + this.tag));
		this.deck.rng = this.rng;
		this.deck_data = deck;
		if (this.hand instanceof HandAI)
			this.hand.hidden_elem.style.setProperty("--card-back", absoluteIconURL("deck_back_" + deck.faction, "jpg"));
		
		this.leader = new Card(deck.leader, this);
		this.leader.uid = this.seat + "-L";
		this.elem_leader = document.getElementById("leader-" + this.tag);
		makeAccessible(this.elem_leader, id === 0 && !human ? "Your leader" : human ? name + "'s leader" : "Opponent's leader");
		this.elem_leader.children[0].replaceChildren( this.leader.elem );

		this.reset();
		
		document.getElementById("name-" + this.tag).textContent = name;
		
		document.getElementById("deck-name-" +this.tag).innerHTML = factions[deck.faction].name;
		document.getElementById("stats-" + this.tag).getElementsByClassName("profile-img")[0].children[0].children[0];
		let x = document.querySelector("#stats-" +this.tag+ " .profile-img > div > div");
		x.style.backgroundImage = iconURL("deck_shield_" + deck.faction);
	}
	
	// Sets default values
	reset(){
		this.grave.reset();
		this.hand.reset();
		this.deck.reset();
		this.deck.initializeFromID(this.deck_data.cards, this);
		
		this.health = 2;
		this.total = 0;
		this.passed = false;
		this.handsize = 10;
		this.winning = false;
	
		this.enableLeader();
		this.setPassed(false);
		document.getElementById("gem1-" +this.tag).classList.add("gem-on");
		document.getElementById("gem2-" +this.tag).classList.add("gem-on");
	}
	
	// Returns the opponent Player
	opponent(){
		return board.opponent(this);
	}
	
	// A human playing on this device
	isHuman(){
		return this.controller instanceof Controller;
	}
	
	isRemote(){
		return this.controller instanceof ControllerRemote;
	}
	
	// Updates the player's total score and notifies the gamee
	updateTotal(n){
		this.total += n;
		const scoreElem = document.getElementById("score-total-" + this.tag);
		scoreElem.children[0].innerHTML = this.total;
		if (n !== 0)
			fx.pulse(scoreElem);
		board.updateLeader();
	}
	
	// Puts the player in the winning state
	setWinning(isWinning) {
		if (this.winning ^ isWinning)
			document.getElementById("score-total-" + this.tag).classList.toggle("score-leader");
		this.winning = isWinning;
	}
	
	// Puts the player in the passed state
	setPassed(hasPassed) {
		if (this.passed ^ hasPassed)
			document.getElementById("passed-" + this.tag).classList.toggle("passed");
		this.passed = hasPassed;
	}
	
	// Sets up board for turn
	async startTurn(){
		document.getElementById("stats-" + this.tag).classList.add("current-turn");
		if (this.leaderAvailable)
			this.elem_leader.children[1].classList.remove("hide");
		
		if (this.isHuman()) {
			document.getElementById("pass-button").classList.remove("noclick");
		}
		
		if (this.controller.startTurn)
			await this.controller.startTurn(this);
		else if (Online.active)
			await Online.localTurn(this);
	}
	
	// Passes the round and ends the turn
	passRound(){
		this.setPassed(true);
		EventManager.roundPassed.dispatch(this, game.roundCount);
		this.endTurn();
	}
	
	// Plays a scorch card
	async playScorch(card){
		await this.playCardAction(card, async () => await ability_dict["scorch"].activated(card));
	}
	
	// Plays a card to a specific row
	async playCardToRow(card, row){
		await this.playCardAction(card, async () => await board.moveTo(card, row, this.hand));
	}
	
	// Plays a card to the board
	async playCard(card){
		await this.playCardAction(card, async () => await card.autoplay(this.hand));
	}
	
	// Shows a preview of the card being played, plays it to the board and ends the turn
	async playCardAction(card, action){
		const session = game.session;
		ui.showPreviewVisuals(card);
		await sleep(1000);
		if (session !== game.session)
			return;
		ui.hidePreview(card);
		await action();
		if (session === game.session)
			this.endTurn();
	}
	
	// Handles end of turn visuals and behavior the notifies the game
	endTurn(){
		if (!this.passed && !this.canPlay())
			this.setPassed(true);
		if (this.isHuman()){
			document.getElementById("pass-button").classList.add("noclick");
		}
		document.getElementById("stats-" + this.tag).classList.remove("current-turn");
		this.elem_leader.children[1].classList.add("hide");
		game.endTurn()
	}
	
	// Tells the the Player if it won the round. May damage health.
	endRound(win){
		if (!win) {
			if (this.health < 1)
				return;
			const gem = document.getElementById("gem" + this.health + "-" +this.tag);
			gem.classList.remove("gem-on");
			fx.flash(gem, "gem-break", 800);
			fx.burst(gem, "shard");
			this.health--;
		}
		this.setPassed(false);
		this.setWinning(false);
	}
	
	// Returns true if the Player can make any action other than passing
	canPlay() {
		return this.hand.cards.length > 0 || this.leaderAvailable;
	}
	
	// Use a leader's Activate ability, then disable the leader
	async activateLeader() {
		const session = game.session;
		ui.showPreviewVisuals(this.leader);
		await sleep(1500);
		if (session !== game.session)
			return;
		ui.hidePreview(this.leader);
		await this.leader.activated[0](this.leader, this);
		if (session !== game.session)
			return;
		this.disableLeader();
		this.endTurn();
	}
	
	// Disable access to leader ability and toggles leader visuals to off state
	disableLeader(){
		this.leaderAvailable = false;
		let elem = this.elem_leader.cloneNode(true);
		this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
		this.elem_leader = elem;
		this.elem_leader.children[0].classList.add("fade");
		this.elem_leader.children[1].classList.add("hide");
		this.elem_leader.addEventListener("click", async () => await ui.viewCard(this.leader), false);
		this.elem_leader.addEventListener('mouseenter', CLICK_EVENT_SFX);
		this.elem_leader.children[0].setAttribute('data-title', "View leader");
	}
	
	// Enable access to leader ability and toggles leader visuals to on state
	enableLeader() {
		this.leaderAvailable = this.leader.activated.length > 0;
		let elem = this.elem_leader.cloneNode(true);
		this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
		this.elem_leader = elem;
		this.elem_leader.children[0].classList.remove("fade");
		this.elem_leader.children[1].classList.remove("hide");
		
		if (this.isHuman() && this.leader.activated.length > 0){
			// Both leaders are clickable in pass and play; only the player whose turn it is may activate theirs
			this.elem_leader.addEventListener("click", 
				async () => await ui.viewCard(this.leader, game.currPlayer !== this ? undefined : async () => {
					AudioManager.playSFX('open');
					Online.commit(this, {a: "leader"});
					await this.activateLeader();
		}	), false);
			this.elem_leader.children[0].setAttribute('data-title', "Play leader");
		} else {
			this.elem_leader.addEventListener("click", async () => await ui.viewCard(this.leader), false);
		}
		this.elem_leader.addEventListener('mouseenter', CLICK_EVENT_SFX);
	}
	
}

// Handles the adding, removing and formatting of cards in a container
class CardContainer {
	constructor(elem) {
		this.elem = elem;
		this.cards = [];
	}
	
	// Returns the first card that satisfies the predcicate. Does not modify container.
	findCard(predicate){
		for (let i=this.cards.length-1; i>=0; --i)
			if (predicate(this.cards[i]))
				return this.cards[i];
	}
	
	// Returns a list of cards that satisfy the predicate. Does not modify container.
	findCards(predicate){
		return this.cards.filter(predicate);
	}
	
	// Returns a list of up to n cards that satisfy the predicate. Does not modify container.
	findCardsRandom(predicate, n, rng){
		let valid = predicate ? this.cards.filter(predicate) : [...this.cards];
		if (valid.length === 0)
			return [];
		// Container order differs between the two online clients
		if (Online.active)
			valid.sort(Card.byUid);
		if (!n || n === 1)
			return [valid[randomInt(valid.length, rng)]];
		let out = [];
		for (let i=Math.min(n, valid.length); i>0 ; --i){
			let index = randomInt(valid.length, rng);
			out.push( valid.splice(index,1)[0] );
		}
		return out;
	}
	
	// Removes and returns a list of cards that satisy the predicate.
	getCards(predicate){
		return this.cards.reduce((a,c,i) => ( predicate(c,i)?[i]:[] ).concat(a), []).map( i => this.removeCard(i));
	}
	
	// Removes and returns a card that satisfies the predicate.
	getCard(predicate) {
		for (let i=this.cards.length-1; i>=0; --i)
			if (predicate(this.cards[i]))
				return this.removeCard(i);
	}
	
	// Removes and returns any cards up to n that satisfy the predicate.
	getCardsRandom(predicate, n) {
		return this.findCardsRandom(predicate, n).map( c => this.removeCard(c) );
	}
	
	// Adds a card to the container along with its associated HTML element.
	addCard(card, index){
		if (!card)
			return;
		index = index ? clamp(0, this.cards.length, index) : 0;
		this.cards.splice(index, 0, card);
		this.addCardElement(card, index);
		this.resize();
	}
	
	// Removes a card from the container along with its associated HTML element.
	removeCard(card, index){
		if (this.cards.length === 0)
			throw "Cannot draw from empty " + this.constructor.name;
		card = this.cards.splice( isNumber(card)? card : this.cards.indexOf(card) , 1)[0];
		this.removeCardElement(card, index?index:0);
		this.resize();
		return card;
	}
	
	// Adds a card to a pre-sorted CardContainer
	addCardSorted(card){
		let i = this.getSortedIndex(card);
		this.cards.splice(i, 0, card);
		return i;
	}
	
	// Returns the expected index of a card in a sorted CardContainer
	getSortedIndex(card){
		for (var i=0; i<this.cards.length; ++i)
			if (Card.compare(card, this.cards[i]) < 0)
				break;
		return i;
	}
	
	// Adds a card to a random index of the CardContainer
	addCardRandom(card){
		this.cards.push(card);
		let index = randomInt(this.cards.length, this.rng);
		if (index !== this.cards.length-1) {
			let t = this.cards[this.cards.length-1];
			this.cards[this.cards.length-1] = this.cards[index];
			this.cards[index] = t;
		}
		return index;
	}
	
	// Removes the HTML elemenet associated with the card from this CardContainer
	removeCardElement(card, index){
		if (this.elem)
			this.elem.removeChild(card.elem);
	}
	
	// Adds the HTML elemenet associated with the card to this CardContainer
	addCardElement(card, index){
		if (this.elem){
			if (index === this.cards.length)
				this.elem.appendChild(card.elem);
			else
				this.elem.insertBefore(card.elem, this.elem.children[index]);
		}
	}
	
	// Empty function to be overried by subclasses that resize their content
	resize(){}
	
	// Modifies the margin of card elements inside a row-like container to stack properly
	resizeCardContainer(overlap_count, gap, coef) {
		let n = this.elem.children.length;
		let param = (n < overlap_count) ? "calc(" + gap + " * var(--u))" : defineCardRowMargin(n, coef);
		let children = this.elem.getElementsByClassName("card");
		for (let x of children)
			x.style.marginLeft = x.style.marginRight = param;
		
		function defineCardRowMargin(n, coef = 0){
			return "calc((100% - (var(--card-w) * " + n + ")) / (2*" +n+ ") - (" +coef+ " * var(--u) * " +n+ "))";
		}
	}
	
	// Allows the row to be clicked
	setSelectable(){
		this.elem.classList.add("row-selectable");
	}
	
	// Returns the container to its default, empty state
	reset() {
		while(this.cards.length)
			this.removeCard(0);
		if (this.elem)
			while(this.elem.firstChild)
				this.elem.removeChild(this.elem.firstChild);
		this.cards = [];
	}
	
}

// Contians all used cards in the order that they were discarded
class Grave extends CardContainer {
	constructor(elem) {
		super(elem)
		// Players are recreated each game; property assignment avoids stacking listeners on the shared element
		elem.onclick = () => ui.viewCardsInContainer(this);
	}
	
	// Override
	addCard(card){
		this.setCardOffset(card, this.cards.length);
		if (card && this.cards.length === 0)
		{
			this.elem.addEventListener('mouseenter', CLICK_EVENT_SFX);
		}
		super.addCard(card, this.cards.length);
	}
	
	// Override
	removeCard(card){
		let n = isNumber(card) ? card : this.cards.indexOf(card);
		if (n > -1 && this.cards.length === 1)
		{
			this.elem.removeEventListener('mouseenter', CLICK_EVENT_SFX);
		}
		return super.removeCard(card, n);
	}
	
	// Override
	removeCardElement(card, index){
		card.elem.style.left = "";
		super.removeCardElement(card, index);
		for (let i=index; i<this.cards.length; ++i){
//			if (!this.cards[i])
//				console.log(i, index, card, this.cards[i]);
			this.setCardOffset(this.cards[i], i);
		}
	}
	
	// Offsets the card element in the deck
	setCardOffset(card, n){
		card.elem.style.left = "calc(" + (-0.03 * n) + " * var(--u))";
	}

}

// Contains a randomized set of cards to be drawn from
class Deck extends CardContainer {
	constructor(faction, elem){
		super(elem);
		this.faction = faction;
		elem.style.setProperty("--card-back", absoluteIconURL("deck_back_" + faction, "jpg"));

		this.counter = document.createElement("div");
		this.counter.classList = "deck-counter center";
		this.counter.appendChild( document.createTextNode(this.cards.length) );
		this.elem.appendChild(this.counter);
	}
	
	// Creates duplicates of cards with a count of more than one, then initializes deck
	initializeFromID(card_id_list, player){
		this.initialize(Card.expandIDCounts(card_id_list), player);
	}
	
	// Populates a this deck with a list of card data and associated those cards with the owner of this deck.
	initialize(card_data_list, player){
		for (let i=0; i<card_data_list.length; ++i) {
			let card = new Card(card_data_list[i], player);
			card.uid = player.seat + "-" + i;
			this.addCardRandom(card);
			this.addCardElement();
		}
		this.resize();
	}
	
	// Override
	addCard(card){
		this.addCardRandom(card);
		this.addCardElement();
		this.resize();
	}
	
	// Sends the top card to the passed hand
	async draw(hand){
		if (this.cards.length === 0)
			return;
		if (!hand.isVisible())
			hand.addCard(this.removeCard(0));
		else
			await board.toHand(this.cards[0], this);
	}
	
	// Draws a card and sends it to the container before adding a card from the
	// container back to the deck.
	// NOTE: Used only in mulligan and adds card out of order
	swap(container, card){
		if (!card)
			return;
		const index = container.cards.indexOf(card);
		this.addCard(container.removeCard(card));
		const drawnCard = this.removeCard(0);
		container.addCard(drawnCard, index);
	}
	
	// Override
	addCardElement() {
		let elem = document.createElement("div");
		elem.classList.add("deck-card");
		elem.style.backgroundImage = iconURL("deck_back_" + this.faction, "jpg");
		this.setCardOffset(elem, this.cards.length-1);
		this.elem.insertBefore(elem, this.counter);
	}
	
	// Override
	removeCardElement(){
		this.elem.removeChild(this.elem.children[this.cards.length]).style.left = "";
	}
	
	// Offsets the card element in the deck
	setCardOffset(elem, n){
		elem.style.left = "calc(" + (-0.03 * n) + " * var(--u))";
	}
	
	// Override
	resize(){
		this.counter.innerHTML = this.cards.length;
		this.setCardOffset(this.counter, this.cards.length);
	}
	
	// Override
	reset() {
		super.reset();
		this.elem.appendChild(this.counter);
	}
}

// Hand used by computer AI. Has an offscreen HTML element for card transitions.
class HandAI extends CardContainer {
	constructor() {
		super(undefined);
		this.counter = document.getElementById("hand-count-op"); 
		this.hidden_elem = document.getElementById("hand-op");
	}
	isVisible() { return false; }
	resize() {this.counter.innerHTML = this.cards.length; }
}

// Hand of a human player. In pass and play only the active player's hand is shown.
class Hand extends CardContainer {
	constructor(elem, tag = "me"){
		super(elem);
		this.counter = document.getElementById("hand-count-" + tag);
	}
	
	isVisible() {
		return !this.elem.classList.contains("hide");
	}
	
	// Override. An explicit index keeps the card at that array position (mulligan); the DOM stays sorted.
	addCard(card, index){
		if (index === undefined)
			this.addCardSorted(card);
		else
			this.cards.splice(clamp(0, this.cards.length, index), 0, card);
		const sorted = [...this.cards].sort(Card.compare);
		const next = sorted[sorted.indexOf(card) + 1];
		this.elem.insertBefore(card.elem, next ? next.elem : null);
		this.resize();
	}
	
	// Restores sorted array order after index-preserving inserts
	sort(){
		this.cards.sort(Card.compare);
	}
	
	// Override
	resize() {
		this.counter.innerHTML = this.cards.length;
		this.resizeCardContainer(11, 0.075, .00225);
	}
}

// Contains active cards and effects. Calculates the current score of each card and the row.
class Row extends CardContainer {
	constructor(elem) {
		super(elem?.getElementsByClassName("row-cards")[0]);
		this.type = elem?.getAttribute('data-row');
		this.elem_parent = elem;
		this.elem_special = elem?.getElementsByClassName("row-special")[0];
		this.special = null;
		this.total = 0;
		this.effects = {weather:false, halfWeather: false, bond: {}, morale: 0, horn: 0, mardroeme: 0};
		this.elem?.addEventListener("click", () => ui.selectRow(this), true);
		this.elem_special?.addEventListener("click", () => ui.selectRow(this), false, true);
		if (elem) {
			const side = elem.parentElement.id === "field-op" ? "Opponent's" : "Your";
			makeAccessible(this.elem, side + " " + this.type + " row");
			makeAccessible(this.elem_special, side + " " + this.type + " row special slot");
		}
	}
	
	// Returns a copy of the row
	getVirtualCopy(predicate = c=>true)
	{
		const copy = new Row(null);
		copy.type = this.type;
		copy.effects = {...this.effects};
		copy.effects.bond = {...this.effects.bond};
		copy.cards = this.cards.filter(predicate);
		// remove status of filtered out cards
		this.cards.filter(c=>!predicate(c)).forEach(c=>copy.updateState(c, false));
		return copy;
	}
	
	// Override
	async addCard(card, silent = false) {
		if (card.isSpecial()) {
			this.special = card;
			this.elem_special.appendChild(card.elem);
		} else {
			let index = this.addCardSorted(card);
			this.addCardElement(card, index);
			this.resize();
			if (silent)
				await sleep(DURATION_CARD_PLACEMENT);
			else
				await this.playPlacementAudio(card);
		}
		this.updateState(card, true);
		game.placedEffectsActive = true;
		for (let x of card.placed) 
			await x(card, this);
		game.placedEffectsActive = false;
		card.elem.classList.add("noclick");
		await sleep(600);
		this.updateScore();
	}

	async playPlacementAudio(card)
	{
		let key;
		if (card.abilities.includes('spy') || card.abilities.includes('vildkarrl'))
			return;
		else if (card.abilities.includes('berserker') && this.effects.mardroeme >= 1)
			return;
		else if (card.abilities.includes('decoy'))
			key = 'decoy';
		else if (card.isHero())
		{
			key = "hero";
		}
		else
		{
			switch(this.type)
			{
				case "siege":
					key = "common_siege"; break;
				case "ranged":
					key = "common_ranged"; break;
				case "close":
					key = "common_close"; break;
				default:
					return;
			}
		}
		if (key)
		{
			return await AudioManager.playSFX(key, DURATION_CARD_PLACEMENT, true);
		}
	}
	
	// Override
	removeCard(card) {
		card = isNumber(card) ? card === -1 ? this.special : this.cards[card] : card;
		if (card.isSpecial()) {
			this.special = null;
			this.elem_special.removeChild(card.elem);
		} else {
			super.removeCard(card);
			card.resetPower();
		}
		this.updateState(card, false);
		for (let x of card.removed)
			x(card);
		this.updateScore();
		return card;
	}
	
	// Override
	removeCardElement(card, index) {
		super.removeCardElement(card, index);
		let x = card.elem;
		x.style.marginLeft = x.style.marginRight = "";
		x.classList.remove("noclick");
	}
	
	// Updates a card's effect on the row
	updateState(card, activate){
		for (let x of card.abilities){
			switch (x) {
				case "morale":
				case "horn":
				case "mardroeme": this.effects[x]+= activate ? 1 : -1; break;
				case "bond": 
					if (!this.effects.bond[card.id()])
						this.effects.bond[card.id()] = 0;
					this.effects.bond[card.id()] += activate ? 1 : -1;
					break;
			}
		}
	}
	
	// Activates weather effect and visuals
	addOverlay(overlay){
		this.effects.weather = true;
		const elem = this.elem_parent.getElementsByClassName("row-weather")[0];
		elem.classList.add(overlay);
		fadeIn(elem, 500);
		this.updateScore();
	}
	
	// Deactivates weather effect and visuals
	removeOverlay(overlay){
		this.effects.weather = false;
		const elem = this.elem_parent.getElementsByClassName("row-weather")[0];
		fadeOut(elem, 500).then(() => elem.classList.remove(overlay));	
		this.updateScore();
	}
	
	// Override
	resize(){
		this.resizeCardContainer(10, 0.075, .00325);
	}
	
	// Updates the row's score by summing the current power of its cards
	updateScore() {
		let total = 0;
		for (let card of this.cards) {
			total += this.cardScore(card);
		}
		let player = this.elem_parent.parentElement.id === "field-op" ? player_op : player_me;
		player.updateTotal(total - this.total);
		const scoreElem = this.elem_parent.getElementsByClassName("row-score")[0];
		if (total !== this.total)
			fx.pulse(scoreElem);
		this.total = total;
		scoreElem.innerHTML = this.total;
	}
	
	// Calculates and set the card's current power
	cardScore(card){
		let total = this.calcCardScore(card);
		card.setPower(total);
		return total;
	}

	// Calculate total row score without updating
	calcScore()
	{
		return this.cards.reduce((sum, card) => sum + this.calcCardScore(card), 0);
	}
	
	// Calculates the current power of a card affected by row affects
	calcCardScore(card) {
		if (card.name === "Decoy")
			return 0;
		let total = card.basePower;
		if (card.hero)
			return total;
		if (this.effects.weather)
		{
			const weatherMin = this.effects.halfWeather ? Math.ceil(total/2) : 1;
			total = Math.min(weatherMin, total);
		}
		if (game.doubleSpyPower && card.abilities.includes("spy"))
			total *= 2;
		let bond = this.effects.bond[card.id()];
		if (isNumber(bond) && bond > 1)
			total *= Number(bond);
		total += Math.max(0, this.effects.morale + (card.abilities.includes("morale") ? -1 : 0 ));
		if (this.effects.horn - (card.abilities.includes("horn") ? 1 : 0) >  0 )
			total *= 2;
		return total;
	}
	
	// Applies a temporary leader horn affect that is removed at the end of the round
	async leaderHorn(){
		if (this.special !== null)
			return;
		let horn = new Card(card_dict[5], null);
		await this.addCard(horn);
		game.roundEnd.push( () => this.removeCard(horn) );
	}
	
	// Applies a local scorch effect to this row
	async scorch() {
		if (this.total >= 10)
			await Promise.all( this.maxUnits().map( async c => {
				await c.animate("scorch", true, false);
				await board.toGrave(c, this);
			}));
	}
	
	// Removes all cards and effects from this row
	async clear() {
		const toGrave  = this.cards.filter(c => !c.noRemove);
		if (this.special != null)
			toGrave.push(this.special);
		await Promise.all(toGrave.map(async c => await board.toGrave(c, this)));
	}

	// Returns all regular unit cards with the heighest power
	maxUnits(){
		let max = [];
		for (let i=0; i<this.cards.length; ++i){
			let card = this.cards[i];
			if (!card.isUnit())
				continue;
			if (!max[0] || max[0].power < card.power)
				max = [card];
			else if (max[0].power === card.power)
				max.push(card);
		}
		return max;
	}
	
	// Override
	reset(){
		super.reset();
		while(this.special)
			this.removeCard(this.special);
		while(this.elem_special.firstChild)
			this.elem_special.removeChild(this.elem_special.firstChild);
		this.total = 0;
		this.effects = {weather:false, halfWeather: false, bond: {}, morale: 0, horn: 0, mardroeme: 0};
	}
}

// Handles how weather effects are added and removed
class Weather extends CardContainer {
	constructor(elem) {
		super(document.getElementById("weather"));
		this.types = {
			rain: {name:"rain", count: 0, rows: []},
			fog: {name:"fog", count: 0, rows: []},
			frost: {name:"frost", count: 0, rows: []}
		}
		let i=0;
		for (let key of Object.keys(this.types))
			this.types[key].rows = [board.row[i], board.row[5-i++]];
		
		this.elem.addEventListener("click",() => ui.selectRow(this), false);
		makeAccessible(this.elem, "Weather");
	}
	
	// Adds a card if unique and clears all weather if 'clear weather' card added
	async addCard(card) {
		const isDuplicate = !!this.cards.find(c => c.name === card.name);
		super.addCard(card);
		AudioManager.playSFX(card.audio);
		card.elem.classList.add("noclick");
		if (card.name === "Clear Weather"){
			fx.sunlight();
			await sleep(500);
			this.clearWeather();
		} else {
			this.changeWeather(card, x => ++this.types[x].count === 1, (r,t) => r.addOverlay(t.name));
			if (isDuplicate)
			{
				await sleep(750);
				await board.toGrave(card, this);
			}
		}
		await sleep(1000);
	}
	
	// Override
	removeCard(card){
		card = super.removeCard(card);
		card.elem.classList.remove("noclick");
		this.changeWeather(card, x => --this.types[x].count === 0, (r,t) => r.removeOverlay(t.name));
		return card;
	}
	
	// Checks if a card's abilities are a weather type. If the predicate is met, perfom the action
	// on the type's associated rows
	changeWeather(card, predicate, action) {
		for (let x of card.abilities) {
			if (x in this.types && predicate(x)){
				for (let r of this.types[x].rows)
					action(r, this.types[x]);
			}
		}
	}
	
	// Removes all weather effects and cards
	async clearWeather() {
		await Promise.all(this.cards.map((c,i)=>this.cards[this.cards.length-i-1]).map(async c => await board.toGrave(c, this)));
	}
	
	// Override
	resize() {
		this.resizeCardContainer(4, 0.075, .045);
	}
	
	// Override
	reset(){
		super.reset();
		Object.keys(this.types).map(t => this.types[t].count = 0);
	}
}

// 
class Board {
	constructor() {
		this.op_score = 0;
		this.me_score = 0;
		this.row = [];
		for (let x=0; x<6; ++x) {
			let elem = document.getElementById( (x<3)?"field-op":"field-me" ).children[x%3];
			this.row[x] = new Row(elem);
		}
	}
	
	// Get the opponent of this Player
	opponent(player){
		return player === player_me ? player_op : player_me;
	}
	
	// Screen reader labels name each side's owner; "Your"/"Opponent's" is ambiguous in pass and play
	labelRows(){
		const hotseat = game.isHotseat();
		this.row.forEach((r, i) => {
			const side = i < 3 ? (hotseat || player_op.isRemote() ? player_op.name + "'s" : "Opponent's") : (hotseat ? player_me.name + "'s" : "Your");
			r.elem.setAttribute("aria-label", side + " " + r.type + " row");
			r.elem_special.setAttribute("aria-label", side + " " + r.type + " row special slot");
		});
	}
	
	// Sends and translates a card from the source to the Deck of the card's holder
	async toDeck(card, source){
		await this.moveTo(card, "deck", source);
	}
	
	// Sends and translates a card from the source to the Grave of the card's holder
	async toGrave(card, source){
		await this.moveTo(card, "grave", source);
	}

	// Sends and translates a card from the source to the Hand of the card's holder
	async toHand(card, source) {
		await this.moveTo(card, "hand", source);
	}

	// Sends and translates a card from the source to Weather
	async toWeather(card, source) {
		await this.moveTo(card, weather, source);
	}
	
	// Sends and translates a card from the source to the Deck of the card's combat row
	async toRow(card, source) {
		let row = card.row;
		if (row === "agile")
		{
			if (card.holder.controller instanceof ControllerAI)
			{
				row = card.holder.controller.determineAgileRow(card).type;
			}
			else
			{
				row = "close";
			}
		}
		await this.moveTo(card, row, source);
	}
	
	// Sends and translates a card from the source to a specified row name or CardContainer
	async moveTo(card, dest, source) {
		if (isString(dest))
			dest = this.getRow(card, dest);
		await translateTo(card, source ? source : null, dest);
		await dest.addCard(source ? source.removeCard(card) : card);
	}
	
	// Sends and translates a card from the source to a row name associated with the passed player
	async addCardToRow(card, row_name, player, source, silent = false) {
		let row = this.getRow(card, row_name, player);
		await translateTo(card, source, row);
		await row.addCard(card, silent);
	}
	
	// Returns the CardCard associated with the row name that the card would be sent to
	getRow(card, row_name, player){
		player = player ? player : card ? card.holder : player_me;
		let isMe = player === player_me;
		let isSpy = card.abilities.includes("spy");
		switch (row_name) {
			case "weather": return weather; break;
			case "close":  return this.row[ isMe^isSpy ? 3 : 2];
			case "ranged": return this.row[ isMe^isSpy ? 4 : 1];
			case "siege":  return this.row[ isMe^isSpy ? 5 : 0];
			case "grave": return player.grave;
			case "deck": return player.deck;
			case "hand": return player.hand;
			default: console.error( card.name + " sent to incorrect row \"" +row_name+ "\" by " +card.holder.name );
		}
	}
	
	// Updates which player currently is in the lead
	updateLeader() {
		let dif = player_me.total - player_op.total;
		player_me.setWinning(dif > 0);
		player_op.setWinning(dif < 0);
	}

	async clearRound()
	{
		await Promise.all([
			weather.clearWeather(),
			...board.row.map(row => row.clear())
		]);
	}
}


class GameStateEnum extends Enum {};
const GameState = Object.freeze({
	CUSTOMIZE: new GameStateEnum(0),
	PLAYING: new GameStateEnum(10),
	END_SCREEN: new GameStateEnum(100)
});

class Game {
	constructor() {
		this.endScreen = document.getElementById("end-screen");
		let buttons = this.endScreen.getElementsByTagName("button");
		this.mainMenu_elem = buttons[0];
		this.rematch_elem = buttons[1];
		this.newGame_elem = buttons[2];
		this.mainMenu_elem.addEventListener("click", () => {
			Online.leave();
			this.returnToMainMenu();
		}, false);
		this.rematch_elem.addEventListener("click", () => Online.active ? Online.requestRematch() : this.rematchGame(), false);
		this.newGame_elem.addEventListener("click", () => Online.active ? Online.requestNewGame() : this.newOpponentGame(), false);
		this.state = GameState.CUSTOMIZE;
		this.reset();
	}
	
	reset() {
		// Async turn flows capture this and bail out once a game is quit or restarted
		this.session = (this.session ?? 0) + 1;
		this.firstPlayer = null;
		this.currPlayer = null;
		
		this.gameStart = [];
		this.roundStart = [];
		this.roundEnd = [];
		this.turnStart = [];
		this.turnEnd = [];
		
		this.roundCount = 0;
		this.roundHistory = [];
		
		this.randomRespawn = false;
		this.doubleSpyPower = false;

		this.placedEffectsActive = false;
		
		weather.reset();
		board.row.forEach(r => r.reset());
	}
	
	// Sets up player faction abilities and psasive leader abilities
	initPlayers(p1, p2){
		let l1 = ability_dict[p1.leader.abilities[0]];
		let l2 = ability_dict[p2.leader.abilities[0]];
		if (l1 === ability_dict["emhyr_whiteflame"] || l2 === ability_dict["emhyr_whiteflame"]){
			p1.disableLeader();
			p2.disableLeader();
		} else {
			initLeader(p1, l1);
			initLeader(p2, l2);
		}
		if (p1.deck.faction === p2.deck.faction && p1.deck.faction === "scoiatael")
			return;
		initFaction(p1);
		initFaction(p2);
		
		function initLeader(player, leader){
			if (leader.placed)
				leader.placed(player.leader);
			Object.keys(leader).filter(key => game[key]).map(key => game[key].push(leader[key]));
		}
		
		function initFaction(player){
			if (factions[player.deck.faction] && factions[player.deck.faction].factionAbility)
				factions[player.deck.faction].factionAbility(player);
		}
	}

	isPlaying()
	{
		return this.state === GameState.PLAYING;
	}

	// True when both players are humans sharing this device
	isHotseat()
	{
		return !!player_op?.isHuman();
	}

	setState(newState)
	{
		if (!(newState instanceof GameStateEnum) || this.state === newState)
			return;
		const oldState = this.state;
		this.state = newState;
		EventManager.gameStateChanged.dispatch(oldState, newState);
	}
	
	// Sets initializes player abilities, player hands and redraw
	async startGame() {
		const session = this.session;
		EventManager.gameOpened.dispatch();
		ui.setMusicTrack("game");
		// Online clients register hooks in seat order so effects run in the same order on both
		this.initPlayers(...(Online.active ? Online.players() : [player_me, player_op]));
		this.setState(GameState.PLAYING);
		AudioManager.playSFX('game_opening');
		// In pass and play hands stay hidden until their owner takes the device
		ui.handViewer = null;
		document.body.classList.toggle("hotseat", this.isHotseat());
		board.labelRows();
		ui.showHand(this.isHotseat() ? null : player_me);
		await this.runEffects(this.gameStart);
		await this.coinToss();
		if (session !== this.session)
			return;
		AudioManager.playSFX('redraw');
		const openingDraw = p => p.hand.isVisible()
			? p.deck.cards.slice(0, 10).map(c => board.toHand(c, p.deck))
			: Array.from({length: 10}, () => p.deck.draw(p.hand));
		await Promise.all([...openingDraw(player_me), ...openingDraw(player_op)]);
		if (session !== this.session)
			return;
		AudioManager.playSFX("game_start");
		await this.initialRedraw();
		if (session !== this.session)
			return;
		this.currPlayer = this.firstPlayer;
		this.startRound();
	}
	
	// Simulated coin toss to determine who starts game
	async coinToss(){
		if (this.firstPlayer)
			return;
		if (Online.active)
			this.firstPlayer = Online.players()[Online.rng() < 0.5 ? 0 : 1];
		else
			this.firstPlayer = (Math.random() < 0.5) ? player_me : player_op;
		await ui.playerNotification("coin", this.firstPlayer, 3000);
	}
	
	// Allows each human player to swap out up to two cards from their initial hand
	async initialRedraw(){
		const session = this.session;
		const hotseat = this.isHotseat();
		for (const player of [player_op, player_me].filter(p => p.controller instanceof ControllerAI))
			for (let i=0; i < player.controller.difficulty.redraws; i++)
				player.controller.redraw();
		const redraw = async player => {
			if (hotseat)
				await ui.handoff(player, "Choose up to 2 cards from your starting hand to redraw.");
			await Online.carousel(player, "redraw", player.hand, 2, async (c, i) => { 
				AudioManager.playSFX('redraw');
				await player.deck.swap(c, c.cards[i]);
			}, c => true, false, true, (hotseat ? player.name + ": c" : "C") + "hoose up to 2 cards to redraw.", "skip redrawing");
			player.hand.sort?.();
			if (hotseat)
				ui.showHand(null);
		};
		const redrawing = [player_me, player_op].filter(p => !(p.controller instanceof ControllerAI));
		// Online opponents redraw at the same time on their own devices
		if (Online.active)
			await Promise.all(redrawing.map(redraw));
		else for (const player of redrawing) {
			if (session !== this.session)
				return;
			await redraw(player);
		}
		ui.enablePlayer(false);
	}
	
	// Initiates a new round of the game
	async startRound(){
		const session = this.session;
		this.firstPlayer = this.currPlayer;
		this.roundCount++;
		EventManager.roundStarted.dispatch(this.roundCount, this.currPlayer);
		if (this.roundCount === 1)
			AudioManager.playSFX("round1_start");
		await this.runEffects(this.roundStart);
		if (session !== this.session)
			return;
		
		if ( !player_me.canPlay() )
			player_me.setPassed(true);
		if ( !player_op.canPlay() )
			player_op.setPassed(true);
		
		if (player_op.passed && player_me.passed)
			return this.endRound();
		
		if (this.currPlayer.passed)
			this.currPlayer = this.currPlayer.opponent();
		
		await ui.notification("round-start", 1200);
		if (session !== this.session)
			return;
		AudioManager.playSFX(this.currPlayer === player_me ? "turn_me" : "turn_op");
		await ui.playerNotification("turn", this.currPlayer, 1200);
		if (session !== this.session)
			return;
		this.startTurn();
	}
	
	// Starts a new turn. Enables client interraction in client's turn.
	async startTurn() {
		const session = this.session;
		await this.runEffects(this.turnStart);
		if (this.isHotseat()) {
			if (ui.handViewer === this.currPlayer)
				ui.showHand(this.currPlayer);
			else
				await ui.handoff(this.currPlayer, "It's your turn.");
		}
		if (session !== this.session)
			return;
		if (Online.active)
			Online.onTurnStart();
		ui.enablePlayer(this.currPlayer.isHuman());
		this.currPlayer.startTurn();
	}
	
	// Ends the current turn and may end round. Disables client interraction in client's turn.
	async endTurn() {
		const session = this.session;
		if (this.currPlayer.isHuman())
			ui.enablePlayer(false);
		// Keep the hand up only if the same player is about to continue (opponent already passed)
		if (this.isHotseat() && (this.currPlayer.passed || !this.currPlayer.opponent().passed))
			ui.showHand(null);
		await this.runEffects(this.turnEnd);
		if (this.currPlayer.passed)
			await ui.playerNotification("pass", this.currPlayer, 1200);
		if (session !== this.session)
			return;
		if (player_op.passed && player_me.passed)
			this.endRound();
		else
		{
			if (!this.currPlayer.opponent().passed)
			{
				this.currPlayer = this.currPlayer.opponent();
				AudioManager.playSFX(this.currPlayer === player_me ? "turn_me" : "turn_op");
				await ui.playerNotification("turn", this.currPlayer, 1200);
				if (session !== this.session)
					return;
			}
			await this.startTurn();
		}
	}
	
	// Ends the round and may end the game. Determines final scores and the round winner.
	async endRound() {
		let dif = player_me.total - player_op.total;
		if (dif === 0) {
			let nilf_me = player_me.deck.faction === "nilfgaard", nilf_op = player_op.deck.faction === "nilfgaard";
			dif = nilf_me ^ nilf_op ? nilf_me ? 1 : -1 : 0;
		}
		let winner = dif > 0 ? player_me : dif < 0 ? player_op : null;
		let verdict = {winner: winner, score_me: player_me.total, score_op: player_op.total}
		this.roundHistory.push(verdict);
		
		const session = this.session;
		await this.runEffects(this.roundEnd);
		if (session !== this.session)
			return;
		
		player_me.endRound( dif > 0);
		player_op.endRound( dif < 0);
		if (winner && (winner === player_me || this.isHotseat()))
			fx.burst(document.getElementById("score-total-" + winner.tag), "gold");
		
		let notificationKey = "";
		let caption;
		if (winner && this.isHotseat())
		{
			AudioManager.playSFX("round_win");
			notificationKey = "win-round";
			caption = ui.playerCaption("win", winner);
		}
		else if (dif > 0)
		{
			AudioManager.playSFX("round_win");
			notificationKey = "win-round";
		}	
		else if (dif < 0)
		{
			AudioManager.playSFX("round_lose");
			notificationKey = "lose-round";
		}
		else
		{
			AudioManager.playSFX("round_lose");
			notificationKey = "draw-round";
		}

		await Promise.all([
			board.clearRound(),
			ui.notification(notificationKey, 1200, caption)
		]);
		if (session !== this.session)
			return;

		EventManager.roundEnded.dispatch(this.roundCount, player_me.total, player_op.total);
		if (player_me.health === 0 || player_op.health === 0)
			this.endGame();
		else
		{
			this.currPlayer = dif < 0 ? player_op : dif > 0 ? player_me : this.firstPlayer;
			this.startRound();
		}
	}
	
	// Sets up and displays the end-game screen. note replaces the winner line (e.g. an online forfeit).
	async endGame(note) {
		let endScreen = document.getElementById("end-screen");
		let rows = endScreen.getElementsByTagName("tr");
		rows[1].children[0].textContent = player_me.name;
		rows[2].children[0].textContent = player_op.name;
		
		for (let i=1; i<4; ++i) {
			let round = this.roundHistory[i-1];
			rows[1].children[i].innerHTML = round ? round.score_me : 0;
			rows[1].children[i].classList.toggle("round-won", !!round && round.winner === player_me);
			
			rows[2].children[i].innerHTML = round ? round.score_op : 0;
			rows[2].children[i].classList.toggle("round-won", !!round && round.winner === player_op);
		}
		
		endScreen.children[0].className = "";
		const winnerElem = document.getElementById("end-winner");
		winnerElem.classList.add("hide");
		if (player_op.health <= 0 && player_me.health <= 0) {
			endScreen.getElementsByTagName("p")[0].classList.remove("hide");
			AudioManager.playSFX("game_lose");
			endScreen.children[0].classList.add("end-draw");
			ui.announce("The game ended in a draw");
		} else if (this.isHotseat()) {
			const winner = player_op.health === 0 ? player_me : player_op;
			AudioManager.playSFX("game_win");
			endScreen.children[0].classList.add("end-win");
			winnerElem.textContent = winner.name + " wins!";
			winnerElem.classList.remove("hide");
			ui.announce(winner.name + " won the game!");
		} else if (player_op.health === 0){
			AudioManager.playSFX("game_win");
			endScreen.children[0].classList.add("end-win");
			ui.announce("You won the game!");
		} else {
			AudioManager.playSFX("game_lose");
			endScreen.children[0].classList.add("end-lose");
			ui.announce("You lost the game");
		}
		if (note) {
			winnerElem.textContent = note;
			winnerElem.classList.remove("hide");
			ui.announce(note);
		}
		Online.onGameEnd();
		
		fadeIn(endScreen, 300);
		ui.enablePlayer(true);
		this.setState(GameState.END_SCREEN);
	}

	exitGame()
	{
		AudioManager.playSFX('warning');
		if (Online.active)
			return ui.popup(
				"Resume", ()=>{},
				"Leave", ()=>Online.forfeit(),
				"Leave the match?", "You will forfeit and your opponent wins."
			);
		ui.popup(
			"Resume", ()=>{},
			"Exit", ()=>this.returnToMainMenu(),
			"Quit current game?" , "This will return you to the main menu."
		); 
	}
	
	// Returns the client to the deck customization screen
	returnToCustomization(showBuilder = true){
		document.activeElement?.blur();
		ui.closeHandoff();
		this.reset();
		player_me?.reset();
		player_op?.reset();
		EventManager.customizationOpened.dispatch();
		this.endScreen.classList.add("hide");
		if (showBuilder)
			document.getElementById("deck-customization").classList.remove("hide");
		AudioManager.playSFX('menu_opening');
		ui.setMusicTrack("menu");
		this.setState(GameState.CUSTOMIZE);
	}

	// The builder stays hidden so it doesn't show through the title's fade-in; closeTitleScreen reveals it
	returnToMainMenu(){
		openTitleScreen(false);
		this.returnToCustomization(false);
	}

	newOpponentGame()
	{
		const hotseat = this.isHotseat();
		this.reset();
		player_me.reset();
		player_op = new Player(1, hotseat ? player_op.name : DeckMaker.opponentName(), dm.constructOpponentDeck(hotseat ? "normal" : undefined), hotseat);
		this.endScreen.classList.add("hide");
		this.startGame();
	}
	
	// Restarts the last game with the dame decks
	rematchGame(){
		this.reset();
		player_me.reset();
		player_op.reset();
		this.endScreen.classList.add("hide");
		this.startGame();
	}
	
	// Executes effects in list. If effect returns true, effect is removed.
	async runEffects(effects){
		for (let i=effects.length-1; i>=0; --i){
			let effect = effects[i];
			if (await effect())
				effects.splice(i,1)
		}
	}
	
}

// Contians information and behavior of a Card
class Card {

	constructor(card_data, player) {
		this.name = card_data.name;
		this.basePower = this.power = Number(card_data.strength);
		this.faction = card_data.deck;
		this.abilities = (card_data.ability === "") ? [] : card_data.ability.split(" ");
		this.row = (card_data.deck === "weather") ? card_data.deck : card_data.row;
		this.filename = card_data.filename;
		if (card_data.muster)
		{
			this.muster = card_data.muster;
		}
		this.placed = [];
		this.removed = [];
		this.activated = [];
		this.holder = player;
		
		this.hero = false;
		if (this.abilities.length > 0) {
			this.audio = this.abilities[this.abilities.length-1];
			if (this.abilities[0] === "hero") {
				this.hero = true;
				this.abilities.splice(0, 1);
			}
			for (let x of this.abilities) {
				let ab = ability_dict[x];
				if ("placed" in ab) this.placed.push(ab.placed);
				if ("removed" in ab) this.removed.push(ab.removed);
				if ("activated" in ab) this.activated.push(ab.activated);
			}
		}
		
		if (this.row === "leader")
			this.desc_name = "Leader Ability";
		else if (this.abilities.length > 0)
			this.desc_name = ability_dict[this.abilities[this.abilities.length-1]].name;
		else if (this.row==="agile")
			this.desc_name = "agile";
		else if (this.hero)
			this.desc_name = "hero";
		else
			this.desc_name = "";
		
		this.desc = this.row ==="agile" ? ability_dict["agile"].description : "";
		for (let i=this.abilities.length-1; i>=0; --i) {
			this.desc += ability_dict[this.abilities[i]].description;
		}
		if (this.hero)
			this.desc += ability_dict["hero"].description;
		
		this.elem = this.createCardElem(this);
	}
	
	// Returns the identifier for this type of card
	id() {
		return this.name;
	}
	
	// Sets and displays the current power of this card
	setPower(n){
		if (this.name === "Decoy")
			return;
		let elem = this.elem.children[0].children[0];
		if (n !== this.power) {
			this.power = n;
			elem.innerHTML = this.power;
		}
		elem.classList.toggle("buffed", n > this.basePower);
		elem.classList.toggle("debuffed", n < this.basePower);
	}
	
	// Resets the power of this card to default
	resetPower(){
		this.setPower(this.basePower);
	}
	
	// Automatically sends and translates this card to its apropriate row from the passed source
	async autoplay(source){
		await board.toRow(this, source);
	}
	
	// Animates an ability effect
	async animate(name, bFade = true, bExpand = true) {
		AudioManager.playSFX(name);
		if (name === "scorch") {
			return await this.scorch(name);
		}
		let anim = this.elem.children[3];
		anim.style.backgroundImage = iconURL("anim_" + name);
		await sleep(50);
		
		if (bFade) fadeIn(anim, 300);
		if (bExpand) anim.style.backgroundSize = "100% auto";
		await sleep(300);
		
		if (bExpand) anim.style.backgroundSize = "80% auto";
		await sleep(1000);
		
		if (bFade) fadeOut(anim, 300);
		if (bExpand) anim.style.backgroundSize = "40% auto";
		await sleep(300);
		
		anim.style.backgroundImage = "";
	}
	
	// Animates the scorch effect
	async scorch(name){
		let anim = this.elem.children[3];
		anim.style.backgroundSize = "cover";
		anim.style.backgroundImage = iconURL("anim_" + name);
		await sleep(50);
		
		fadeIn(anim, 300);
		fx.burst(this.elem, "fire");
		fx.shake();
		await sleep(1300);
		
		fadeOut(anim, 300);
		await sleep(300);
		
		anim.style.backgroundSize = "";
		anim.style.backgroundImage = "";
	}
	
	// Returns true if this is a combat card that is not a Hero
	isUnit(){
		return !this.hero && (this.row === "close" || this.row === "ranged" || this.row === "siege" || this.row === "agile");
	}
	
	// Returns true if card is sent to a Row's special slot
	isSpecial() {
		return this.name === "Commander's Horn" || this.name === "Mardroeme";
	}

	isHero() { return this.hero; }

	// Orders cards the same way on both online clients
	static byUid(a, b){
		return (a.uid ?? "") < (b.uid ?? "") ? -1 : (a.uid ?? "") > (b.uid ?? "") ? 1 : 0;
	}

	// Compares by type then power then name
	static compare(a, b){
		var dif = factionRank(a) - factionRank(b);
		if (dif !== 0)
			return dif;
		dif = a.basePower - b.basePower;
		if (dif && dif !== 0)
			return dif;
		return a.name.localeCompare(b.name);
		
		function factionRank(c){ return c.faction === "special" ? -2 : (c.faction === "weather") ? -1 : 0; }
	}

	// Creates an HTML element based on the card's properties
	createCardElem(card){
		let elem = document.createElement("div");
		elem.style.backgroundImage = smallURL(card.faction + "_" + card.filename);
		elem.classList.add("card");
		elem.setAttribute('data-title', card.name);
		elem.addEventListener("click", () => ui.selectCard(card), false);
		
		if (card.row === "leader")
			return elem;
		
		makeAccessible(elem, card.name);
		
		let power = document.createElement("div");
		elem.appendChild(power);
		let bg;
		if (card.hero) {
			bg = "power_hero";
			elem.classList.add("hero");
		} else if (card.faction === "weather") {
			bg = "power_" + card.abilities[0];
		} else if (card.faction === "special") {
			bg = "power_" + card.abilities[0];
			elem.classList.add("special");
		} else {
			bg = "power_normal";
		}
		power.style.backgroundImage = iconURL(bg);
		
		let row = document.createElement("div");
		elem.appendChild(row);
		if (card.row === "close" || card.row === "ranged" || card.row === "siege" || card.row === "agile") {
			let num = document.createElement("div");
			num.appendChild( document.createTextNode(card.basePower) );
			num.classList.add("center");
			power.appendChild(num);
			row.style.backgroundImage = iconURL("card_row_" + card.row);
		}

		let abi = document.createElement("div");
		elem.appendChild(abi);
		if (card.faction !== "special" && card.faction !== "weather" && card.abilities.length > 0) {
			let str =  card.abilities[card.abilities.length-1];
			if (str === "cerys")
				str = "muster";
			if (str.startsWith("avenger"))
				str = "avenger";
			if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
				str = "scorch";
			abi.style.backgroundImage = iconURL("card_ability_" + str);
		} else if (card.row === "agile")
			abi.style.backgroundImage = iconURL("card_ability_" + "agile");
		
		elem.appendChild( document.createElement("div") ); // animation overlay
		elem.addEventListener('mouseenter', CLICK_EVENT_SFX);
		return elem;
	}

	
	// Takes ID-Count object pairs and expands to a list of corresponding IDs
	static expandIDCounts(card_id_list)
	{
		return card_id_list.reduce((a,c) => a.concat(clone(c.count, card_dict[c.index])), []);
		function clone(n ,elem) { for (var  i=0, a=[]; i<n; ++i) a.push(elem); return a; }
	}

	// Takes ID-Count object pairs and returns a list of corresponding Cards
	static getCardsFromIdCounts(card_id_list, player)
	{
		return Card.expandIDCounts(card_id_list).map(e => new Card(e, player));
	}
}

// Handles notifications and client interration with menus
class UI {
	// Mirrors the banner captions in css/overlays.css for screen readers
	static notificationText = {
		"me-first": "You will go first", "op-first": "Your opponent will go first",
		"me-coin": "You will go first", "op-coin": "Your opponent will go first",
		"round-start": "Round start", "me-pass": "Round passed", "op-pass": "Your opponent has passed",
		"win-round": "You won the round!", "lose-round": "Your opponent won the round", "draw-round": "The round ended in a draw",
		"me-turn": "Your turn", "op-turn": "Opponent's turn",
		"north": "Northern Realms faction ability triggered: draw an additional card",
		"monsters": "Monsters faction ability triggered: one random unit stays on the board",
		"scoiatael": "Opponent used the Scoia'tael faction perk to go first",
		"skellige-me": "Skellige ability triggered", "skellige-op": "Opponent Skellige ability triggered"
	};
	
	constructor() {
		this.carousels = [];
		this.notif_elem = document.getElementById("notification-bar");
		document.getElementById('exit-game').addEventListener('click', ()=>game.exitGame(), false);
		this.preview = document.getElementsByClassName("card-preview")[0];
		this.previewCard = null;
		this.lastRow = null;
		this.toggleSettings = [];
		document.getElementById("pass-button").addEventListener("click", () => {
			if (!game.currPlayer?.isHuman())
				return;
			Online.commit(game.currPlayer, {a: "pass"});
			game.currPlayer.passRound();
			AudioManager.playSFX('pass');
		}, false);
		this.handoff_elem = document.getElementById("handoff");
		this.handViewer = null;
		this.handoffResolve = null;
		document.getElementById("handoff-ready").addEventListener("click", () => {
			const resolve = this.handoffResolve;
			this.handoffResolve = null;
			resolve?.();
		});
		document.getElementById("handoff-quit").addEventListener("click", () => game.exitGame());
		document.getElementById("click-background").addEventListener("click", () => ui.cancel(), false);
		this.music = {};
		this.musicTrack = "menu";
		this.toggleMusic_elem = document.getElementById("toggle-music");
		this.toggleSettings.push(this.toggleMusic_elem);
		this.toggleMusic_elem.classList.toggle("fade", !Settings.music.isEnabled());
		this.toggleMusic_elem.addEventListener("click", () => this.toggleMusic(), false);
		this.toggleNotifications_elem = document.getElementById("toggle-notifications");
		this.toggleSettings.push(this.toggleNotifications_elem);
		this.toggleNotifications_elem.addEventListener("click", () => this.toggleNotifications(), false);
		if (!Settings.notifications.isEnabled())
			this.toggleNotifications_elem.classList.add("fade");
		this.toggleSFX_elem = document.getElementById("toggle-sfx");
		this.toggleSettings.push(this.toggleSFX_elem);
		this.toggleSFX_elem.addEventListener('click', () => this.toggleSFX())
		if (!Settings.soundEffects.isEnabled())
			this.toggleSFX_elem.classList.add("fade");
		this.toggleEffects_elem = document.getElementById("toggle-effects");
		this.toggleSettings.push(this.toggleEffects_elem);
		this.toggleEffects_elem.addEventListener('click', () => this.toggleEffects());
		this.applyEffectsSetting();
		this.toggleSettings.push(document.getElementById("open-guide"));

		EventManager.gameOpened.bind(()=>this.toggleSettings.forEach(e=>e.classList.remove('deck-menu')));
		EventManager.customizationOpened.bind(()=>this.toggleSettings.forEach(e=>e.classList.add('deck-menu')));

		[	'.settings-button',
			'.deck-options',
			'#pass-button',
			'#end-buttons>button',
			'#handoff button',
			'#opponent-preview button'
		].forEach(addMouseEnterSFXBySelector);
		
		this.live_elem = document.getElementById("live-region");
		[
			'#exit-game', '#pass-button', '#grave-me', '#grave-op', '.settings-button',
			'#change-faction', '#download-deck', '#upload-deck', '#card-leader > div', '#carousel .card-lg'
		].forEach(selector => document.querySelectorAll(selector).forEach(e => makeAccessible(e, e.dataset.title || e.textContent.trim())));
		document.querySelector('#card-leader > div').setAttribute("aria-label", "Choose leader");
	}
	
	// Reads out a message to screen readers
	announce(text){
		if (!text)
			return;
		this.live_elem.textContent = "";
		setTimeout(() => this.live_elem.textContent = text, 50);
	}
	
	// Enables or disables client interration
	enablePlayer(enable){
		let main = document.getElementsByTagName("main")[0].classList;
		if (enable) main.remove("noclick"); else main.add("noclick");
	}
	
	// Shows only the passed player's hand in the hand tray; null hides all hands
	showHand(player){
		document.getElementById("hand-row").classList.toggle("hide", !player || player !== player_me);
		document.getElementById("hand-row-op").classList.toggle("hide", !player || player !== player_op);
	}
	
	// Pass and play: covers the board until the named player confirms they have the device, then shows their hand
	async handoff(player, message){
		this.showHand(null);
		this.handoff_elem.querySelector(".handoff-shield").style.backgroundImage = iconURL("deck_shield_" + player.deck.faction);
		document.getElementById("handoff-name").textContent = player.name;
		document.getElementById("handoff-desc").textContent = message;
		this.handoff_elem.classList.remove("hide");
		this.announce("Pass the device to " + player.name + ". " + message);
		document.getElementById("handoff-ready").focus();
		await new Promise(resolve => this.handoffResolve = resolve);
		this.handoff_elem.classList.add("hide");
		this.handViewer = player;
		this.showHand(player);
	}
	
	// Hides the handoff screen without resuming the game waiting on it (used when quitting)
	closeHandoff(){
		this.handoffResolve = null;
		this.handoff_elem.classList.add("hide");
	}
	
	// Initializes the background music (menu: Kaer Morhen, game: Gwent mix)
	initMusic(){
		const tracks = {
			menu: "The Witcher 3_ Wild Hunt - Kaer Morhen Extended.mp3",
			game: "The Witcher 3_ Wild Hunt Soundtrack - Gwent Full Mix.mp3"
		};
		// No <audio> elements: media elements make the OS show a media notification
		const ctx = this.musicContext = new (window.AudioContext || window.webkitAudioContext)();
		for (const [name, file] of Object.entries(tracks))
			this.music[name] = new MusicTrack(ctx, "sfx/music/" + encodeURIComponent(file), ctx.destination);
		document.addEventListener("visibilitychange", () => {
			if (document.hidden)
				ctx.suspend().catch(() => {});
			else
				this.applyMusicSetting();
		});
		this.applyMusicSetting();
	}

	// Tracks are scheduled even while the context is suspended (silent), so both must be running
	isMusicPlaying(){
		return !!this.music[this.musicTrack]?.playing && this.musicContext.state === "running";
	}

	// Switches between "menu" and "game" music with a crossfade
	setMusicTrack(name){
		this.musicTrack = name;
		this.applyMusicSetting();
	}

	// Autoplay is attempted on load; if the browser blocks it, the first input retries
	applyMusicSetting(){
		const enabled = Settings.music.isEnabled();
		this.toggleMusic_elem.classList.toggle("fade", !enabled);
		for (const [name, track] of Object.entries(this.music)) {
			const on = enabled && name === this.musicTrack;
			this.fadeMusic(track, on ? 0.6 : 0, enabled ? 3000 : 600);
		}
	}

	// Ramps a track's gain to target over ms; stops it once silent
	fadeMusic(track, target, ms){
		const ctx = this.musicContext;
		if (target > 0) {
			// resume() stays blocked until a user gesture; the first user input retries it
			if (ctx.state !== "running" && !document.hidden)
				ctx.resume().catch(() => {});
			track.start();
		}
		if (track.target === target)
			return;
		track.target = target;
		clearTimeout(track.timer);
		track.timer = null;
		const gain = track.gain.gain, now = ctx.currentTime;
		gain.cancelScheduledValues(now);
		gain.setValueAtTime(gain.value, now);
		gain.linearRampToValueAtTime(target, now + ms / 1000);
		if (target === 0)
			track.timer = setTimeout(() => track.target === 0 && track.stop(), ms);
	}
	
	// Called when client toggles the music
	toggleMusic(){
		// While autoplay is still blocked the music is "on" but silent, so this click should start it, not mute it
		if (Settings.music.isEnabled() && !this.isMusicPlaying())
			return this.applyMusicSetting();
		Settings.music.toggle();
		this.applyMusicSetting();
	}

	toggleNotifications() {
		Settings.notifications.toggle();
		const useNotificaitons = Settings.notifications.isEnabled();
		if (useNotificaitons)
		{
			this.toggleNotifications_elem.classList.remove("fade");
		}
		else
		{
			this.toggleNotifications_elem.classList.add("fade");
		}
	}

	toggleSFX() {
		Settings.soundEffects.toggle();
		const useSFX = Settings.soundEffects.isEnabled();
		if (useSFX)
		{
			this.toggleSFX_elem.classList.remove("fade");
		}
		else
		{
			this.toggleSFX_elem.classList.add("fade");
		}
	}
	
	toggleEffects() {
		Settings.effects.toggle();
		this.applyEffectsSetting();
	}

	applyEffectsSetting() {
		const enabled = Settings.effects.isEnabled();
		this.toggleEffects_elem.classList.toggle("fade", !enabled);
		document.body.classList.toggle("fx-off", !enabled);
	}
	
	// Called when the player selects a selectable card
	async selectCard(card) {
		let row = this.lastRow;
		let pCard = this.previewCard;
		if (card === pCard)
			return;
		if (pCard === null || card.holder.hand.cards.includes(card)) {
			this.setSelectable(null, false);
			this.showPreview(card);
		} else if (pCard.name === "Decoy") {
			const session = game.session;
			Online.commit(pCard.holder, {a: "decoy", c: pCard.uid, x: card.uid, r: Online.rowCode(row)});
			this.hidePreview(card);
			this.enablePlayer(false);
			await Promise.all([
				board.toHand(card, row),
				board.moveTo(pCard, row, pCard.holder.hand)
			]);
			if (session === game.session)
				pCard.holder.endTurn();
		}
	}
	
	// Called when the player selects a selectable CardContainer
	async selectRow(row){
		EventManager.rowSelected.dispatch(row, game.currPlayer);
		if (game.placedEffectsActive)
		{
			return;
		}
		this.lastRow = row;
		if (this.previewCard === null) {
			await ui.viewCardsInContainer(row);
			return;
		}
		if (this.previewCard.name === "Decoy")
			return;
		let card = this.previewCard;
		let holder = card.holder;
		const session = game.session;
		Online.commit(holder, card.name === "Scorch" ? {a: "scorch", c: card.uid} : {a: "row", c: card.uid, r: Online.rowCode(row)});
		this.hidePreview();
		this.enablePlayer(false);
		if (card.name === "Scorch"){
			this.hidePreview();
			await ability_dict["scorch"].activated(card);
		} else if (card.name === "Decoy") {
			return;
		} else {
			await board.moveTo(card, row, card.holder.hand);
		}
		if (session === game.session)
			holder.endTurn();
	}
	
	// Called when the client cancels out of a card-preview
	cancel(){
		this.hidePreview();
		EventManager.previewCancelled.dispatch();
	}
	
	// Displays a card preview then enables and highlights potential card destinations
	showPreview(card, allowClose = true) {
		this.showPreviewVisuals(card);
		this.setSelectable(card, true);
		AudioManager.playSFX('open');
		if (allowClose)
		{
			document.getElementById("click-background").classList.remove("noclick");
		}
		else
		{
			this.setTurnControlsEnabled(false);
		}
	}
	
	// Toggles the leaders, pass button and hand cards that could otherwise interrupt a forced choice
	setTurnControlsEnabled(enable){
		document.getElementById('pass-button').classList.toggle("noclick", !enable);
		for (const player of [player_me, player_op]) {
			if (!player)
				continue;
			player.elem_leader.classList.toggle("noclick", !enable);
			if (player.hand instanceof Hand)
				player.hand.cards.forEach( c => c.elem.classList.toggle("noclick", !enable) );
		}
	}
	
	// Sets up the graphics and description for a card preview
	showPreviewVisuals(card){
		this.previewCard = card;
		this.preview.classList.remove("hide");
		this.preview.getElementsByClassName("card-lg")[0].style.backgroundImage = largeURL(card.faction+"_"+card.filename);
		let desc_elem = this.preview.getElementsByClassName("card-description")[0];
		this.setDescription(card, desc_elem);
	}
	
	// Hides the card preview then disables and removes highlighting from card destinations
	hidePreview(){
		document.getElementById("click-background").classList.add("noclick");
		this.setTurnControlsEnabled(true);
		
		this.preview.classList.add("hide");
		this.setSelectable(null, false);
		this.previewCard = null;
		this.lastRow = null;
	}
	
	// Sets up description window for a card
	setDescription(card, desc){
		if (!card)
		{
			desc.children[1].innerHTML = "NULL";
			desc.children[2].innerHTML = "";
			return;
		}
		if (card.hero || card.row === "agile" || card.abilities.length > 0 || card.faction === "faction") {
			desc.classList.remove("hide");
			let str = card.row === "agile" ? "agile" : "";
			if (card.abilities.length)
				str = card.abilities[card.abilities.length-1];
			if (str === "cerys")
				str = "muster";
			if (str.startsWith("avenger"))
				str = "avenger";
			if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
				str = "scorch";
			if (card.row === "leader" || card.faction === "faction" || card.abilities.length === 0 && card.row !== "agile")
				desc.children[0].style.backgroundImage = "";
			else
				desc.children[0].style.backgroundImage = iconURL("card_ability_" + str);
			desc.children[1].innerHTML = card.desc_name;
			desc.children[2].innerHTML = card.desc;
		} else {
			desc.classList.add("hide");
		}
	}
	
	// Displayed a timed notification to the client. caption overrides the banner's built-in text.
	async notification(name, duration, caption){
		if (Online.replaying)
			return;
		this.announce(caption ?? UI.notificationText[name]);
		if (!Settings.notifications.isEnabled())
			return;
		if (!duration)
			duration = 1200;
		const fadeSpeed = 150;
		duration = Math.max(400, duration - 2*fadeSpeed);
		const banner = this.notif_elem.children[0];
		banner.id = "notif-" + name;
		if (caption)
			banner.dataset.caption = caption;
		else
			delete banner.dataset.caption;
		const shown = fadeIn(this.notif_elem, fadeSpeed);
		// fadeIn unhides the bar synchronously, so this lines up with the coin flip starting
		if (name.endsWith("-coin"))
			AudioManager.playSFX("coin");
		await shown;
		await sleep(duration);
		await fadeOut(this.notif_elem, fadeSpeed);
	}
	
	// Banner text that names the player: both sides in pass and play, the opponent online
	playerCaption(kind, player){
		if (!game.isHotseat() && !player.isRemote())
			return undefined;
		const name = player.name;
		return {
			coin: name + " will go first",
			first: name + " will go first",
			turn: name + "'s turn",
			pass: name + " has passed",
			win: name + " won the round!",
			skellige: name + "'s Skellige ability triggered!"
		}[kind];
	}
	
	// Shows the "me-"/"op-" variant of a banner for the player, named in pass and play
	async playerNotification(kind, player, duration){
		await this.notification(player.tag + "-" + kind, duration, this.playerCaption(kind, player));
	}
	
	// Displays a cancellable Carousel for a single card 
	async viewCard(card, action) {
		if (card === null)
			return;
		let container = new CardContainer();
		container.cards.push(card);
		await this.viewCardsInContainer(container, action);
	}
	
	// Displays a cancellable Carousel for all cards in a container
	async viewCardsInContainer(container, action) {
		action = action ? action : function() {return this.cancel();};
		await this.queueCarousel(container, 1, action, () => true, false, true);
	}
	
	// Displays a Carousel menu of filtered container items that match the predicate.
	// Suspends gameplay until the Carousel is closed. Automatically picks random card if activated for AI player
	async queueCarousel(container, count, action, predicate, bSort, bQuit, title, hint){
		if (game.currPlayer?.controller instanceof ControllerAI) {
			for (let i=0; i<count; ++i){
				let cards = container.cards.reduce((a,c,i) => !predicate || predicate(c) ? a.concat([i]) : a, []);
				if (cards.length === 0)
					break;
				await action(container, cards[randomInt(cards.length)]);
			}
			return;
		}
		let carousel = new Carousel(container, count, action, predicate, bSort, bQuit, title, hint);
		if (Carousel.curr === undefined || Carousel.curr === null)
			carousel.start();
		else {
			this.carousels.push(carousel);
			return;
		}
		await sleepUntil( () => this.carousels.length === 0 && !Carousel.curr, 100);
	}
	
	// Starts the next queued Carousel
	quitCarousel(){
		if (this.carousels.length > 0) {
			this.carousels.shift().start();
		}
	}
	
	// Displays a custom confirmation menu 
	async popup(yesName, yes, noName, no, title, description, alpha = .95) {
		let p = new Popup(yesName, yes, noName, no, title, description, alpha);
		await sleepUntil( () => !Popup.curr) 
	}
	
	// In-game replacement for window.alert
	async alert(title, description) {
		AudioManager.playSFX("warning");
		await this.popup("OK", null, null, null, title, description);
	}
	
	// In-game replacement for window.confirm. Resolves true if the first option is chosen.
	async confirm(title, description, yesName = "Continue", noName = "Cancel") {
		AudioManager.playSFX("warning");
		let accepted = false;
		await this.popup(yesName, () => accepted = true, noName, null, title, description);
		return accepted;
	}
	
	// Rows (or weather) a card from hand can be played to; also validates online opponents' moves
	legalRows(card){
		if (card.faction === "weather")
			return [weather];
		if (card.name === "Scorch")
			return [...board.row];
		// board.row[0..2] belong to player_op, [3..5] to player_me
		const own = board.row.filter((r, i) => (i >= 3) === (card.holder === player_me));
		if (card.isSpecial())
			return own.filter(r => r.special === null);
		if (card.name === "Decoy")
			return own.filter(r => r.cards.some(c => c.isUnit()));
		return card.row === "agile" ? [board.getRow(card, "close", card.holder), board.getRow(card, "ranged", card.holder)] : [board.getRow(card, card.row, card.holder)];
	}
	
	// Enables or disables selection and highlighting of rows specific to the card
	setSelectable(card, enable){
		if(!enable) {
			for (let row of board.row){
				row.elem.classList.remove("row-selectable");
				row.elem.classList.remove("noclick");
				row.elem_special.classList.remove("row-selectable");
				row.elem_special.classList.remove("noclick");
				row.elem.classList.add("card-selectable");
				
				for (let card of row.cards) {
					card.elem.classList.add("noclick");
				}
			}
			weather.elem.classList.remove("row-selectable");
			weather.elem.classList.remove("noclick");
			return;
		}
		const legal = this.legalRows(card);
		if (card.faction === "weather") {
			for (let row of board.row){
				row.elem.classList.add("noclick");
				row.elem_special.classList.add("noclick");
			}
			weather.elem.classList.add("row-selectable");
			return;
		}
		
		weather.elem.classList.add("noclick");
		
		if (card.name === "Scorch") {
			for (let r of board.row){
				r.elem.classList.add("row-selectable");
				r.elem_special.classList.add("row-selectable");
			}
			return;
		}
		if (card.isSpecial()){
			for (let r of board.row){
				if (!legal.includes(r)){
					r.elem.classList.add("noclick");
					r.elem_special.classList.add("noclick");
				} else {
					r.elem_special.classList.add("row-selectable");
				}
			}
			return;
		}
		
		board.row.forEach( r => r.elem_special.classList.add("noclick") );
		
		if (card.name === "Decoy"){
			for (let r of board.row) {
				if (!legal.includes(r)) {
					r.elem.classList.add("noclick");
					r.elem_special.classList.add("noclick");
					r.elem.classList.remove("card-selectable");
				} else {
					r.elem.classList.add("row-selectable");
					r.cards.filter(c => c.isUnit()).forEach( c => c.elem.classList.remove("noclick") );
				}
			}
			return;
		}
		
		for (let row of board.row){
			if (legal.includes(row)) {
				row.elem.classList.add("row-selectable");
			} else {
				row.elem.classList.add("noclick");
			}
		}
	}

	// used to handle row selection when resetoring agile units via medics
	async waitForRowSelection(card)
	{
		game.placedEffectsActive = true;
		ui.setSelectable(null, false);
		ui.showPreview(card, false);
		ui.enablePlayer(true);
		let selectedRow = null;
		let bRowSelected = false;
		const rowSelect = event => {
			const {row, player} = event.detail;
			bRowSelected = true;
			selectedRow = row;
		};
		EventManager.rowSelected.bind(rowSelect);
		EventManager.previewCancelled.bind(rowSelect);
		await sleepUntil(() => bRowSelected === true);
		EventManager.rowSelected.unbind(rowSelect);
		EventManager.previewCancelled.unbind(rowSelect);
		ui.hidePreview();
		game.placedEffectsActive = false;
		return selectedRow;
	}
}

// Displays up to 5 cards for the client to cycle through and select to perform an action
// Clicking the middle card performs the action on that card "count" times
// Clicking adejacent cards shifts the menu to focus on that card
class Carousel {
	constructor(container, count, action, predicate, bSort, bExit = false, title, hint = "close") {
		if (count <= 0 || !container || !action || container.cards.length === 0)
			return ;
		this.container = container;
		this.count = count;
		this.action = action ? action : () => this.cancel();
		this.predicate = predicate;
		this.bSort = bSort;
		this.indices = [];
		this.index = 0;
		this.bExit = bExit;
		this.title = title;
		this.hint = hint;
		this.cancelled = false;
		
		if (!Carousel.elem) {
			Carousel.elem = document.getElementById("carousel");
			// Card clicks stop propagation, so anything else in the overlay (backdrop, title, hint) dismisses it
			Carousel.elem.addEventListener("click", () => Carousel.curr?.cancel(), false);
			// Letterbox bars around the 16:9 stage (wide phones) count as outside too
			document.addEventListener("click", e => {
				if ((e.target === document.body || e.target === document.documentElement) && Carousel.curr && !Carousel.elem.classList.contains("hide"))
					Carousel.curr.cancel();
			}, false);
			[...Carousel.elem.children[0].children].forEach((e, i) => {
				const offset = i - 2;
				e.addEventListener("click", evt => offset === 0 ? Carousel.curr?.select(evt) : Carousel.curr?.shift(evt, offset));
				e.addEventListener("pointerover", evt => evt.pointerType === "mouse" && Carousel.curr?.nudge(offset));
				e.addEventListener("pointerout", evt => evt.pointerType === "mouse" && Carousel.curr?.nudge(0));
			});
			Carousel.initSwipe(Carousel.elem.children[0]);
		}
		this.elem = Carousel.elem;
		document.getElementsByTagName("main")[0].classList.remove("noclick");
		
		this.elem.children[0].classList.remove("noclick");
		this.previews = this.elem.getElementsByClassName("card-lg");
		this.desc = this.elem.getElementsByClassName("card-description")[0];
		this.title_elem = this.elem.children[2];
		this.hint_elem = document.getElementById("carousel-hint");
		this.elem.children[0].style.setProperty('--carousel-trans-time', "0.25s");
	}
	
	// Initializes the current Carousel
	start(){
		if (!this.elem)
			return;
		this.indices = this.container.cards.reduce((a,c,i)=> (!this.predicate || this.predicate(c)) ? a.concat([i]) : a, []);
		if (this.indices.length <= 0)
			return this.exit();
		if (this.bSort)
			this.indices.sort( (a, b) => Card.compare(this.container.cards[a],this.container.cards[b]) );
		
		this.update();
		Carousel.setCurrent(this);
		
		if (this.title) {
			this.title_elem.innerHTML = this.title;
			this.title_elem.classList.remove("hide");
		} else {
			this.title_elem.classList.add("hide");
		}
		if (this.bExit) {
			const touch = matchMedia("(pointer: coarse)").matches;
			this.hint_elem.textContent = (touch ? "Tap anywhere outside the cards to " : "Click outside the cards or press Esc to ") + this.hint;
		}
		this.hint_elem.classList.toggle("hide", !this.bExit);
		AudioManager.playSFX('open');
		this.elem.classList.remove("hide");
		ui.enablePlayer(true);
	}
	
	// Called by the client to cycle cards displayed by n
	shift(event, n){
		(event || window.event).stopPropagation();
		this.scroll(n);
	}

	// Moves the focus by n cards; returns false if already at that end
	scroll(n){
		const index = Math.max(0, Math.min(this.indices.length-1, this.index+n));
		if (index === this.index)
			return false;
		this.index = index;
		AudioManager.playSFX('ui_card');
		this.update();
		return true;
	}

	// Touch/pen: slide a finger across the cards to scroll through them; a quick flick keeps going
	static initSwipe(strip) {
		let drag = null, suppressClick = false;
		// A drag must not also count as a tap on whatever card it ends on
		Carousel.elem.addEventListener("click", e => {
			if (suppressClick) {
				suppressClick = false;
				e.stopPropagation();
			}
		}, true);

		strip.addEventListener("pointerdown", e => {
			if (e.pointerType === "mouse" || !Carousel.curr || drag)
				return;
			Carousel.stopFling();
			suppressClick = false;
			const a = strip.children[1].getBoundingClientRect(), b = strip.children[2].getBoundingClientRect();
			const slot = (b.left + b.width / 2) - (a.left + a.width / 2);
			drag = {id: e.pointerId, x0: e.clientX, anchor: e.clientX, lastX: e.clientX, lastT: e.timeStamp, vx: 0, moved: false, step: Math.max(30, slot * 0.6)};
		});

		strip.addEventListener("pointermove", e => {
			const c = Carousel.curr;
			if (!drag || e.pointerId !== drag.id || !c)
				return;
			if (!drag.moved) {
				if (Math.abs(e.clientX - drag.x0) < 10)
					return;
				drag.moved = true;
				strip.setPointerCapture(e.pointerId);
				strip.style.transition = "none";
				c.nudge(0);
			}
			const dt = e.timeStamp - drag.lastT;
			if (dt > 0)
				drag.vx = 0.7 * (e.clientX - drag.lastX) / dt + 0.3 * drag.vx;
			drag.lastX = e.clientX;
			drag.lastT = e.timeStamp;

			const half = drag.step / 2;
			let off = e.clientX - drag.anchor;
			while (Math.abs(off) >= half && c.scroll(-Math.sign(off))) {
				drag.anchor += Math.sign(off) * drag.step;
				off = e.clientX - drag.anchor;
			}
			// Rubber-band past either end
			const k = 0.4;
			const shown = Math.abs(off) <= half ? off * k : Math.sign(off) * (half + (Math.abs(off) - half) * 0.3) * k;
			strip.style.translate = shown + "px";
		});

		const end = e => {
			if (!drag || e.pointerId !== drag.id)
				return;
			const d = drag;
			drag = null;
			strip.style.removeProperty("translate");
			strip.style.removeProperty("transition");
			if (!d.moved)
				return;
			suppressClick = e.type === "pointerup";
			const speed = Math.abs(d.vx);
			if (e.type === "pointerup" && speed > 0.5 && e.timeStamp - d.lastT < 100)
				Carousel.fling(-Math.sign(d.vx), Math.min(10, Math.round(speed * 3)));
		};
		strip.addEventListener("pointerup", end);
		strip.addEventListener("pointercancel", end);
	}

	static fling(dir, count, delay = 45) {
		if (count <= 0 || !Carousel.curr?.scroll(dir))
			return;
		Carousel.flingTimer = setTimeout(() => Carousel.fling(dir, count - 1, delay * 1.2), delay);
	}

	static stopFling() {
		clearTimeout(Carousel.flingTimer);
	}

	// called when mousing over/out of one of the carousel cards
	nudge(offset = 0)
	{
		const parentClasslist = this.elem.children[0].classList;
		parentClasslist.remove('left');
		parentClasslist.remove('right');
		const magnitude = (offset === 2) ? -1 * Math.sign(offset) : -0.6 * offset;
		this.elem.children[0].style.setProperty('--magnitude', magnitude);
		if (offset < 0)
		{
			parentClasslist.add('left');
		} else if (offset > 0)
		{
			parentClasslist.add('right')
		}
	}
	
	// Called by client to perform action on the middle card in focus
	async select(event) {
		(event || window.event).stopPropagation();
		// The carousel stays current while the last action runs; repeated Enter presses must not re-run it
		if (this.count <= 0 || this.busy)
			return;
		--this.count;
		if (this.isLastSelection())
			this.elem.classList.add("hide");
		if (this.count <= 0)
			ui.enablePlayer(false);
		// A second pick before the first card has left (e.g. discards) would pick the same card again
		this.busy = true;
		try {
			await this.action(this.container, this.indices[this.index]);
		} finally {
			this.busy = false;
		}
		if (this.isLastSelection() && !this.cancelled)
			return this.exit();
		this.update();
	}
	
	// Called by client to exit out of the current Carousel if allowed. Enables player interraction.
	cancel(){
		if (this.bExit){
			this.cancelled = true;
			AudioManager.playSFX('discard');
			this.exit();
		}
		ui.enablePlayer(true);
	}
	
	// Returns true if there are no more cards to view or select
	isLastSelection(){
		return this.count <= 0 || this.indices.length === 0;
	}
	
	// Updates the visuals of the current selection of cards
	update(){
		this.indices = this.container.cards.reduce((a,c,i)=> (!this.predicate || this.predicate(c)) ? a.concat([i]) : a, []);
		if (this.indices.length <= 0)
		{
			return this.exit();
		}
		if (this.index >= this.indices.length)
			this.index =  this.indices.length-1;
		for (let i=0; i<this.previews.length; i++) {
			let curr = this.index - 2 + i;
			if (curr >= 0 && curr < this.indices.length) {
				let card = this.container.cards[this.indices[curr]];
				this.previews[i].style.backgroundImage = largeURL(card.faction + "_" + card.filename);
				this.previews[i].setAttribute("aria-label", card.name ?? card.desc_name);
				this.previews[i].classList.remove("hide");
				this.previews[i].classList.remove("noclick");
			} else {
				this.previews[i].style.backgroundImage = "";
				this.previews[i].classList.add("hide");
				this.previews[i].classList.add("noclick");
			}
		}
		ui.setDescription(this.container.cards[this.indices[this.index]], this.desc);
	}
	
	// Clears and quits the current carousel
	exit() {
		Carousel.stopFling();
		for (let x of this.previews)
			x.style.backgroundImage = "";
		this.elem.classList.add("hide");
		Carousel.clearCurrent();
		ui.quitCarousel();
	}
	
	// Statically sets the current carousel
	static setCurrent(curr) {
		this.curr = curr;
	}
	
	// Statically clears the current carousel
	static clearCurrent() {
		this.curr = null;
	}
}

// Custom confirmation windows
class Popup {
	// Pass noName === null for a single-button (alert style) popup
	constructor(yesName, yes, noName, no, header, description, alpha = .95){
		this.yes = yes ? yes : ()=>{};
		this.no = no ? no : ()=>{};
		
		this.elem = document.getElementById("popup");
		Popup.init(this.elem);
		let main = this.elem.children[0];
		main.children[0].textContent = header ? header : "";
		main.children[1].textContent = description ? description : "";
		this.buttons = [...main.children[2].children];
		this.buttons[0].textContent = (yesName) ? yesName : "Yes";
		this.buttons[1].textContent = (noName) ? noName : "No";
		this.buttons[1].classList.toggle("hide", noName === null);

		const bgColor = new RGBA(10, 10, 10, alpha);
		this.elem.style.backgroundColor = bgColor.toString();
		
		this.playerWasEnabled = !document.getElementsByTagName("main")[0].classList.contains("noclick");
		this.returnFocus = document.activeElement;
		this.elem.classList.remove("hide");
		Popup.setCurrent(this);
		ui.enablePlayer(true);
		this.buttons[0].focus();
	}
	
	// Wires the shared popup element once: buttons, Escape to dismiss, Tab kept inside the dialog
	static init(elem){
		if (Popup.initialized)
			return;
		Popup.initialized = true;
		const [yesButton, noButton] = elem.children[0].children[2].children;
		yesButton.addEventListener("click", () => Popup.curr?.selectYes());
		noButton.addEventListener("click", () => Popup.curr?.selectNo());
		elem.addEventListener("keydown", e => {
			const popup = Popup.curr;
			if (!popup)
				return;
			if (e.key === "Escape") {
				e.preventDefault();
				popup.buttons[1].classList.contains("hide") ? popup.selectYes() : popup.selectNo();
			} else if (e.key === "Tab") {
				e.preventDefault();
				const visible = popup.buttons.filter(b => !b.classList.contains("hide"));
				const i = visible.indexOf(document.activeElement);
				visible[(i + (e.shiftKey ? -1 : 1) + visible.length) % visible.length].focus();
			}
		});
	}
	
	// Sets this as the current popup window
	static setCurrent(curr){ this.curr = curr; }
	
	// Unsets this as the current popup window
	static clearCurrent()  { this.curr = null; }
	
	// Called when client selects the positive aciton
	selectYes() {
		this.clear()
		this.yes();
		return true;
	}
	
	// Called when client selects the negative option
	selectNo() {
		this.clear();
		this.no();
		return false;
	}
	
	// Clears the popup and restores player interraction to its prior state
	clear() {
		ui.enablePlayer(this.playerWasEnabled);
		this.elem.classList.add("hide");
		Popup.clearCurrent();
		this.returnFocus?.focus?.();
	}
	
}

// Screen used to customize, import and export deck contents
class DeckMaker {
	// Deck rules an online host can enable; ban(card data) marks cards the rule forbids
	static RULES = {
		expert: {label: "Expert Limits", desc: "At most 130 total unit strength and 3 hero cards"},
		noHeroes: {label: "No Heroes", desc: "Hero cards are not allowed", ban: c => c.ability.split(" ").includes("hero")},
		noNeutral: {label: "No Neutrals", desc: "Neutral cards are not allowed", ban: c => c.deck === "neutral"},
		noSpecial: {label: "No Specials", desc: "Special cards (Decoy, Horn, Scorch, Mardroeme) are not allowed", ban: c => c.deck === "special"},
		noWeather: {label: "No Weather", desc: "Weather cards are not allowed", ban: c => c.deck === "weather"}
	};
	// Rules of the online room the builder is in
	static onlineRules = [];

	constructor() {
		this.elem = document.getElementById("deck-customization");
		this.bank_elem = document.getElementById("card-bank");
		this.deck_elem = document.getElementById("card-deck");
		this.leader_elem = document.getElementById("card-leader");
		this.leader_elem.children[1].addEventListener("click", () => this.selectLeader(), false);
		this.leader_elem.children[1].addEventListener('mouseenter', CLICK_EVENT_SFX);
		// Whose deck the builder is editing; Player 2 only exists in pass and play
		this.owner = "p1";
		this.loadFactionDeck(Settings.getLastFaction(this.owner).get(), true);

		this.change_elem = document.getElementById("change-faction");
		this.change_elem.addEventListener("click", () => this.selectFaction(), false);
		
		document.getElementById("download-deck").addEventListener("click", () => this.downloadDeck(), false);
		document.getElementById("add-file").addEventListener("change", () => this.uploadPlayerDeck(), false);
		document.getElementById("start-game").addEventListener("click", () => this.startNewGame(), false);
		document.getElementById("start-game").addEventListener("mouseenter", CLICK_EVENT_SFX, false);
		
		this.difficulty_buttons = [...document.querySelectorAll("#ai-difficulty > button")];
		DeckMaker.bindRadioGroup(this.difficulty_buttons, b => this.setDifficulty(b.dataset.level));
		this.setDifficulty(Settings.aiDifficulty.get(), true);
		
		this.mode_buttons = [...document.querySelectorAll("#game-mode > button")];
		DeckMaker.bindRadioGroup(this.mode_buttons, b => this.setGameMode(b.dataset.mode));
		this.owner_buttons = [...document.querySelectorAll("#deck-owner > button")];
		DeckMaker.bindRadioGroup(this.owner_buttons, b => this.setDeckOwner(b.dataset.owner));
		this.setGameMode(Settings.gameMode.get(), true);
	}
	
	// Click and arrow-key selection for a role=radiogroup of buttons
	static bindRadioGroup(buttons, select) {
		buttons.forEach(b => {
			b.addEventListener("click", () => select(b));
			b.addEventListener("mouseenter", CLICK_EVENT_SFX);
			b.addEventListener("keydown", e => {
				const step = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1}[e.key];
				if (!step)
					return;
				e.preventDefault();
				const next = buttons[(buttons.indexOf(b) + step + buttons.length) % buttons.length];
				select(next);
				next.focus();
			});
		});
	}
	
	// Marks the button matching the predicate as the checked radio
	static checkRadio(buttons, isSelected) {
		buttons.forEach(b => {
			const selected = isSelected(b);
			b.setAttribute("aria-checked", selected);
			b.tabIndex = selected ? 0 : -1;
		});
	}
	
	static opponentName() {
		return ControllerAI.difficulty().label + " AI";
	}
	
	static isHotseatMode() {
		return Settings.gameMode.get() === "hotseat";
	}
	
	// Selects the AI difficulty used for the next game
	setDifficulty(level, silent = false) {
		if (!(level in ControllerAI.difficulties))
			level = "normal";
		if (!silent && level !== Settings.aiDifficulty.get())
			AudioManager.playSFX("ui_card_bank");
		Settings.aiDifficulty.set(level);
		DeckMaker.checkRadio(this.difficulty_buttons, b => b.dataset.level === level);
		this.updateStats();
	}
	
	// Chooses between playing the AI and pass and play, where Player 2 builds their own deck
	setGameMode(mode, silent = false) {
		if (mode !== "hotseat")
			mode = "ai";
		if (!silent && mode !== Settings.gameMode.get())
			AudioManager.playSFX("ui_card_bank");
		Settings.gameMode.set(mode);
		DeckMaker.checkRadio(this.mode_buttons, b => b.dataset.mode === mode);
		const hotseat = mode === "hotseat";
		document.getElementById("ai-difficulty").classList.toggle("hide", hotseat);
		document.getElementById("deck-owner-row").classList.toggle("hide", !hotseat);
		this.setDeckOwner(hotseat ? this.owner : "p1", true);
		this.updateDeckTitle();
		this.updateStats();
	}
	
	// Switches the builder between Player 1's and Player 2's saved decks
	setDeckOwner(owner, silent = false) {
		if (owner !== "p2")
			owner = "p1";
		DeckMaker.checkRadio(this.owner_buttons, b => b.dataset.owner === owner);
		if (owner === this.owner)
			return;
		if (!silent)
			AudioManager.playSFX("ui_card_bank");
		this.owner = owner;
		this.loadFactionDeck(Settings.getLastFaction(owner).get(), true);
		this.updateDeckTitle();
	}
	
	updateDeckTitle() {
		const title = !DeckMaker.isHotseatMode() ? "Cards in Deck" : this.owner === "p2" ? "Player 2's Deck" : "Player 1's Deck";
		document.getElementById("card-deck-title").textContent = title;
	}

	loadFactionDeck(faction, force = false)
	{
		if (!this.isValidFaction(faction))
			return;
		if (!this.setFaction(faction, true))
			return;
		const faction_deck = Settings.getFactionSettings(this.faction, this.owner).get();
		this.setLeader(faction_deck.leader);
		this.makeBank(this.faction, faction_deck.cards);
		this.update();
	}

	isValidFaction(factionName)
	{
		switch(factionName) 
		{
		case "realms": case "nilfgaard": case "monsters": case "scoiatael": case "skellige":
			return true;
		default:
			return false;
		}
	}
	
	// Called when client selects a deck faction. Clears previous cards and makes valid cards available.
	setFaction(faction_name, force){
		if (!faction_name)
			return;
		if (!force && this.faction === faction_name)
			return false;
		this.elem.getElementsByTagName("h1")[0].innerHTML = factions[faction_name].name;
		this.elem.getElementsByTagName("h1")[0].style.backgroundImage = iconURL("deck_shield_" + faction_name);
		document.getElementById("faction-description").innerHTML = factions[faction_name].description;
		
		this.leaders = 
			card_dict.map((c,i) => ({index: i, card:c}) )
			.filter(c => c.card.deck === faction_name && c.card.row === "leader");
		if (!this.leader || this.faction !== faction_name) {
			this.leader = this.leaders[0];
			this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
		}
		this.faction = faction_name;
		Settings.getLastFaction(this.owner).set(faction_name);
		return true;
	}
	
	// Sets current leader and updates UI
	setLeader(index){
		this.leader = this.leaders.filter( l => l.index == index)[0];
		this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
	}
	
	// Constructs a bank of cards that can be used by the faction's deck.
	// If a deck is provided, will not add cards to bank that are already in the deck.
	makeBank(faction, deck) {
		this.clear();
		let cards = card_dict.map((c,i) => ({card:c, index:i})).filter(
		p => [faction, "neutral", "weather", "special"].includes(p.card.deck) && p.card.row !== "leader");
		
		cards.sort( function(id1, id2) {
			let a = card_dict[id1.index], b = card_dict[id2.index];
			let c1 = {name: a.name, basePower: -a.strength, faction: a.deck};
			let c2 = {name: b.name, basePower: -b.strength, faction: b.deck};
			return Card.compare(c1, c2);
		});
		
		
		let deckMap = {};
		if (deck){
			for (let i of Object.keys(deck)) deckMap[deck[i].index] = deck[i].count;
		}
		cards.forEach( p => {
			let count = deckMap[p.index] !== undefined ? Number(deckMap[p.index]) : 0;
			this.makePreview(p.index, Number.parseInt(p.card.count) - count, this.bank_elem, this.bank,);
			this.makePreview(p.index, count, this.deck_elem, this.deck);
		});
	}
	
	// Creates HTML elements for the card previews
	makePreview(index, num, container_elem, cards){
		let card_data = card_dict[index];
		
		let elem = document.createElement("div");
		this.lazyArt(elem, largeURL(card_data.deck + "_" + card_data.filename), container_elem);
		elem.classList.add("card-lg");
		makeAccessible(elem, card_data.name);
		let count = document.createElement("div");
		elem.appendChild(count);
		container_elem.appendChild(elem);
		
		let bankID = {index: index, count: num, elem: elem};
		let isBank = cards === this.bank;
		count.innerHTML = bankID.count;
		cards.push(bankID);
		let cardIndex = cards.length-1;
		elem.addEventListener("click", () => this.select(cardIndex, isBank), false);
		elem.addEventListener("mouseenter", CLICK_EVENT_SFX, false);
		return bankID;
	}
	
	// Defers loading a preview's art until it is scrolled near view in its container
	lazyArt(elem, url, container){
		if (!("IntersectionObserver" in window)) {
			elem.style.backgroundImage = url;
			return;
		}
		this.observers ??= new Map();
		let observer = this.observers.get(container);
		if (!observer) {
			observer = new IntersectionObserver(entries => entries.forEach(e => {
				if (!e.isIntersecting)
					return;
				e.target.style.backgroundImage = e.target.dataset.art;
				observer.unobserve(e.target);
			}), {root: container, rootMargin: "100% 0px"});
			this.observers.set(container, observer);
		}
		elem.dataset.art = url;
		observer.observe(elem);
	}
	
	// Updates the card preview elements when any changes are made to the deck
	update(){
		for (let x of this.bank) {
			if (x.count)
				x.elem.classList.remove("hide");
			else
				x.elem.classList.add("hide");
		}
		let total = 0, units = 0, special = 0, strength = 0, hero = 0;
		for (let x of this.deck) {
			let card_data = card_dict[x.index];
			if (x.count)
				x.elem.classList.remove("hide");
			else
				x.elem.classList.add("hide");
			total += x.count;
			if (card_data.deck === "special" || card_data.deck === "weather") {
				special += x.count;
				continue;
			}
			units += x.count;
			strength += card_data.strength * x.count;
			if (card_data.ability.split(" ").includes("hero"))
				hero += x.count;
		}
		this.stats = {total: total, units: units, special: special, strength: strength, hero: hero};
		this.updateFauxCard(this.bank_elem);
		this.updateFauxCard(this.deck_elem);
		this.updateStats();
	}

	// updates an empty card element to ensure correct alignment when count%3 == 2
	updateFauxCard(container)
	{
		let fauxCard = container.getElementsByClassName('empty')[0];
		if (!fauxCard)
		{
			fauxCard = document.createElement('div');
			fauxCard.classList.add('card-lg');
			fauxCard.classList.add('empty');
		}
		else
		{
			container.removeChild(fauxCard);
		}
		if (container.querySelectorAll(".card-lg:not(.hide)").length % 3 === 2)
		{
			container.appendChild(fauxCard);
		}
	}
	
	// Updates and displays the statistics describing the cards currently in the deck
	updateStats(){
		let stats = document.getElementById("deck-stats");
		stats.children[1].innerHTML = this.stats.total;
		stats.children[3].innerHTML = this.stats.units +(this.stats.units < 22 ? "/22" : "");
		stats.children[5].innerHTML = this.stats.special + "/10";
		const limits = DeckMaker.deckLimits();
		stats.children[7].innerHTML = this.stats.strength + (limits?.strength ? "/" + limits.strength : "");
		stats.children[9].innerHTML = this.stats.hero + (limits?.hero ? "/" + limits.hero : "");
		
		stats.children[3].style.color = this.stats.units < 22 ? "red" : "";
		stats.children[5].style.color = (this.stats.special > 10) ? "red" : "";
		stats.children[7].style.color = limits?.strength && this.stats.strength > limits.strength ? "red" : "";
		stats.children[9].style.color = limits?.hero && this.stats.hero > limits.hero ? "red" : "";

		const rules = document.body.classList.contains("online") ? DeckMaker.onlineRules : [];
		for (const x of [...(this.bank ?? []), ...(this.deck ?? [])])
			x.elem.classList.toggle("banned", DeckMaker.isBanned(card_dict[x.index], rules));
	}

	static isBanned(card, rules){
		return rules.some(r => DeckMaker.RULES[r]?.ban?.(card));
	}
	
	// Opens a Carousel to allow the client to select a leader for their deck
	selectLeader(){
		let container = new CardContainer();
		container.cards = this.leaders.map(c => {
			let card = new Card(c.card, player_me);
			card.data = c;
			return card;
		});
		
		let index = this.leaders.indexOf(this.leader);
		ui.queueCarousel(container, 1, (c,i) => {
			let data = c.cards[i].data;
			this.leader = data;
			this.leader_elem.children[1].style.backgroundImage = largeURL(data.card.deck + "_" + data.card.filename);
			Settings.getFactionSettings(this.leader.card.deck, this.owner).setLeader(this.leader);
			AudioManager.playSFX('ui_card_bank');
		}, () => true, false, true);
		Carousel.curr.index = index;
		Carousel.curr.update();
	}
	
	// Opens a Carousel to allow the client to select a faction for their deck
	selectFaction() {
		let container = new CardContainer();
		container.cards = Object.keys(factions).map( f => {
			return {abilities: [f], filename: f, desc_name: factions[f].name, desc: factions[f].description, faction: "faction"};
		});
		let index = container.cards.reduce((a,c,i) => c.filename === this.faction ? i : a, 0);
		ui.queueCarousel(container, 1, (c,i) => {
			this.loadFactionDeck(c.cards[i].filename);
		}, () => true, false, true);
		Carousel.curr.index = index;
		Carousel.curr.update();
	}
	
	// Called when client selects s a preview card. Moves it from bank to deck or vice-versa then updates;
	select(index, isBank){
		if (isBank)
		{
			this.add(index, this.deck);
			this.remove(index, this.bank);
			AudioManager.playSFX('ui_card_bank');
		}
		else
		{
			this.add(index, this.bank);
			this.remove(index, this.deck);
			AudioManager.playSFX('discard');
		}
		Settings.getFactionSettings(this.faction, this.owner).setCards(this.deck.filter(x => x.count > 0));
		this.update();
	}
	
	// Adds a card to container (Bank or deck)
	add(index, cards) {
		let id = cards[index];
		id.elem.children[0].innerHTML = ++id.count;
	}
	
	// Removes a card from container (bank or deck)
	remove(index, cards) {
		let id = cards[index];
		id.elem.children[0].innerHTML = --id.count;
	}
	
	// Removes all elements in the bank and deck
	clear(){
		this.observers?.forEach(o => o.disconnect());
		while (this.bank_elem.firstChild)
			this.bank_elem.removeChild(this.bank_elem.firstChild);
		while (this.deck_elem.firstChild)
			this.deck_elem.removeChild(this.deck_elem.firstChild);
		this.bank = [];
		this.deck = [];
		this.stats = {};
	}
	
	// Verifies the decks, creates the players and their decks, then starts a new game
	startNewGame(){
		if (Online.connected)
			return Online.toggleReady();
		const hotseat = DeckMaker.isHotseatMode();
		const p1 = this.playerDeck("p1");
		const p2 = hotseat ? this.playerDeck("p2") : null;
		const warning = [["Player 1", p1], ["Player 2", p2]]
			.filter(([, d]) => d && DeckMaker.ruleWarnings(d.units, d.special))
			.map(([name, d]) => (hotseat ? name + "'s deck:\n" : "") + DeckMaker.ruleWarnings(d.units, d.special))
			.join("\n") || DeckMaker.limitWarnings(p1);
		if (warning)
			return ui.alert("Invalid deck", warning);
		
		player_me = new Player(0, "Player 1", p1.deck);
		player_op = hotseat ? new Player(1, "Player 2", p2.deck, true) : new Player(1, DeckMaker.opponentName(), this.constructOpponentDeck());
		
		this.elem.classList.add("hide");
		game.startGame();
	}
	
	// The deck a player will use: the builder's contents if it's editing that player, otherwise their saved deck
	playerDeck(owner){
		let faction, leader, cards;
		if (owner === this.owner) {
			faction = this.faction;
			leader = card_dict[this.leader.index];
			cards = this.deck.filter(x => x.count > 0).map(x => ({index: x.index, count: x.count}));
		} else {
			faction = Settings.getLastFaction(owner).get();
			if (!this.isValidFaction(faction))
				faction = "realms";
			const saved = Settings.getFactionSettings(faction, owner).get();
			leader = card_dict[saved.leader]?.row === "leader" && card_dict[saved.leader].deck === faction
				? card_dict[saved.leader] : card_dict.find(c => c.row === "leader" && c.deck === faction);
			cards = (saved.cards ?? []).filter(c => card_dict[c.index]);
		}
		return {deck: {faction: faction, leader: leader, cards: cards}, ...DeckMaker.countCards(cards)};
	}
	
	// Counts unit and special (incl. weather) cards, total unit strength and heroes in a list of {index, count}
	static countCards(cards){
		const units = cards.filter(c => !["special", "weather"].includes(card_dict[c.index].deck));
		const sum = (list, f) => list.reduce((a, c) => a + f(card_dict[c.index]) * Number(c.count), 0);
		const unitCount = sum(units, () => 1);
		return {
			units: unitCount,
			special: sum(cards, () => 1) - unitCount,
			strength: sum(units, d => Number(d.strength) || 0),
			hero: sum(units, d => d.ability.split(" ").includes("hero") ? 1 : 0)
		};
	}

	// The AI difficulty's caps on the player's deck (online: the room's Expert Limits rule), none in pass and play
	static deckLimits(){
		if (document.body.classList.contains("online"))
			return DeckMaker.onlineRules.includes("expert") ? ControllerAI.difficulties.expert.deckLimits : null;
		return DeckMaker.isHotseatMode() ? null : ControllerAI.difficulty().deckLimits ?? null;
	}

	// Describes how a deck breaks the difficulty's deck caps, or ""
	static limitWarnings(stats, limits = DeckMaker.deckLimits(), label = ControllerAI.difficulty().label){
		if (!limits)
			return "";
		let warning = "";
		if (limits.strength && stats.strength > limits.strength)
			warning += label + " allows at most " + limits.strength + " total unit strength (deck has " + stats.strength + ").\n";
		if (limits.hero && stats.hero > limits.hero)
			warning += label + " allows at most " + limits.hero + " hero cards (deck has " + stats.hero + ").\n";
		return warning;
	}

	// Describes how a list of {index, count} breaks an online room's deck rules, or ""
	static onlineRuleWarnings(cards, rules = DeckMaker.onlineRules){
		let warning = "";
		for (const id of rules) {
			const rule = DeckMaker.RULES[id];
			const names = new Set(cards.filter(c => c.count > 0 && rule?.ban?.(card_dict[c.index])).map(c => card_dict[c.index].name));
			if (names.size)
				warning += rule.label + ": remove " + [...names].join(", ") + ".\n";
		}
		if (rules.includes("expert"))
			warning += DeckMaker.limitWarnings(DeckMaker.countCards(cards), ControllerAI.difficulties.expert.deckLimits, DeckMaker.RULES.expert.label);
		return warning;
	}

	// A random deck from the pool of the given AI difficulty
	constructOpponentDeck(level = Settings.aiDifficulty.get())
	{
		const pool = ai_decks[level] ?? ai_decks.normal;
		const deck = pool[randomInt(pool.length)];
		return {faction: deck.faction, leader: card_dict[deck.leader], cards: deck.cards.map(([index, count]) => ({index: index, count: count}))};
	}
	
	// Converts the current deck to a JSON string
	deckToJSON(){
		let obj = {
			faction: this.faction,
			leader: this.leader.index, 
			cards: this.deck.filter(x => x.count > 0).map(x => [x.index, x.count] )
		};
		return JSON.stringify(obj);
	}
	
	// Called by the client to downlaod the current deck as a JSON file
	downloadDeck(){
		let json = this.deckToJSON();
		let str = "data:text/json;charset=utf-8," + encodeURIComponent(json);
		let hidden_elem = document.getElementById('download-json');
		hidden_elem.href = str;
		hidden_elem.download = "GwentDeck.json";
		hidden_elem.click();
	}

	uploadDeck(id, callback)
	{
		let files = document.getElementById(id).files;
		if (files.length <= 0)
			return false;
		let fr = new FileReader();
		fr.onload = async e => {
			document.getElementById(id).value = "";
			let deck;
			try {
				deck = JSON.parse(e.target.result);
			} catch (err) {
				return ui.alert("Invalid deck file", "The uploaded file is not valid JSON.");
			}
			await callback(deck);
		}
		fr.readAsText(files.item(0));
	}
	
	// Called by the client to upload a JSON file representing a new deck
	uploadPlayerDeck() {
		this.uploadDeck("add-file", deck => this.loadPlayerDeck(deck, false));
	}

	// Returns a description of deck-building rule violations, or "" if the deck is legal
	static ruleWarnings(units, special){
		let warning = "";
		if (units < 22)
			warning += "The deck must have at least 22 unit cards (has " + units + ").\n";
		if (special > 10)
			warning += "The deck must have no more than 10 special cards (has " + special + ").\n";
		return warning;
	}

	// Validates parsed deck JSON. Returns a sanitized deck, or null if invalid or the user declines warnings.
	// enforceRules rejects decks that break the 22 unit / 10 special limits.
	async loadDeck(deck, silent = true, enforceRules = false)
	{
		const fail = async msg => {
			if (!silent)
				await ui.alert("Invalid deck", msg);
			return null;
		};
		if (!deck || typeof deck !== "object")
			return fail("The file does not describe a deck.");
		if (!this.isValidFaction(deck.faction))
			return fail("Unknown faction '" + deck.faction + "'.");
		const leaderIndex = Number(deck.leader);
		const leader = Number.isInteger(leaderIndex) ? card_dict[leaderIndex] : undefined;
		if (!leader || leader.row !== "leader")
			return fail("The deck's leader is not a valid leader card.");
		if (!Array.isArray(deck.cards))
			return fail("The deck has no card list.");

		let warning = "";
		if (deck.faction !== leader.deck) {
			const mismatch = "Leader '" + leader.name + "' doesn't match deck faction '" + factions[deck.faction].name + "'.\n";
			if (enforceRules)
				return fail(mismatch);
			warning += mismatch;
		}
		const counts = new Map();
		for (const c of deck.cards) {
			const [index, count] = Array.isArray(c) ? c.map(Number) : [];
			const card = Number.isInteger(index) ? card_dict[index] : undefined;
			if (!card || card.row === "leader" || !Number.isInteger(count) || count < 1) {
				warning += "Skipped invalid entry " + JSON.stringify(c) + ".\n";
				continue;
			}
			if (![deck.faction, "neutral", "special", "weather"].includes(card.deck)) {
				warning += "'" + card.name + "' cannot be used in a " + factions[deck.faction].name + " deck.\n";
				continue;
			}
			counts.set(index, (counts.get(index) ?? 0) + count);
		}
		const cards = [];
		for (const [index, count] of counts) {
			const card = card_dict[index];
			const max = Number(card.count);
			if (count > max)
				warning += "Deck contains " + count + "/" + max + " available '" + card.name + "' cards.\n";
			cards.push({index: index, count: Math.min(count, max)});
		}

		const {units, special} = DeckMaker.countCards(cards);
		const rules = DeckMaker.ruleWarnings(units, special);
		if (rules && enforceRules)
			return fail(warning + rules);
		warning += rules;

		if (warning) {
			if (silent || !await ui.confirm("Deck has problems", warning + "\nContinue importing the deck?"))
				return null;
		}
		return {faction: deck.faction, leader: leaderIndex, cards: cards};
	}

	async loadPlayerDeck(deck, silent = true)
	{
		const loadedDeck = await this.loadDeck(deck, silent);
		if (!loadedDeck)
			return;
		
		// Use deck to update current player faction and cards in deck maker
		this.setFaction(loadedDeck.faction, true);
		if (card_dict[loadedDeck.leader].row === "leader" && loadedDeck.faction === card_dict[loadedDeck.leader].deck){
			this.leader = this.leaders.filter(c => c.index === loadedDeck.leader)[0];
			this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
		}
		this.makeBank(loadedDeck.faction, loadedDeck.cards);
		this.update();
		const saved = Settings.getFactionSettings(this.faction, this.owner);
		saved.setLeader(this.leader);
		saved.setCards(this.deck.filter(x => x.count > 0));
	}
}

// Streams an MPEG-1 Layer III file through Web Audio in short decoded chunks (whole tracks would be ~500 MB of PCM).
// Each chunk is decoded with a few extra frames on both sides and trimmed by frame count, so the seams line up.
class MusicTrack {
	static FRAME = 1152;
	static CHUNK = 208;
	static OVERLAP = 4;
	static AHEAD = 12;

	constructor(ctx, url, output){
		this.ctx = ctx;
		this.url = url;
		this.gain = ctx.createGain();
		this.gain.gain.value = 0;
		this.gain.connect(output);
		this.target = 0;
		this.timer = null;
		this.bytes = new Uint8Array(0);
		this.size = 0;
		this.scan = -1;
		this.frames = [];
		this.framesEnd = 0;
		this.sampleRate = 0;
		this.done = false;
		this.failed = false;
		this.loading = null;
		this.waiters = [];
		this.playing = false;
		this.frame = 0;
		this.nextTime = 0;
		this.queue = [];
		this.session = 0;
		this.pumping = false;
		this.pumpTimer = null;
	}

	load(){
		return this.loading ??= this.download().catch(e => {
			console.warn(`Music ${this.url} failed to load:`, e);
			this.failed = this.done = true;
			this.notify();
		});
	}

	async download(){
		const res = await fetch(this.url);
		if (!res.ok)
			throw new Error("HTTP " + res.status);
		this.bytes = new Uint8Array(Number(res.headers.get("content-length")) || 1 << 22);
		const reader = res.body.getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done)
				break;
			if (this.size + value.length > this.bytes.length) {
				const grown = new Uint8Array(Math.max(this.bytes.length * 2, this.size + value.length));
				grown.set(this.bytes.subarray(0, this.size));
				this.bytes = grown;
			}
			this.bytes.set(value, this.size);
			this.size += value.length;
			this.parse();
			this.notify();
		}
		this.done = true;
		this.notify();
	}

	notify(){
		this.waiters.splice(0).forEach(resolve => resolve());
	}

	// Indexes the byte offset of every audio frame, skipping the ID3 tag and the Xing/Info header frame
	parse(){
		const b = this.bytes;
		if (this.scan < 0) {
			if (this.size < 10)
				return;
			const id3 = b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33;
			this.scan = id3 ? 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127)) : 0;
		}
		while (this.scan + 4 <= this.size) {
			const i = this.scan;
			const bitrate = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][b[i + 2] >> 4];
			const rate = [44100, 48000, 32000][(b[i + 2] >> 2) & 3];
			if (b[i] !== 0xFF || (b[i + 1] & 0xFE) !== 0xFA || !bitrate || !rate) {
				this.scan++;
				continue;
			}
			const length = Math.floor(144000 * bitrate / rate) + ((b[i + 2] >> 1) & 1);
			if (i + length > this.size)
				break;
			this.scan += length;
			if (!this.sampleRate) {
				this.sampleRate = rate;
				const tag = i + 4 + ((b[i + 3] >> 6) === 3 ? 17 : 32);
				if (["Xing", "Info"].includes(String.fromCharCode(...b.subarray(tag, tag + 4))))
					continue;
			}
			this.frames.push(i);
			this.framesEnd = i + length;
		}
	}

	start(){
		if (this.playing)
			return;
		this.playing = true;
		this.load();
		this.pump();
		this.pumpTimer = setInterval(() => this.pump(), 1000);
	}

	// Stops playback; the next start() resumes from the chunk that was audible
	stop(){
		if (!this.playing)
			return;
		this.playing = false;
		this.session++;
		clearInterval(this.pumpTimer);
		const now = this.ctx.currentTime;
		const current = this.queue.find(c => c.end > now);
		if (current)
			this.frame = current.frame;
		this.queue.forEach(c => c.source.stop());
		this.queue = [];
	}

	// Keeps AHEAD seconds of decoded chunks scheduled back to back
	async pump(){
		if (this.pumping)
			return;
		this.pumping = true;
		const session = this.session;
		try {
			while (this.playing && session === this.session) {
				const now = this.ctx.currentTime;
				this.queue = this.queue.filter(c => c.end > now);
				if (this.queue.length && this.nextTime - now > MusicTrack.AHEAD)
					break;
				const first = this.frame;
				const chunk = await this.decode(first);
				if (!chunk || session !== this.session)
					break;
				if (!this.queue.length)
					this.nextTime = this.ctx.currentTime + 0.05;
				const source = this.ctx.createBufferSource();
				source.buffer = chunk.buffer;
				source.connect(this.gain);
				source.start(this.nextTime);
				this.nextTime += chunk.buffer.duration;
				this.queue.push({ source, frame: chunk.first, end: this.nextTime });
				this.frame = chunk.next;
			}
		} catch (e) {
			console.warn(`Music ${this.url} failed to decode:`, e);
		} finally {
			this.pumping = false;
			if (this.playing && session !== this.session)
				this.pump();
		}
	}

	// Decodes CHUNK frames from `first` (wrapping to the start at the end of the file)
	async decode(first){
		const { FRAME, CHUNK, OVERLAP } = MusicTrack;
		while (!this.done && this.frames.length < first + CHUNK + OVERLAP)
			await new Promise(resolve => this.waiters.push(resolve));
		if (this.failed || !this.frames.length)
			return null;
		if (first >= this.frames.length)
			first = 0;
		const last = Math.min(first + CHUNK, this.frames.length);
		const from = Math.max(0, first - OVERLAP), to = Math.min(this.frames.length, last + OVERLAP);
		const bytes = this.bytes.slice(this.frames[from], to < this.frames.length ? this.frames[to] : this.framesEnd);
		// Decoding at the file's own rate keeps samples aligned to frames
		this.decoder ??= new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 1, this.sampleRate);
		const decoded = await this.decoder.decodeAudioData(bytes.buffer);
		const skip = (first - from) * FRAME;
		const count = Math.min((last - first) * FRAME, decoded.length - skip);
		const buffer = this.ctx.createBuffer(decoded.numberOfChannels, count, decoded.sampleRate);
		for (let ch = 0; ch < decoded.numberOfChannels; ch++)
			buffer.copyToChannel(decoded.getChannelData(ch).subarray(skip, skip + count), ch);
		return { buffer, first, next: last };
	}
}

class AudioManager
{
	static source = {};

	static init()
	{
		[
			'turn_me', 'turn_op', "ui_card", 'ui_card_bank', 'open', 'draw',
			'clear', 'fog', 'frost', 'rain', 
			'horn', 'spy', 'medic', 'morale', 'scorch', 'bond', 'decoy', "mardroeme", 'muster',
			'hero', 'common_close', 'common_ranged', 'common_siege', 'redraw', 'discard',
			'pass', 'warning', 'menu_opening', 'game_opening', 'game_start', 'round1_start',
			'round_win', 'round_lose', 'game_win', 'game_lose', 'coin'
		].forEach(s => {
			const audio = getAudio(s);
			audio.preload = "auto";
			AudioManager.source[s] = audio;
		});
	}

	static async play(key, waitTime = -1, forceWait = false)
	{
		if (AudioManager.source[key])
		{
			const audio = AudioManager.source[key];
			if (!audio)
				return;
			if (audio instanceof Audio)
			{
				const isPlaying = audio.currentTime > 0 && !audio.paused && !audio.ended 
				if (isPlaying)
				{
					audio.pause();
					audio.currentTime = 0;
				}
				if (waitTime === -1 || (!forceWait && waitTime >= audio.duration * 1000))
					return await asyncAudio(audio);
				else
				{
					if (userInteracted)
						audio.play().catch(() => {});
					return await sleep(waitTime);
				}
			}
		}
		else
		{
			return await playAudio(key)
		}
	}

	static async playSFX(key, waitTime = -1, forceWait = false)
	{
		if (Settings.soundEffects.isEnabled() && !Online.replaying)
		{
			return await AudioManager.play(key, waitTime, forceWait);
		}
	}
}

class ToggleOption
{
	constructor(key, enableByDefault = true, action = ()=>{})
	{
		this.key = key;
		const saved = localStorage?.getItem(this.key);
		this.enabled = (saved !== null && saved !== undefined) ? saved==="true" : enableByDefault;
		this.action = action;
	}
	isEnabled() { return this.enabled; }
	setEnabled(enable)
	{
		if (this.enabled === enable)
		{
			return;
		}
		this.enabled = enable;
		if (localStorage)
		{
			localStorage.setItem(this.key, this.enabled);
		}
		this.action(this.enabled);
	}
	enable() { this.setEnabled(true); }
	disable() { this.setEnabled(false); }
	toggle() { this.setEnabled(!this.enabled); }
}

class SavedObject
{
	constructor(key, defaultValue = {}, action = ()=>{})
	{
		this.key = key;
		if (typeof defaultValue === "string" || defaultValue instanceof String)
			defaultValue = JSON.parse(defaultValue);
		let saved = null;
		try {
			saved = JSON.parse(localStorage?.getItem(this.key) ?? "null");
		} catch (e) {
			console.warn(`Discarding corrupt saved data for "${key}"`, e);
			localStorage?.removeItem(this.key);
		}
		this.obj = (saved !== null && typeof saved === "object") ? saved : defaultValue;
		this.action = action;
	}
	get()
	{
		return this.obj;
	}
	set(newObj)
	{
		if (!this.key)
		{
			return;
		}
		if (newObj === null || newObj === undefined)
		{
			newObj = {};
		}
		this.obj = newObj;
		localStorage?.setItem(this.key, JSON.stringify(newObj));
		if (this.action)
			this.action(this.obj);
	}
	clear()
	{
		this.obj = {};
		localStorage?.removeItem(this.key);
	}
}

class SavedDeck extends SavedObject
{
	constructor(key, defaultValue = {}, action = ()=>{})
	{
		super(key, defaultValue, action);
	}
	get()
	{
		const temp_deck = {...super.get()};
		if (temp_deck.cards)
		{
			temp_deck.cards = temp_deck.cards.map(c => ({index: c[0], count: c[1]}) );
		}
		return temp_deck;
	}
	set(newObj)
	{
		const temp_deck = {...newObj};
		temp_deck.cards = newObj.cards.map(c => [c.index, c.count]);
		super.set(temp_deck);
	}
	setCards(cards)
	{
		const deck = super.get();
		deck.cards = cards.map(c => [c.index, c.count]);
		super.set(deck);
	}
	setLeader(leader)
	{
		const deck = super.get();
		deck.leader = leader.index;
		super.set(deck);
	}
}

class SavedString
{
	constructor(key, defaultValue = "", action = ()=>{})
	{
		this.key = key;
		let saved = localStorage?.getItem(this.key);
		if (saved === null || saved === undefined)
			saved = defaultValue;
		this.value = saved;
		this.action = action;
	}
	get() { return this.value; }
	set(newValue)
	{
		if (this.value === newValue)
			return;
		this.value = newValue;
		localStorage?.setItem(this.key, newValue);
		if (this.action)
			this.action(this.value);
	}
}

class Settings
{
	static music = new ToggleOption("gc-music", true);
	static notifications = new ToggleOption("gc-notifications", true);
	static soundEffects = new ToggleOption("gc-sound-effects", true);
	static effects = new ToggleOption("gc-effects", true);
	static lastFaction = new SavedString("gc-last-faction", "realms"); 
	static p2LastFaction = new SavedString("gc-p2-last-faction", "monsters");
	static aiDifficulty = new SavedString("gc-ai-difficulty", "normal");
	static gameMode = new SavedString("gc-game-mode", "ai");
	static onlineName = new SavedString("gc-online-name", "");
	static onlineTimer = new SavedString("gc-online-timer", "60");
	static onlineRules = new SavedString("gc-online-rules", "");
	static realmsDeck = new SavedDeck("gc-deck-realms", premade_deck[0]);
	static nilfgaardDeck = new SavedDeck("gc-deck-nilfgaard", premade_deck[2]);
	static monstersDeck = new SavedDeck("gc-deck-monsters", premade_deck[4]);
	static scoiataelDeck = new SavedDeck("gc-deck-scoiatael", premade_deck[6]);
	static skelligesDeck = new SavedDeck("gc-deck-skellige", premade_deck[8]);
	// Pass and play: Player 2 keeps their own deck per faction
	static p2Decks = Object.fromEntries(["realms", "nilfgaard", "monsters", "scoiatael", "skellige"]
		.map((f, i) => [f, new SavedDeck("gc-p2-deck-" + f, premade_deck[2 * i])]));
	
	// owner is "p1" or "p2"
	static getLastFaction(owner = "p1")
	{
		return owner === "p2" ? Settings.p2LastFaction : Settings.lastFaction;
	}
	
	static getFactionSettings(factionName, owner = "p1")
	{
		if (owner === "p2")
			return Settings.p2Decks[factionName] ?? null;
		switch(factionName) {
			case "realms":
				return Settings.realmsDeck;
			case "nilfgaard":
				return Settings.nilfgaardDeck;
			case "monsters":
				return Settings.monstersDeck;
			case "scoiatael":
				return Settings.scoiataelDeck;
			case "skellige":
				return Settings.skelligesDeck;
		}
		return null;
	}
}

class GameEvent
{
	constructor(id, signature)
	{
		this.id = id;
		this.signature = signature;
		if (!signature)
		{
			throw "Must pass in a signature as an array of param names";
		}
	}
	bind(listenter)
	{
		window.addEventListener(this.id, listenter);
	}
	unbind(listenter)
	{
		window.removeEventListener(this.id, listenter);
	}
	dispatch(...params)
	{
		const detail = {};
		for (let i = 0; i < params.length && i < this.signature.length; i++)
		{
			detail[this.signature[i]] = params[i];
		}
		window.dispatchEvent(new CustomEvent(this.id, {detail: detail}));
	}
}

class EventManager 
{
	static rowSelected;
	static previewCancelled;

	constructor()
	{
		EventManager.rowSelected = new GameEvent("row-selected", ['row', 'player'])
		EventManager.previewCancelled = new GameEvent("preview-cancelled", []);
		EventManager.gameOpened = new GameEvent("game-opened", []);
		EventManager.customizationOpened = new GameEvent('customize-opened', []);
		EventManager.roundPassed = new GameEvent('round-passed', ['player', 'round']);
		EventManager.roundStarted = new GameEvent('round-started', ['round', 'starting-player']);
		EventManager.roundEnded = new GameEvent('round-ended', ['round', 'points-me', 'points-op']);
		EventManager.gameStateChanged = new GameEvent('game-state-changed', ['oldState', 'newState']);
	}
}

// Translates a card between two containers
async function translateTo(card, container_source, container_dest){
	if (!container_dest || !container_source)
		return;
	if (container_dest instanceof HandAI && container_source instanceof Deck)
		return;
	
	let elem = card.elem;
	let source = !container_source ? card.elem : getSourceElem(card, container_source, container_dest);
	let dest = getDestinationElem(card, container_source, container_dest);
	if (!isInDocument(elem))
		source.appendChild(elem);
	let x = trueOffsetLeft(dest) - trueOffsetLeft(elem) +dest.offsetWidth/2 - elem.offsetWidth;
	let y = trueOffsetTop(dest) - trueOffsetTop(elem) +dest.offsetHeight/2 - elem.offsetHeight/2;
	if (container_dest instanceof Row && container_dest.cards.length !== 0 && !card.isSpecial() ){
		x += (container_dest.getSortedIndex(card) === container_dest.cards.length) ? elem.offsetWidth/2 : -elem.offsetWidth/2;
	}
	if (card.holder.hand instanceof HandAI)
		x += elem.offsetWidth/2;
	if (container_source instanceof Row && container_dest instanceof Grave && !card.isSpecial()) {
		let mid = trueOffset(container_source.elem, true) + container_source.elem.offsetWidth/2;
		x += trueOffset(elem, true) - mid;
	}
	if (container_source instanceof Row && container_dest instanceof Hand)
		y *= 7/8;
	if (container_source instanceof Deck || container_source instanceof HandAI)
		fx.flash(elem, "flip-in", 500);
	await translate(elem, x, y);
	
	// Returns true if the element is visible in the viewport
	function isInDocument(elem){
		return elem.getBoundingClientRect().width !== 0;
	}
	
	// Returns the true offset of a nested element in the viewport
	function trueOffset(elem, left){
		let total =0
		let curr = elem;
		while (curr){
			total += (left ? curr.offsetLeft : curr.offsetTop);
			curr = curr.parentElement;
		}
		return total;
	}
	function trueOffsetLeft(elem) {	return trueOffset(elem, true); }
	function trueOffsetTop(elem) { return trueOffset(elem, false); }
	
	// Returns the source container's element to transition from
	function getSourceElem(card, source, dest){
		if (source instanceof HandAI)
			return source.hidden_elem;
		if (source instanceof Deck)
			return source.elem.children[source.elem.children.length-2];
		return source.elem;
	}

	// Returns the destination container's element to transition to
	function getDestinationElem(card, source, dest){
		if (dest instanceof HandAI)
			return dest.hidden_elem;
		if (card.isSpecial() && dest instanceof Row)
			return dest.elem_special;
		if (dest instanceof Row || dest instanceof Hand || dest instanceof Weather){
			if (dest.cards.length === 0)
				return dest.elem;
			let index = dest.getSortedIndex(card);
			let dcard = dest.cards[index === dest.cards.length ? index-1 : index];
			return dcard.elem;
		}
		return dest.elem;
	}
}

// Translates an element by x from the left and y from the top
async function translate(elem, x, y){
	const width = elem.offsetWidth;
	const margin = elem.style.marginLeft;
	elem.style.transform = "translate(" + x + "px, " + y + "px)";
	elem.style.marginRight = -width + "px";
	elem.style.marginLeft = "";
	await sleep(499);
	elem.style.transform = "";
	elem.style.position = "";
	elem.style.marginLeft = margin;
	elem.style.marginRight = margin;
}

// Fades out an element until hidden over the duration
async function fadeOut(elem, duration) {
	await fade(false, elem, duration);
}

// Fades in an element until opaque over the duration
async function fadeIn(elem, duration){
	await fade(true, elem, duration);
}

// Fades an element over a duration 
async function fade(fadeIn, elem, dur){
	if (!elem)
		return;
	dur *= Online.timeScale;
	return new Promise(res => {
		const startingOpacity = toInteger(elem.style.opacity);
		const endOpacity = fadeIn ? 1 : 0;
		const startTime = Date.now();
		const endTime = startTime + dur;
		if (fadeIn)
			elem.classList.remove('hide');
		const timer = setInterval(() => {
			const currTime = Date.now();
			const op = clamp(startingOpacity, endOpacity, map(startTime, endTime, startingOpacity, endOpacity, currTime));
			elem.style.opacity = op;
			if (op === endOpacity)
			{
				clearInterval(timer);
				if (!fadeIn)
					elem.classList.add('hide');
				res();
			}
		}, DUR_FADE_STEP);
	});
}

//      Get Image paths   
function iconURL(name, ext = "png"){
	return imgURL("icons/" + name, ext);
}
// url() inside a custom property resolves against the stylesheet that uses it, so make it absolute
function absoluteIconURL(name, ext = "png"){
	return "url('" + new URL("img/icons/" + name + "." + ext, document.baseURI).href + "')";
}
function largeURL(name, ext="jpg"){
	return imgURL("lg/" + name, ext) 
}
function smallURL(name, ext="jpg"){
	return imgURL("sm/" + name, ext);
}
function imgURL(path, ext) {
	return "url('img/" + path + "." + ext + "')";
}

// get sound effect path
function audioURL(name, ext = "mp3") {
	if (typeof name === "string" || name instanceof String)
	{
		if (name.includes('.'))
		{
			return "sfx/" + name; 
		}
	}
	else if (name['name'])
	{
		if (name['ext'])
		{
			ext = name['ext'];
		}
		name = name['name'];
	}
	return "sfx/" + name + "." + ext;
}

// Get audio instance
function getAudio(name, ext = "mp3")
{
	return new Audio(audioURL(name, ext));
}
// Play sound effect
async function playAudio(name, ext = "mp3")
{
	return await asyncAudio(getAudio(name, ext));
}

function asyncAudio(audio)
{
	if (!userInteracted || !audio)
		return
	// addEventListener so concurrent plays of the same element all resolve; failed play() must not hang callers
	return new Promise(r => {
		audio.addEventListener('ended', r, {once: true});
		audio.play().catch(r);
	});
}

// Pauses execution until the passed number of milliseconds as expired. Online replays run sped up.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms * Online.timeScale));
  //return new Promise(resolve => setTimeout(() => {if (func) func(); return resolve();}, ms));
}

// Suspends execution until the predicate condition is met, checking every ms milliseconds
function sleepUntil(predicate, ms) {
	return new Promise(resolve => {
		let timer = setInterval( function () {
			if (predicate()) {
				clearInterval(timer);
				resolve();
			}
		}, ms)
	});
}

/*----------------------------------------------------*/


const eventManager = new EventManager(); 
let userInteracted = false;
var ui = new UI();
ui.initMusic();
var board = new Board();
var weather = new Weather();
var game = new Game();
var player_me, player_op;
AudioManager.init();

ui.enablePlayer(false);
let dm = new DeckMaker();

const titleScreen = document.getElementById("title-screen");
let titleHideTimer;
function closeTitleScreen() {
	userInteracted = true;
	document.getElementById("deck-customization").classList.remove("hide");
	document.body.classList.remove("title-open");
	titleScreen.classList.add("leaving");
	titleHideTimer = setTimeout(() => titleScreen.classList.add("hide"), 600);
}
// Local Play opens the deck builder in the last used mode; AI or Pass and Play is picked there
document.getElementById("title-play").addEventListener("click", () => {
	closeTitleScreen();
	document.body.classList.remove("deck-only");
	dm.setGameMode(Settings.gameMode.get(), true);
	AudioManager.playSFX("menu_opening");
}, false);
// Deck Builder from the title is for editing only: opponent options and Start game are hidden (css: body.deck-only)
document.getElementById("title-deck").addEventListener("click", () => {
	closeTitleScreen();
	document.body.classList.add("deck-only");
	AudioManager.playSFX("menu_opening");
}, false);
function openTitleScreen(sfx = true) {
	document.body.classList.add("title-open");
	clearTimeout(titleHideTimer);
	titleScreen.classList.remove("hide");
	void titleScreen.offsetWidth; // reflow so the opacity transition runs
	titleScreen.classList.remove("leaving");
	if (sfx)
		AudioManager.playSFX("menu_opening");
}
document.getElementById("deck-back").addEventListener("click", async () => {
	if (Online.connected && !await ui.confirm("Leave the room?", "You will be disconnected from " + Online.opponentName + ".", "Leave", "Stay"))
		return;
	Online.leave();
	openTitleScreen();
}, false);
["#title-play", "#title-online", "#title-deck", "#deck-back"].forEach(addMouseEnterSFXBySelector);

// Chromium offers installs via beforeinstallprompt (only after some engagement), otherwise via its menu;
// iOS Safari only via Share > Add to Home Screen.
const installButton = document.getElementById("title-install");
let installPrompt = window.earlyInstallPrompt || null;
const runningAsApp = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);
installButton.classList.toggle("hide", runningAsApp || !(isIOS || isAndroid || installPrompt));
if (!runningAsApp && navigator.getInstalledRelatedApps)
	navigator.getInstalledRelatedApps().then(apps => apps.length && installButton.classList.add("hide"), () => {});
window.addEventListener("beforeinstallprompt", e => {
	e.preventDefault();
	installPrompt = e;
	installButton.classList.remove("hide");
});
window.addEventListener("appinstalled", () => {
	installPrompt = null;
	installButton.classList.add("hide");
});
installButton.addEventListener("click", () => {
	if (!installPrompt)
		return isIOS
			? ui.alert("Install Gwent", "Tap the Share button in Safari, then choose \"Add to Home Screen\".")
			: ui.alert("Install Gwent", "Open the browser menu (⋮) and choose \"Install app\".");
	const prompt = installPrompt;
	// A prompt can only be shown once; the browser fires a fresh beforeinstallprompt if it is dismissed.
	installPrompt = null;
	// Android keeps the button: without a prompt it explains the menu route
	installButton.classList.toggle("hide", !isAndroid);
	prompt.prompt().catch(err => {
		console.warn("Install prompt failed:", err);
		installPrompt = prompt;
		installButton.classList.remove("hide");
	});
});
addMouseEnterSFXBySelector("#title-install");

// How-to-play guide: the chapter list is built from the .guide-page articles (data-group/name/icon)
const guide = {
	elem: document.getElementById("guide"),
	pages: [...document.querySelectorAll("#guide .guide-page")],
	tabs: [],
	index: 0,
	returnFocus: null,
	isOpen() { return !this.elem.classList.contains("hide"); },
	open() {
		this.returnFocus = document.activeElement;
		this.elem.classList.remove("hide");
		this.show(this.index);
		this.tabs[this.index].focus();
		AudioManager.playSFX("menu_opening");
	},
	close() {
		this.elem.classList.add("hide");
		this.returnFocus?.focus?.();
	},
	show(i) {
		this.index = Math.max(0, Math.min(this.pages.length - 1, i));
		this.pages.forEach((p, j) => p.classList.toggle("hide", j !== this.index));
		this.tabs.forEach((t, j) => {
			t.classList.toggle("active", j === this.index);
			t.toggleAttribute("aria-current", j === this.index);
		});
		document.getElementById("guide-count").textContent = (this.index + 1) + " / " + this.pages.length;
		document.getElementById("guide-prev").disabled = this.index === 0;
		document.getElementById("guide-next").innerHTML = this.index === this.pages.length - 1 ? "Done" : "Next &rsaquo;";
		this.elem.querySelector(".guide-pages").scrollTop = 0;
	}
};
{
	const nav = guide.elem.querySelector(".guide-nav");
	guide.pages.forEach((page, i) => {
		if (page.dataset.group) {
			const group = document.createElement("p");
			group.className = "guide-group";
			group.textContent = page.dataset.group;
			nav.appendChild(group);
		}
		const tab = document.createElement("button");
		const icon = document.createElement("img");
		icon.src = page.dataset.icon;
		icon.alt = "";
		tab.append(icon, page.dataset.name);
		tab.addEventListener("click", () => guide.show(i));
		nav.appendChild(tab);
		guide.tabs.push(tab);
	});
	document.getElementById("open-guide").addEventListener("click", () => guide.open());
	document.getElementById("guide-close").addEventListener("click", () => guide.close());
	document.getElementById("guide-prev").addEventListener("click", () => guide.show(guide.index - 1));
	document.getElementById("guide-next").addEventListener("click", () => guide.index === guide.pages.length - 1 ? guide.close() : guide.show(guide.index + 1));
	// Clicking the dimmed backdrop (outside the panel) closes it
	guide.elem.addEventListener("click", e => e.target === guide.elem && guide.close());
	addMouseEnterSFXBySelector("#guide button");
}


// Touch pointerdown doesn't grant user activation (only pointerup/touchend/click do), so retry on those
// and keep retrying until the music actually plays.
const activationEvents = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
function onFirstInput() {
	userInteracted = true;
	if (Settings.music.isEnabled() && ui.isMusicPlaying()) {
		activationEvents.forEach(t => document.removeEventListener(t, onFirstInput, true));
		return;
	}
	ui.applyMusicSetting();
}
activationEvents.forEach(t => document.addEventListener(t, onFirstInput, true));

// Touch devices: pin landscape and go fullscreen on the first tap, and on taps while held in portrait (the rotate hint).
// The manifest has no "orientation" (with it, Android showed Chrome's icon in recents), so landscape is locked here.
let landscapeTried = false;
function lockLandscape(e) {
	if (!matchMedia("(pointer: coarse)").matches || !screen.orientation?.lock)
		return document.removeEventListener("click", lockLandscape, true);
	// requestFullscreen consumes the tap's user activation, which the install prompt needs.
	if (e.target.closest?.("#title-install"))
		return;
	const app = matchMedia("(display-mode: standalone)").matches;
	if (landscapeTried && !matchMedia("(orientation: portrait)").matches && !(app && !document.fullscreenElement))
		return;
	landscapeTried = true;
	const ready = document.fullscreenElement ? null : document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
	Promise.resolve(ready).then(() => screen.orientation.lock("landscape")).catch(() => {});
}
document.addEventListener("click", lockLandscape, true);

// Fullscreen on Android: pulling down the status bar shrinks the viewport for a moment, which would resize the
// whole stage. Small height-only drops keep the full size; rotation and the keyboard (big drops) still resize.
let stageSize = null;
function keepStageSize() {
	const root = document.documentElement.style;
	const fullscreen = matchMedia("(display-mode: fullscreen)").matches || document.fullscreenElement;
	if (!fullscreen || !matchMedia("(pointer: coarse)").matches) {
		stageSize = null;
		root.removeProperty("--app-w");
		root.removeProperty("--app-h");
		return;
	}
	const w = innerWidth, h = innerHeight;
	if (!stageSize || stageSize.w !== w || h > stageSize.h || h < stageSize.h * 0.85)
		stageSize = { w, h };
	root.setProperty("--app-w", stageSize.w + "px");
	root.setProperty("--app-h", stageSize.h + "px");
}
addEventListener("resize", keepStageSize);
document.addEventListener("fullscreenchange", keepStageSize);
keepStageSize();

// Keyboard controls: Enter/Space activate focused controls; arrows/Enter/Escape drive the carousel; Escape closes previews
document.addEventListener("keydown", e => {
	if (Popup.curr)
		return;
	if (guide.isOpen()) {
		if (e.key === "Escape")
			guide.close();
		else if (e.key === "ArrowLeft" || e.key === "ArrowRight")
			guide.show(guide.index + (e.key === "ArrowLeft" ? -1 : 1));
		else if (e.key === "Tab") {
			// Keep focus inside the dialog
			const focusable = [...guide.elem.querySelectorAll("button:not(:disabled)")];
			const i = focusable.indexOf(document.activeElement);
			const next = (i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
			focusable[i === -1 ? 0 : next].focus();
		} else
			return;
		e.preventDefault();
		return;
	}
	const carousel = Carousel.curr;
	if (carousel) {
		const moves = {ArrowLeft: -1, ArrowRight: 1};
		if (e.key in moves)
			carousel.shift(e, moves[e.key]);
		else if (e.key === "Enter" || e.key === " ")
			carousel.select(e);
		else if (e.key === "Escape")
			carousel.cancel();
		else
			return;
		e.preventDefault();
		return;
	}
	if (e.key === "Escape" && ui.previewCard && !document.getElementById("click-background").classList.contains("noclick")) {
		e.preventDefault();
		ui.cancel();
		return;
	}
	const target = e.target;
	if ((e.key === "Enter" || e.key === " ") && target.getAttribute?.("role") === "button" && target.tagName !== "BUTTON"
			&& !target.closest(".noclick, .hide")) {
		e.preventDefault();
		target.click();
	}
});

window.addEventListener("unhandledrejection", e => console.error("Unhandled game error:", e.reason));
