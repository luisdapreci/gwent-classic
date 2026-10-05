"use strict"

var ability_dict = {
	clear: {
		name: "Clear Weather",
		description: "Removes all Weather Cards (Biting Frost, Impenetrable Fog and Torrential Rain) effects. ",
		audio: "clear"
	},
	frost: {
		name: "Biting Frost",
		description: "Sets the strength of all Close Combat cards to 1 for both players. ",
		audio: "frost"
	},
	fog: {
		name: "Impenetrable Fog",
		description: "Sets the strength of all Ranged Combat cards to 1 for both players. ",
		audio: "fog"
	},
	rain: {
		name: "Torrential Rain",
		description: "Sets the strength of all Siege Combat cards to 1 for both players. ",
		audio: "rain"
	},
	storm: {
		name: "Skellige Storm",
		description: "Reduces the Strength of all Range and Siege Units to 1. ",
		audio: "rain"
	},
	hero: {
		name: "hero",
		description: "Not affected by any Special Cards or abilities. "
	},
	decoy: {
		name: "Decoy",
		audio: "decoy",
		description: "Swap with a card on the battlefield to return it to your hand. "
	},
	horn: {
		name: "Commander's Horn",
		description: "Doubles the strength of all unit cards in that row. Limited to 1 per row. ",
		audio: "horn",
		placed: async card => {
			await card.animate("horn");
		}
	},
	mardroeme: {
		name: "Mardroeme",
		description: "Triggers transformation of all Berserker cards on the same row. ",
		placed: async (card, row) => {
			const berserkers = row.findCards(c => c.abilities.includes("berserker"));
			await Promise.all(berserkers.map(async c => await ability_dict["berserker"].placed(c, row)));
		}
	},
	berserker: {
		name: "Berserker",
		description: "Transforms into a bear when a Mardroeme card is on its row. ",
		placed: async (card, row) => {
			if (row.effects.mardroeme === 0)
				return;
			row.removeCard(card);
			const cardId = card.name.indexOf("Young") === -1 ? 206 : 207;
			const bear = new Card(card_dict[cardId], card.holder);
			bear.uid = card.uid + "b";
			bear.removed.push(() => ability_dict["berserker"].revert(bear, card));
			await row.addCard(bear);
		},
		// The bear is a token: once it leaves the board (to the grave, or to hand via Decoy) the original Berserker takes its place
		revert: (bear, original) => queueMicrotask(() => {
			if (!game.isPlaying())
				return;
			for (const container of [bear.holder.grave, bear.holder.hand]) {
				if (!container.cards.includes(bear))
					continue;
				container.removeCard(bear);
				container.addCard(original);
			}
		})
	},
	vildkarrl: {
		placed: async (card, row) => {
			if (card.abilities.includes('vildkarrl'))
			{
				card.abilities.remove('vildkarrl');
				await AudioManager.playSFX("mardroeme", 1000);
				setTimeout(()=>card.placed.remove(ability_dict['vildkarrl'].placed), 5000);
			}
		}
	},
	scorch: {
		name: "Scorch",
		description: "Discard after playing. Kills the strongest card(s) on the battlefield. ",
		activated: async card => {	
			await ability_dict["scorch"].placed(card);
			await board.toGrave(card, card.holder.hand);
		},
		placed: async (card, row) => {
			// A unit with Scorch (Clan Dimun Pirate) doesn't burn itself
			let maxUnits = board.row.map( r => [r,r.maxUnits(card)] ).filter( p => p[1].length > 0);
			let maxPower = maxUnits.reduce( (a,p) => Math.max(a, p[1][0].power), 0 );
			let scorched = maxUnits.filter( p => p[1][0].power === maxPower);
			let cards = scorched.reduce( (a,p) => a.concat( p[1].map(u => [p[0], u])), []);
			
			if (cards.length)
			{
				await Promise.all(cards.map( async u => await u[1].animate("scorch", true, false)) );
				await Promise.all(cards.map( async u => await board.toGrave(u[1], u[0])) );
			}
		}
	},
	scorch_c: {
		name: "Scorch - Close Combat",
		description: "Destroy your enemy's strongest Close Combat unit(s) if the combined strength of all his or her Close Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "close", card.holder.opponent()).scorch()
	},
	scorch_r: {
		name: "Scorch - Ranged",
		description: "Destroy your enemy's strongest Ranged Combat unit(s) if the combined strength of all his or her Ranged Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "ranged", card.holder.opponent()).scorch()
	},
	scorch_s: {
		name: "Scorch - Siege",
		description: "Destroys your enemy's strongest Siege Combat unit(s) if the combined strength of all his or her Siege Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "siege", card.holder.opponent()).scorch()
	},
	agile: {
		name:"agile", 
		description: "Can be placed in either the Close Combat or the Ranged Combat row. Cannot be moved once placed. "
	},
	muster: {
		name:"muster", 
		description: "Find any cards with the same name in your deck and play them instantly. ",
		// Name prefix shared by the cards a muster card summons
		group: card => card.muster ?? (card.name.includes('-') ? card.name.substring(0, card.name.indexOf('-')) : card.name),
		placed: async (card) => {
			const cardName = ability_dict["muster"].group(card);
			let pred = c => c.name.startsWith(cardName);
			let units = card.holder.deck.getCards(pred).map( x => [card.holder.deck, x] );
			if (units.length === 0)
				return;
			await card.animate("muster");
			// the muster sound already covers the summoned cards
			await Promise.all( units.map( async p =>  await board.addCardToRow(p[1], p[1].row, p[1].holder, p[0], true)));
		}
	},
	spy: {
		name: "spy",
		description: "Place on your opponent's battlefield (counts towards your opponent's total) and draw 2 cards from your deck. ",
		audio: "spy",
		placed: async (card) => {
			await card.animate("spy");
			for (let i=0;i<2;i++) {
				if (card.holder.deck.cards.length > 0)
					await card.holder.deck.draw(card.holder.hand);
			}
			card.holder = card.holder.opponent();
			AudioManager.playSFX('draw');
		}
	},
	medic: {
		name: "medic",
		description: "Choose one card from your discard pile and play it instantly (no Heroes or Special Cards). ",
		audio: "medic",
		placed: async (card) => {
			let grave = board.getRow(card, "grave", card.holder);
			let units = card.holder.grave.findCards(c => c.isUnit());
			if (units.length <= 0)
				return;
			let wrapper = {card : null};
			if (game.randomRespawn) {
				const cards = grave.findCardsRandom(c => c.isUnit(), 1, card.holder.rng);
				if (cards.length > 0)
					wrapper.card = cards[0];
			} else if (card.holder.controller instanceof ControllerAI)
				wrapper.card =  card.holder.controller.medic(card, grave);
			else
				await Online.carousel(card.holder, "medic", card.holder.grave, 1, (c, i) => wrapper.card=c.cards[i], c => c.isUnit(), true);
			if (wrapper.card)
			{
				// move card visual to top of grave
				const res = wrapper.card;
				grave.removeCard(res);
				grave.addCard(res);
				let selectedRow = null;
				const isAgile = wrapper.card.row === "agile";
				if (isAgile)
				{
					if (card.holder.controller instanceof ControllerAI)
					{
						selectedRow = card.holder.controller.determineAgileRow(res);
					}
					else
					{
						selectedRow = await Online.rowChoice(card.holder, wrapper.card);
						if (!selectedRow)
						{
							return;
						}
					}

				}
				await res.animate("medic");
				if (isAgile)
				{
					await board.moveTo(res, selectedRow, grave);
				}
				else
				{
					await res.autoplay(grave);
				}
			}
		}
	},
	morale: {
		name: "Morale",
		description: "Adds +1 to all units in the row (excluding itself). ",
		audio: "morale",
		placed: async card => {
			await card.animate("morale");
		}
	},
	bond: {
		name: "Tight Bond",
		description: "Place next to a card with the same name to double the strength of both cards. ",
		audio: "bond",
		placed: async card => {
			let bonds = board.getRow(card, card.row, card.holder).findCards(c => c.name === card.name);
			if (bonds.length > 1)
				await Promise.all( bonds.map(c => c.animate("bond")) );
		}
	},
	avenger: {
		name: "Avenger",
		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
		removed: async (card) => {
			if (!game.summonsAllowed())
				return;
			let bdf = new Card(card_dict[21], card.holder);
			bdf.uid = card.uid + "a" + (card.summons = (card.summons ?? 0) + 1);
			bdf.removed.push(() => ability_dict["avenger"].vanish(bdf));
			await board.addCardToRow(bdf, "close", card.holder);
		},
		// The summon is a token: it leaves the game instead of staying in the grave
		// (a microtask runs once the move to the grave finishes, at the same point on both online clients)
		vanish: bdf => queueMicrotask(() => {
			// It may have been decoyed to hand instead of sent to the grave
			if (game.isPlaying() && bdf.holder.grave.cards.includes(bdf))
				bdf.holder.grave.removeCard(bdf);
		}),
		// The summon usually arrives at the end of the round, so it's only worth something before the last one
		weight: () => game.roundCount < 3 ? Number(card_dict[21].strength) : 0
	},
	avenger_kambi: {
		name: "Avenger",
		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
		removed: async card => {
			if (!game.summonsAllowed())
				return;
			let bdf = new Card(card_dict[196], card.holder);
			bdf.uid = card.uid + "a" + (card.summons = (card.summons ?? 0) + 1);
			bdf.removed.push(() => ability_dict["avenger"].vanish(bdf));
			await board.addCardToRow(bdf, "close", card.holder);
		},
		weight: () => game.roundCount < 3 ? Number(card_dict[196].strength) : 0
	},
	foltest_king: {
		description: "Pick an Impenetrable Fog card from your deck and play it instantly.",
		canActivate: card => card.holder.deck.cards.some(c => c.name === "Impenetrable Fog"),
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Impenetrable Fog");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "fog")
	},
	foltest_lord: {
		description: "Clear any weather effects (resulting from Biting Frost, Torrential Rain or Impenetrable Fog cards) in play.",
		canActivate: () => weather.cards.length > 0,
		activated: async () => await weather.clearWeather(),
		weight: (card, ai) =>  ai.weightCard( {row:"weather", name:"Clear Weather"} )
	},
	foltest_siegemaster: {
		description: "Doubles the strength of all your Siege units (unless a Commander's Horn is also present on that row).",
		canActivate: card => board.getRow(card, "siege", card.holder).canLeaderHorn(),
		activated: async card => await board.getRow(card, "siege", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "siege", card.holder))
	},
	foltest_steelforged: {
		description: "Destroy your enemy's strongest Siege unit(s) if the combined strength of all his or her Siege units is 10 or more.",
		canActivate: card => board.getRow(card, "siege", card.holder.opponent()).canScorch(),
		activated: async card => await ability_dict["scorch_s"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "siege")
	},
	foltest_son: {
		description: "Destroy your enemy's strongest Ranged Combat unit(s) if the combined strength of all his or her Ranged Combat units is 10 or more.",
		canActivate: card => board.getRow(card, "ranged", card.holder.opponent()).canScorch(),
		activated: async card => await ability_dict["scorch_r"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "ranged")
	},
	emhyr_imperial: {
		description: "Pick a Torrential Rain card from your deck and play it instantly.",
		canActivate: card => card.holder.deck.cards.some(c => c.name === "Torrential Rain"),
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Torrential Rain");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "rain")
	},
	emhyr_emperor: {
		description: "Look at 3 random cards from your opponent's hand.",
		canActivate: card => card.holder.opponent().hand.cards.length > 0,
		activated: async card => {
			// Only shown to the player who activated it, so it doesn't touch the synced online random streams
			if (!card.holder.isHuman() || Online.replaying)
				return;
			let container = new CardContainer();
			container.cards = card.holder.opponent().hand.findCardsRandom(() => true, 3);
			Carousel.curr?.cancel();
			await ui.viewCardsInContainer(container);
		},
		// The AI gains no information, so for it this is a free turn: worth it while ahead
		weight: (card, ai) => card.holder.opponent().hand.cards.length && ai.pointsToLead() <= 0 ? 10 : 0
	},
	emhyr_whiteflame: {
		description: "Cancel your opponent's Leader Ability."
	},
	emhyr_relentless: {
		description: "Draw a card from your opponent's discard pile.",
		canActivate: card => card.holder.opponent().grave.cards.some(c => c.isUnit()),
		activated: async card => {
			let grave = board.getRow(card, "grave", card.holder.opponent());
			if (grave.findCards(c => c.isUnit()).length === 0)
				return;
			if (card.holder.controller instanceof ControllerAI) {
				let newCard = card.holder.controller.medic(card, grave);
				newCard.holder = card.holder;
				await board.toHand(newCard, grave);
				return;
			}
			Carousel.curr?.cancel();
			await Online.carousel(card.holder, "pick", grave, 1, async (c,i) => {
				let newCard = c.cards[i];
				newCard.holder = card.holder;
				await board.toHand(newCard, grave);
			}, c => c.isUnit(), true);
		},
		weight: (card, ai, max, data) => ai.weightMedic(data, 0, card.holder.opponent())
	},
	emhyr_invader: {
		description: "Abilities that restore a unit to the battlefield restore a randomly-chosen unit. Affects both players.",
		gameStart: () => game.randomRespawn = true
	},
	eredin_commander: {
		description: "Double the strength of all your Close Combat units (unless a Commander's horn is 	also present on that row).",
		canActivate: card => board.getRow(card, "close", card.holder).canLeaderHorn(),
		activated: async card => await board.getRow(card, "close", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "close", card.holder))
	},
	eredin_bringer_of_death: {
		name: "Eredin : Bringer of Death",
		description: "Restore a card from your discard pile to your hand.",
		canActivate: card => card.holder.grave.cards.some(c => c.isUnit()),
		activated: async card => {
			let newCard;
			if (card.holder.controller instanceof ControllerAI) {
				newCard = card.holder.controller.medic(card, card.holder.grave)
			} else {
				Carousel.curr?.exit();
				await Online.carousel(card.holder, "pick", card.holder.grave, 1, (c,i) => newCard = c.cards[i], c => c.isUnit(), false, false);
			}
			if (newCard)
				await board.toHand(newCard, card.holder.grave);
		},
		weight: (card, ai, max, data) => ai.weightMedic(data, 0, card.holder)
	},
	eredin_destroyer: {
		description: "Discard 2 card and draw 1 card of your choice from your deck.",
		canActivate: card => card.holder.hand.cards.length >= 2 && card.holder.deck.cards.length > 0,
		activated: async (card) => {
			let hand = board.getRow(card, "hand", card.holder);
			let deck = board.getRow(card, "deck", card.holder);
			if (card.holder.controller instanceof ControllerAI) {
				let cards = card.holder.controller.discardOrder(card).splice(0,2).filter(c => c.basePower < 7);
				await Promise.all(cards.map(async c => await board.toGrave(c, card.holder.hand)));
				const pick = card.holder.controller.bestDeckCard();
				if (pick)
					await board.toHand(pick, deck);
				return;
			} else
				Carousel.curr?.exit();
			await Online.carousel(card.holder, "discard", hand, 2, async (c,i) => await board.toGrave(c.cards[i], c), () => true);
			await Online.carousel(card.holder, "pick", deck, 1, (c,i) => board.toHand(c.cards[i], deck), () => true, true);
		},
		// Two weak cards for the best one in the deck
		weight: (card, ai) => {
			const cards = ai.discardOrder(card).splice(0,2).filter(c => c.basePower < 7);
			const pick = ai.bestDeckCard();
			if (cards.length < 2 || !pick)
				return 0;
			return Math.max(0, pick.basePower - cards[0].basePower - cards[1].basePower);
		}
	},
	eredin_king: {
		description: "Pick any weather card from your deck and play it instantly.",
		canActivate: card => card.holder.deck.cards.some(c => c.faction === "weather"),
		activated: async card => {
			let deck = board.getRow(card, "deck", card.holder);
			if (card.holder.controller instanceof ControllerAI) {
				await ability_dict["eredin_king"].helper(card).card.autoplay(card.holder.deck);
			} else {
				Carousel.curr?.cancel();
				await Online.carousel(card.holder, "pick", deck, 1, (c,i) => board.toWeather(c.cards[i], deck), c => c.faction === "weather", true);
			}
		},
		weight: (card, ai, max) => ability_dict["eredin_king"].helper(card).weight,
		helper: card => {
			let weather = card.holder.deck.cards.filter(c => c.row === "weather").reduce((a,c) =>a.map(c => c.name).includes(c.name) ? a : a.concat([c]), [] );
			
			let out, weight = -1;
			weather.forEach( c => {
				let w = card.holder.controller.weightWeatherFromDeck(c, c.abilities[0]);
				if (w > weight) {
					weight = w;
					out = c;
				}
			});
			return {card: out, weight: weight};
		}			
	},
	eredin_treacherous: {
		description: "Doubles the strength of all spy cards (affects both players).",
		gameStart: () => game.doubleSpyPower = true
	},
	francesca_queen: {
		description: "Destroy your enemy's strongest Close Combat unit(s) if the combined strength of all his or her Close Combat units is 10 or more.",
		canActivate: card => board.getRow(card, "close", card.holder.opponent()).canScorch(),
		activated: async card => await ability_dict["scorch_c"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "close")
	},
	francesca_beautiful: {
		description: "Doubles the strength of all your Ranged Combat units (unless a Commander's Horn is also present on that row).",
		canActivate: card => board.getRow(card, "ranged", card.holder).canLeaderHorn(),
		activated: async card => await board.getRow(card, "ranged", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "ranged", card.holder))
	},
	francesca_daisy: {
		description: "Draw an extra card at the beginning of the battle.",
		placed: card => game.gameStart.push( () => {
			let draw = card.holder.deck.removeCard(0);
			card.holder.hand.addCard( draw );
			return true;
		})
	},
	francesca_pureblood: {
		description: "Pick a Biting Frost card from your deck and play it instantly.",
		canActivate: card => card.holder.deck.cards.some(c => c.name === "Biting Frost"),
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Biting Frost");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "frost")
	},
	francesca_hope: {
		description: "Move agile units to whichever valid row maximizes their strength (don't move units already in optimal row).",
		canActivate: card => ability_dict["francesca_hope"].helper(card).cards.length > 0,
		activated: async card => {
			const close = board.getRow(card, "close");
			const ranged =  board.getRow(card, "ranged");
			const solution = ability_dict["francesca_hope"].helper(card);
			await Promise.all(solution.cards.map(async p => await board.moveTo(p.card, p.row === close ? ranged : close, p.row) ) );
		},
		weight: card => {
			const {score, cards} = ability_dict["francesca_hope"].helper(card);
			return score;
		},
		helper: card => {
			const close = board.getRow(card, "close");
			const ranged = board.getRow(card, "ranged");
			// Heroes are immune to abilities, so agile heroes stay where they are
			const movable = c => c.row === "agile" && !c.hero;
			const agileCards = close.cards.filter(movable).concat(ranged.cards.filter(movable));
			const notAgilePred = c => !movable(c);
			const closeNorm = close.getVirtualCopy(notAgilePred);
			const rangedNorm = ranged.getVirtualCopy(notAgilePred);
			const {score, pattern} = findBest(closeNorm, rangedNorm, agileCards);
			// filter for only cards that need to change row and return
			return {
				score: score,
				cards: agileCards.map((c)=> { return {card: c, row: close.cards.includes(c) ? close : ranged}; })
				.filter((pair, i) => (pair.row === close) !== (pattern[i]===0))
			};

			function findBest(close, ranged, agile, depth = 0, pattern=null)
			{
				if (agile.length === 0)
					return {score: -1, pattern: []};
				else if (agile.length === depth)
				{
					const closeCopy = close.getVirtualCopy();
					const rangedCopy = ranged.getVirtualCopy();
					for (let i=0; i <agile.length; ++i)
					{
						const row = pattern[i] === 0 ? closeCopy : rangedCopy;
						row.cards.push(agile[i]);
						row.updateState(agile[i], true);
					}
					return {score: closeCopy.calcScore() + rangedCopy.calcScore() - (close.calcScore() + ranged.calcScore()), pattern: pattern};
				}
				if (depth === 0)
				{
					pattern = Array(agile.length).fill(0);
				}
				const left = findBest(close, ranged, agile, depth + 1, pattern)
				const modPattern = pattern.slice();
				modPattern[depth] = 1;
				const right = findBest(close, ranged, agile, depth + 1, modPattern);
				return left.score >= right.score ? left : right;
			}
		}
	},
	crach_an_craite: {
		description: "Shuffle all cards from each player's graveyard back into their decks.",
		canActivate: card => card.holder.grave.cards.length > 0 || card.holder.opponent().grave.cards.length > 0,
		activated: async card => {
			AudioManager.playSFX('redraw');
			const own = card.holder.grave, other = card.holder.opponent().grave;
			// Shuffle order must match on both online clients, whose graves are ordered differently
			const ordered = grave => Online.active ? [...grave.cards].sort(Card.byUid) : [...grave.cards];
			await Promise.all([
				...ordered(own).map(c => board.toDeck(c, own)),
				...ordered(other).map(c => board.toDeck(c, other))
			]);
		},
		weight: (card, ai, max, data) => {
			if( game.roundCount < 2)
				return 0;
			let medics = card.holder.hand.findCard(c => c.abilities.includes("medic"));
			if (medics !== undefined)
				return 0;
			let spies = card.holder.hand.findCard(c => c.abilities.includes("spy"));
			if (spies !== undefined)
				return 0;
			if (card.holder.hand.findCard(c => c.abilities.includes("decoy")) !== undefined && (data.medic.length || data.spy.length && card.holder.deck.findCard(c => c.abilities.includes("medic")) !== undefined) )
				return 0;
			return 15;
		}
	},
	king_bran: {
		description: "Units only lose half their Strength in bad weather conditions.",
		placed: card => board.row.filter((c,i) => card.holder === player_me ^ i<3).forEach(r => r.effects.halfWeather = true)
	}
};