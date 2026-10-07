"use strict"

var factions = {
	realms: {
		name: "Northern Realms",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount > 1 && game.roundHistory[game.roundCount-2].winner === player && player.deck.cards.length > 0) {
				await player.deck.draw(player.hand);
				await ui.notification("north", 1200);
			}
			return false;
		}),
		description: "Draw a card from your deck whenever you win a round."
	},
	nilfgaard: {
		name: "Nilfgaardian Empire",
		description: "Wins any round that ends in a draw."
	},
	monsters: {
		name: "Monsters",
		factionAbility: player => game.roundEnd.push(() => {
			// No next round if this round's loser(s) run out of lives
			const winner = game.roundHistory[game.roundHistory.length-1].winner;
			if ([player_me, player_op].some(p => p !== winner && p.health <= 1))
				return false;
			const units = board.row.filter( (r,i) => player === player_me ^ i < 3)
				.reduce((a,r) => r.cards.filter(c => c.isUnit()).concat(a), []);
			if (units.length === 0)
				return false;
			if (Online.active)
				units.sort(Card.byUid);
			const card = units[randomInt(units.length, player.rng)];
			card.noRemove = true;
			game.roundStart.push( async () => {
				await ui.notification("monsters", 1200);
				delete card.noRemove;
				return true; 
			});
			return false;
		}),
		description: "Keeps a random Unit Card out after each round."
	},
	scoiatael: {
		name: "Scoia'tael",
		factionAbility: player => game.gameStart.push( async () => {
			if (!(player.controller instanceof ControllerAI)) {
				const hotseat = game.isHotseat();
				const first = await Online.choice(player, "first", async () => {
					let goFirst = false;
					await ui.popup(t("Go First"), () => goFirst = true,
						hotseat ? t("Let {name} Start", {name: player.opponent().name}) : t("Let Opponent Start"), null,
						hotseat ? t("{name}, would you like to go first?", {name: player.name}) : t("Would you like to go first?"),
						t("The Scoia'tael faction perk allows you to decide who will get to go first."), 0.55);
					return goFirst;
				}, d => typeof d === "boolean");
				game.firstPlayer = first ? player : player.opponent();
				await ui.playerNotification("first", game.firstPlayer, 1200);
			} else if (!player.controller.difficulty.strategic && Math.random() < 0.5) {
				game.firstPlayer = player;
				await ui.notification("scoiatael", 1200);
			} else {
				// Going second lets a player answer every play, so Hard always lets the opponent start
				game.firstPlayer = player.opponent();
				await ui.playerNotification("first", game.firstPlayer, 1200);
			}
			return true;
		}),
		description: "Decides who takes first turn."
	},
	skellige: {
		name: "Skellige",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount != 3)
				return false;
			const currPlayer = game.currPlayer;
			game.currPlayer = player;
			await ui.playerNotification("skellige", player, 1200);
			if (player.controller instanceof ControllerAI)
			{
				// One at a time: a revived medic may already have taken the other card from the grave
				for (const card of player.grave.findCardsRandom(c => c.isUnit(), 2, player.rng))
					if (player.grave.cards.includes(card))
						await board.toRow(card, player.grave);
			}
			else
			{
				await factions['skellige'].helper(player);
				await factions['skellige'].helper(player);
			}
			game.currPlayer = currPlayer;
			return true;
		}),
		helper: async player => {
			const units = player.grave.findCardsRandom(c => c.isUnit(), 1, player.rng);
			if (units.length === 0)
				return;
			const card = units[0];
			if (card.row === 'agile')
			{
				const selectedRow = await Online.rowChoice(player, card);
				if (selectedRow)
				{
					await board.moveTo(card, selectedRow, player.grave);
				}
			}
			else
			{
				await board.toRow(card, player.grave);
			}
		},
		description: "2 random cards from the graveyard are placed on the battlefield at the start of the third round."
	}
}