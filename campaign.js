"use strict"

// Story mode content. Cards are [card_dict index, count]; pins and reveal areas are % of img/map/continent-*.jpg.
// Dialogue lines are {who: "geralt" | "opp" | "narrator", en, es}; the narrator is Dandelion, telling the tale afterwards.
// Short labels go through t().
const campaign = {
	// Weak starter decks: 22 non-hero units, no fixed-reward cards
	starters: {
		realms: {leader: 22, cards: [
			[40,4], [42,1], [43,1], [35,1], [36,1], [37,1], [53,1],	// Poor Infantry, Redanian Foot Soldiers, Kaedweni Siege Experts, Yarpen
			[28,3], [44,1], [50,1], [30,2],	// Blue Stripes, Sheldon, Sabrina, Crinfrid Reavers
			[46,1], [52,1], [48,1], [54,1], [215,1],	// Siegfried, Ves, Síle, Trebuchet, Ballista
			[2,1], [9,1]	// Biting Frost, Impenetrable Fog
		]},
		nilfgaard: {leader: 57, cards: [
			[61,1], [66,1], [71,4], [74,1], [76,3], [77,1], [78,1], [79,1],	// Albrich, Cynthia, Impera Brigade, Morteisen, Nausicaa, Puttkammer, Rainfarn, Renuald
			[80,1], [82,1], [85,1], [87,1], [89,1], [92,1], [67,1], [90,1], [91,1],	// Mangonel, Siege Engineer, Sweers, Vanhemar, Vreemde, Fire Scorpion, Etolian Archers, Young Emissaries
			[9,1], [11,1]	// Impenetrable Fog, Torrential Rain
		]},
		monsters: {leader: 96, cards: [
			[117,1], [118,1], [119,1], [127,1], [128,1], [129,1],	// Ghouls, Nekkers
			[102,1], [103,1], [104,1], [110,1], [113,1], [116,1], [122,1], [137,1],	// Botchling, Celaeno Harpy, Cockatrice, Endrega, Foglet, Gargoyle, Harpy, Wyvern
			[114,1], [115,1], [120,1], [121,1], [130,1], [123,1], [109,1], [112,1],	// Forktail, Frightener, Grave Hag, Griffin, Plague Maiden, Ice Giant, Earth and Fire Elementals
			[2,1], [9,1]	// Biting Frost, Impenetrable Fog
		]},
		scoiatael: {leader: 142, cards: [
			[155,1], [156,1], [157,1], [151,1], [152,1], [153,1],	// Elven and Dwarven Skirmishers
			[144,1], [147,1], [174,1], [176,1], [177,1], [178,1], [179,1], [159,1],	// Ciaran, Dol Blathanna Archer, Riordain, Toruviel, Vrihedd Recruit and Veterans, Havekar Healer
			[168,1], [169,1], [170,1], [171,1], [172,1], [145,1], [146,1], [180,1],	// Mahakaman Defenders, Barclay, Dennis, Yaevinn
			[11,1], [2,1]	// Torrential Rain, Biting Frost
		]},
		skellige: {leader: 211, cards: [
			[210,3], [181,1], [187,1], [188,1], [189,1],	// Young Berserkers, Berserker, Shield Maidens
			[190,1], [191,1], [193,1], [205,1], [208,1], [198,1], [182,1],	// Heymaey Skald, Tordarroch Armorsmith, Donar, Svanrige, Udalryk, Holger, Birna
			[200,3], [185,2], [192,3],	// Light Longships, Brokva Archers, an Craite Warriors
			[202,1], [204,1]	// Mardroeme, Skellige Storm
		]}
	},

	// Fixed rewards of chapters not written yet: never offered as random rewards or in shops
	reserved: [184, 197, 201, 183, 195, 0, 15, 72, 3, 93, 124, 94, 8, 95, 17, 18, 19, 14, 7, 60, 212],

	// Locations shared by several opponents (one map pin opening a list)
	places: {
		crowsperch: {name: "Crow's Perch", x: 52, y: 56},
		novigrad: {name: "Novigrad", x: 49, y: 29}
	},

	// Crowns for a first win by chapter (bosses x2 the first time, rematches x0.5)
	chapters: [
		{id: "prologue", name: "White Orchard", bossAfter: 2, required: ["innkeeper"], winCrowns: 10,
			reveal: [{x: 89, y: 85, rx: 11, ry: 14}]},
		{id: "vizima", name: "Vizima", bossAfter: 1, winCrowns: 20,
			reveal: [{x: 90, y: 66, rx: 9, ry: 9}]},
		{id: "velen", name: "Velen", bossAfter: 2, winCrowns: 30,
			reveal: [{x: 62, y: 58, rx: 22, ry: 20}]},
		{id: "novigrad", name: "Novigrad & Oxenfurt", bossAfter: 3, winCrowns: 50,
			reveal: [{x: 57, y: 31, rx: 15, ry: 13}]}
	],

	// Single-elimination runs against random opponents; each round sets the AI deck pool, play level and whether heroes are removed
	tournaments: {
		passiflora: {
			name: "Passiflora Tournament", place: "novigrad", requires: "zoltan", fee: 20, perRound: 20, champion: 80,
			prizes: [141, 139],
			rounds: [{decks: "easy", level: "easy"}, {decks: "easy", level: "hard"}, {decks: "normal", level: "easy", noHeroes: true}],
			entrants: ["Count Tybalt", "Sasha", "Finneas", "Vimme Vivaldi", "Marquise Serenity", "Elihal", "Eveline Gallo", "Stjepan"],
			modifiers: [
				null, null,
				{id: "weather", card: 9, rounds: [1]},
				{id: "weather", card: 11, rounds: [1]},
				{id: "ambush", name: "Card Sharp"},
				{id: "extraDraw", side: "both", name: "House Rules"},
				{id: "informants", name: "Loaded Deck"}
			]
		}
	},

	opponents: {
		// ---------- Prologue: White Orchard ----------
		innkeeper: {
			chapter: "prologue", name: "Innkeeper", portrait: null, pin: {x: 83, y: 81}, level: "easy", guide: true,
			deck: {faction: "realms", leader: 22, cards: [
				[40,3], [42,1], [43,1], [35,1], [36,1], [53,1], [44,1], [50,1], [28,2], [30,2],
				[52,1], [46,1], [54,1], [27,1], [45,1], [48,1], [31,1], [1,1], [2,1]
			]},
			modifiers: [], objectives: ["sweep", "hand3"], rewards: [[1,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "A witcher? Haven't seen one of your lot since before the war. Fancy a round of gwent while the patrols pass?", es: "¿Un brujo? No veía a uno de los tuyos desde antes de la guerra. ¿Una partida de gwent mientras pasan las patrullas?"},
					{who: "geralt", en: "Never played.", es: "Nunca he jugado."},
					{who: "opp", en: "Then I'll teach you. Three rounds, two lives. The stronger board takes the round. Simple as ale.", es: "Entonces te enseño. Tres rondas, dos vidas. El tablero más fuerte gana la ronda. Simple como la cerveza."}
				],
				win: [{who: "opp", en: "Beginner's luck, or you learn fast. Take this Decoy, every player needs one.", es: "Suerte de principiante, o aprendes rápido. Llévate este Decoy: todo jugador necesita uno."}],
				loss: [{who: "opp", en: "Don't sulk, witcher. Nobody wins their first hand.", es: "No te enfurruñes, brujo. Nadie gana su primera mano."}]
			}
		},
		gwynleve: {
			chapter: "prologue", name: "Capt. Peter Saar Gwynleve", portrait: null, pin: {x: 91, y: 77}, level: "easy",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[61,1], [66,1], [71,3], [74,1], [76,3], [77,1], [78,1], [80,1], [85,1],
				[87,1], [89,1], [67,1], [90,1], [91,1], [5,1], [11,1]
			]},
			modifiers: [], objectives: ["noLeader", "margin20"], rewards: [[5,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "The Empire keeps order in White Orchard, witcher. Even at the card table.", es: "El Imperio mantiene el orden en Huerto Blanco, brujo. Incluso en la mesa de cartas."},
					{who: "geralt", en: "Then let's see how orderly your deck is.", es: "Entonces veamos qué tan ordenado es tu mazo."}
				],
				win: [{who: "opp", en: "Hm. Take the horn. Consider it a token of imperial goodwill.", es: "Hm. Llévate el cuerno. Considéralo una muestra de buena voluntad imperial."}],
				loss: [{who: "opp", en: "Discipline beats talent. Remember that.", es: "La disciplina vence al talento. Recuérdalo."}]
			}
		},
		griffin: {
			chapter: "prologue", name: "The Griffin", portrait: "monsters_gryffin", pin: {x: 95, y: 95}, level: "easy",
			deck: {faction: "monsters", leader: 96, cards: [
				[121,1], [122,1], [103,1], [137,1], [104,1], [116,1], [110,1], [113,1], [127,1], [128,1],
				[129,1], [117,1], [118,1], [119,1], [114,1], [115,1], [102,1], [120,1],
				[10,1], [9,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1]}], objectives: ["sweep", "noWeather"], rewards: [[10,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "Feathers and bones littered the old battlefield. A royal griffin had made it her hunting ground, and my dear friend meant to end that.", es: "Plumas y huesos cubrían el viejo campo de batalla. Un grifo real lo había convertido en su coto de caza, y mi querido amigo pensaba ponerle fin."},
					{who: "geralt", en: "Fog's rolling in. She'll strike from cover.", es: "Se acerca la niebla. Atacará desde las sombras."}
				],
				win: [{who: "narrator", en: "And so the beast fell silent. Among the wreckage Geralt found a soldier's Scorch card, singed but whole. I'd have written a ballad; he simply pocketed it.", es: "Y así calló la bestia. Entre los restos Geralt halló una carta de Scorch de algún soldado, chamuscada pero entera. Yo le habría compuesto una balada; él simplemente se la guardó."}],
				loss: [{who: "geralt", en: "Need a better plan. And a sharper blade.", es: "Necesito un mejor plan. Y una hoja más afilada."}]
			}
		},
		vesemir: {
			chapter: "prologue", name: "Vesemir", portrait: "neutral_vesemir", pin: {x: 90, y: 82}, level: "normal", boss: true,
			deck: {faction: "realms", leader: 22, cards: [
				[13,1], [214,1], [28,3], [30,2], [54,1], [38,1],
				[48,1], [52,1], [46,1], [35,1], [36,1], [37,1], [2,1], [4,1]
			]},
			modifiers: [], objectives: ["sweep", "noLeader"], rewards: [[13,1], [214,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Gwent? You? Well I'll be. Show me what you've learned, pup.", es: "¿Gwent? ¿Tú? Vaya, vaya. Muéstrame lo que aprendiste, cachorro."},
					{who: "geralt", en: "Don't go easy on me.", es: "No te contengas."},
					{who: "opp", en: "Never have, never will.", es: "Nunca lo he hecho, nunca lo haré."}
				],
				win: [
					{who: "opp", en: "Not bad. Take my card, and Roach's. Someone has to keep an eye on you.", es: "Nada mal. Toma mi carta, y la de Roach. Alguien tiene que vigilarte."},
					{who: "opp", en: "Yennefer's trail leads to Vizima. Let's ride.", es: "El rastro de Yennefer lleva a Vizima. Cabalguemos."}
				],
				loss: [{who: "opp", en: "Sloppy. Again.", es: "Descuidado. Otra vez."}]
			}
		},

		// ---------- Chapter I: Vizima ----------
		shilard: {
			chapter: "vizima", name: "Shilard Fitz-Oesterlen", portrait: "nilfgaard_shilard", pin: {x: 88, y: 67}, level: "normal",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[81,1], [66,1], [61,1], [78,1], [79,1], [77,1], [87,1], [85,1], [74,1], [71,4],
				[76,3], [90,1], [91,1], [92,1], [82,1], [80,1], [67,1], [68,1], [4,1],
				[9,1], [1,1]
			]},
			modifiers: [], objectives: ["noLeader", "hand3"], rewards: [[4,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Geralt of Rivia! His Imperial Majesty will see you shortly. Until then, a civilized game?", es: "¡Geralt de Rivia! Su Majestad Imperial te recibirá en breve. Mientras tanto, ¿un juego civilizado?"},
					{who: "geralt", en: "Diplomats don't play civilized.", es: "Los diplomáticos no juegan limpio."},
					{who: "opp", en: "Precisely why we play so well.", es: "Justamente por eso jugamos tan bien."}
				],
				win: [{who: "opp", en: "Splendid. A gift: Clear Weather. Fitting for a man who cuts through fog.", es: "Espléndido. Un regalo: Clear Weather. Muy apropiado para alguien que atraviesa la niebla."}],
				loss: [{who: "opp", en: "Do not keep the Emperor waiting on account of a sore loss.", es: "No hagas esperar al Emperador por tu mal perder."}]
			}
		},
		emhyr: {
			chapter: "vizima", name: "Emhyr var Emreis", portrait: "nilfgaard_emhyr_bronze", pin: {x: 93.5, y: 62}, level: "normal", boss: true, unlocks: "nilfgaard",
			deck: {faction: "nilfgaard", leader: 58, cards: [
				[63,1], [65,1], [71,2],
				[79,1], [78,1], [87,1], [66,1], [92,1], [82,1], [9,1],
				[11,1], [5,1], [1,1]
			]},
			modifiers: [], objectives: ["sweep", "margin20"], rewards: [[56,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher. You will find Ciri for me. But first, indulge your emperor.", es: "Brujo. Encontrarás a Ciri para mí. Pero primero, complace a tu emperador."},
					{who: "geralt", en: "And if I win?", es: "¿Y si gano?"},
					{who: "opp", en: "Then the Empire's cards are yours to command.", es: "Entonces las cartas del Imperio estarán a tus órdenes."},
					{who: "narrator", en: "The White Flame, as everyone knows, tolerates no other leader at his table. Geralt would have to play without his.", es: "La Llama Blanca, como todos saben, no tolera a ningún otro líder en su mesa. Geralt tendría que jugar sin el suyo."}
				],
				win: [
					{who: "opp", en: "Adequate. Nilfgaard's armies are yours. Use them to find my daughter.", es: "Aceptable. Los ejércitos de Nilfgaard son tuyos. Úsalos para encontrar a mi hija."},
					{who: "geralt", en: "Velen, then.", es: "Entonces, a Velen."}
				],
				loss: [{who: "opp", en: "You disappoint me. Try again.", es: "Me decepcionas. Inténtalo de nuevo."}]
			}
		},

		// ---------- Chapter II: Velen ----------
		quartermaster: {
			chapter: "velen", name: "Crow's Perch Quartermaster", portrait: null, pin: {x: 53, y: 57}, place: "crowsperch", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[28,3], [30,3], [40,4], [35,1], [36,1], [37,1], [32,1], [54,1],
				[44,1], [53,1], [50,1], [2,1], [11,1]
			]},
			modifiers: [], objectives: ["sweep", "noWeather"], rewards: [[32,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "The Baron's busy. You want a word, you earn it at my table first.", es: "El Barón está ocupado. Si quieres hablar con él, primero gánatelo en mi mesa."},
					{who: "geralt", en: "Deal.", es: "Trato hecho."}
				],
				win: [{who: "opp", en: "Fine, fine. Take the medic too. She's patched up worse than you.", es: "Está bien, está bien. Llévate también a la sanadora. Ha curado a gente en peor estado que tú."}],
				loss: [{who: "opp", en: "Come back when you've got a real deck, witcher.", es: "Vuelve cuando tengas un mazo de verdad, brujo."}]
			}
		},
		baron: {
			chapter: "velen", name: "Bloody Baron", portrait: null, pin: {x: 51, y: 55}, place: "crowsperch", level: "normal",
			deck: {faction: "realms", leader: 23, cards: [
				[28,2], [30,1], [52,1], [46,1], [48,1], [38,1],
				[54,1], [55,1], [27,1], [35,1], [36,1], [37,1], [5,1], [1,1],
				[4,1]
			]},
			modifiers: [{id: "extraDraw", side: "both"}], objectives: ["noLeader", "margin20"], rewards: [[23,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher! Sit, drink, play. A man's hand says more about him than his tongue.", es: "¡Brujo! Siéntate, bebe, juega. La mano de un hombre dice más de él que su lengua."},
					{who: "geralt", en: "Afterwards, we talk about a girl with ashen hair.", es: "Después hablamos de una muchacha de cabello ceniza."},
					{who: "opp", en: "After. My hospitality first: everyone draws an extra card.", es: "Después. Primero mi hospitalidad: todos roban una carta extra."}
				],
				win: [{who: "opp", en: "Ha! You play like you fight. Take Foltest. My old king would've liked you.", es: "¡Ja! Juegas como peleas. Llévate a Foltest. A mi viejo rey le habrías caído bien."}],
				loss: [{who: "opp", en: "Another round! And another drink!", es: "¡Otra ronda! ¡Y otro trago!"}]
			}
		},
		keira: {
			chapter: "velen", name: "Keira Metz", portrait: "realms_keira", pin: {x: 54, y: 68}, level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[38,1], [48,1], [50,1], [31,1], [44,1], [30,3], [28,3], [35,1], [36,1], [37,1],
				[32,1], [52,1], [46,1], [53,1], [54,1], [55,1], [45,1], [215,1], [11,1], [9,1],
				[1,1]
			]},
			modifiers: [{id: "weather", card: 11, rounds: [1]}], objectives: ["noWeather", "hand3"], rewards: [[38,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "A witcher on Fyke Isle? The tower's haunted, darling. Let's play while the ghosts are quiet.", es: "¿Un brujo en la Isla Fyke? La torre está embrujada, querido. Juguemos mientras los fantasmas están callados."},
					{who: "geralt", en: "Your rain won't save you.", es: "Tu lluvia no te salvará."},
					{who: "opp", en: "We'll see.", es: "Ya veremos."}
				],
				win: [{who: "opp", en: "Clever. Keep my card, a reminder of the sorceress who let you win.", es: "Astuto. Quédate con mi carta, como recuerdo de la hechicera que te dejó ganar."}],
				loss: [{who: "opp", en: "Don't look so glum. It's only rain.", es: "No pongas esa cara. Solo es lluvia."}]
			}
		},
		peasant: {
			chapter: "velen", name: "Midcopse Peasant", portrait: "neutral_cow", pin: {x: 61, y: 53}, level: "easy",
			deck: {faction: "realms", leader: 22, cards: [
				[20,1], [40,4], [42,1], [43,1], [35,1], [36,1], [37,1], [53,1], [44,1], [50,1],
				[28,2], [27,1], [54,1], [52,1], [46,1], [30,2], [11,1]
			]},
			modifiers: [], objectives: ["sweep", "second"], rewards: [[20,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher! Play me, and if ye win, ye can have me cow. She's cursed. Probably.", es: "¡Brujo! Juega conmigo y, si ganas, te quedas con mi vaca. Está maldita. Seguramente."},
					{who: "geralt", en: "...Fine.", es: "...Está bien."}
				],
				win: [{who: "opp", en: "Take 'er! And if something big and angry shows up when she dies, that's yer problem.", es: "¡Llévatela! Y si aparece algo grande y furioso cuando se muera, es tu problema."}],
				loss: [{who: "opp", en: "Ha! Not even a witcher beats a Velen farmer!", es: "¡Ja! ¡Ni un brujo le gana a un granjero de Velen!"}]
			}
		},
		deserters: {
			chapter: "velen", name: "Deserters", portrait: null, pin: {x: 60, y: 43}, level: "normal",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[71,4], [76,3], [90,1], [91,1], [74,1], [78,1], [89,1], [65,1], [79,1], [77,1],
				[87,1], [66,1], [85,1], [61,1], [80,1], [92,1], [82,1], [67,1], [68,1], [2,1],
				[1,1]
			]},
			modifiers: [{id: "ambush"}], objectives: ["second", "noLeader"], rewards: [[27,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Nice sword. Nicer purse. Sit down and lose 'em proper, witcher.", es: "Linda espada. Mejor bolsa. Siéntate y piérdelas como se debe, brujo."},
					{who: "narrator", en: "They dealt before he'd even sat down. Deserters, I find, have no manners whatsoever.", es: "Repartieron antes de que siquiera se sentara. Los desertores, me temo, carecen por completo de modales."}
				],
				win: [{who: "opp", en: "Take the bloody ballista. We stole it anyway.", es: "Llévate la maldita balista. De todos modos la robamos."}],
				loss: [{who: "opp", en: "Thanks for the coin, witcher!", es: "¡Gracias por las monedas, brujo!"}]
			}
		},
		morvran: {
			chapter: "velen", name: "Morvran Voorhis", portrait: "nilfgaard_moorvran", pin: {x: 80, y: 60}, level: "normal",
			deck: {faction: "nilfgaard", leader: 59, cards: [
				[75,1], [92,1], [80,1], [71,2],
				[79,1], [78,1], [87,1], [66,1], [9,1], [5,1],
				[1,1]
			]},
			modifiers: [], objectives: ["sweep", "margin20"], rewards: [[75,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "The Emperor's witcher. My orders say to assist you. They say nothing about letting you win.", es: "El brujo del Emperador. Mis órdenes dicen que te ayude. No dicen nada de dejarte ganar."},
					{who: "geralt", en: "Wouldn't want it any other way.", es: "No lo querría de otra forma."}
				],
				win: [{who: "opp", en: "Well played. Take my card. May it serve you better than Velen serves me.", es: "Bien jugado. Toma mi carta. Ojalá te sirva mejor de lo que Velen me sirve a mí."}],
				loss: [{who: "opp", en: "Nilfgaard does not lose to mercenaries.", es: "Nilfgaard no pierde contra mercenarios."}]
			}
		},
		werewolf: {
			chapter: "velen", name: "Werewolf", portrait: "monsters_werewolf", pin: {x: 74.5, y: 62}, level: "normal",
			deck: {faction: "monsters", leader: 93, cards: [
				[136,1], [121,1], [102,1], [117,1], [118,1],
				[119,1], [122,1], [103,1],
				[110,1], [137,1], [9,1], [5,1]
			]},
			modifiers: [], objectives: ["noWeather", "second"], rewards: [[136,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "Claw marks on the doors, a howl in the woods, a contract nailed to the notice board. A night's work for a witcher, or so he claimed.", es: "Marcas de garras en las puertas, un aullido en el bosque, un contrato clavado en el tablón. Trabajo de una noche para un brujo, o eso decía él."},
					{who: "geralt", en: "Full moon tonight. Let's get this over with.", es: "Hoy hay luna llena. Terminemos con esto."}
				],
				win: [{who: "narrator", en: "The curse lifted with the dawn, and the grateful villagers pressed a card into Geralt's hand. Payment in gwent: the only coin he never complains about.", es: "La maldición se rompió al amanecer, y los aldeanos, agradecidos, le dieron a Geralt una carta. Pago en gwent: la única moneda de la que nunca se queja."}],
				loss: [{who: "geralt", en: "Faster than I thought.", es: "Es más rápido de lo que pensé."}]
			}
		},
		crones: {
			chapter: "velen", name: "The Crones", portrait: "monsters_witch_velen", pin: {x: 65, y: 60}, level: "normal", boss: true, unlocks: "monsters",
			deck: {faction: "monsters", leader: 96, cards: [
				[105,1], [106,1], [107,1], [130,1], [113,1], [127,1], [128,1], [129,1], [117,1],
				[118,1], [119,1], [102,1],
				[122,1], [120,1], [9,1], [1,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1, 2, 3]}], objectives: ["sweep", "noLeader"], rewards: [[105,1], [106,1], [107,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Little wolf, come to bargain with the Ladies of the Wood?", es: "Lobito, ¿vienes a negociar con las Damas del Bosque?"},
					{who: "opp", en: "Play for the girl, then. The mist is ours, and so are the children of the bog.", es: "Juega por la niña, entonces. La niebla es nuestra, y también los hijos del pantano."},
					{who: "geralt", en: "I've heard enough.", es: "Ya escuché suficiente."}
				],
				win: [{who: "opp", en: "Clever wolf... Take our sisters' cards. They will serve you. For now.", es: "Lobo astuto... Toma las cartas de nuestras hermanas. Te servirán. Por ahora."}],
				loss: [{who: "opp", en: "Back to the bog with you, little wolf!", es: "¡De vuelta al pantano, lobito!"}]
			}
		},

		// ---------- Chapter III: Novigrad & Oxenfurt ----------
		dandelion: {
			chapter: "novigrad", name: "Dandelion", portrait: "neutral_dandelion", pin: {x: 49, y: 29}, place: "novigrad", level: "hard",
			deck: {faction: "realms", leader: 22, cards: [
				[6,1], [28,3], [30,3], [40,4], [42,1], [43,1], [53,1], [44,1], [50,1], [48,1],
				[52,1], [46,1], [35,1], [36,1], [37,1], [54,1], [29,2], [31,1], [5,1], [1,1], [11,1]
			]},
			modifiers: [], objectives: ["hand3", "second"], rewards: [[6,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "I must be honest with you, dear reader: the next opponent was devilishly handsome, and modest besides.", es: "Debo ser honesto contigo, querido lector: el siguiente rival era endiabladamente apuesto y, además, modesto."},
					{who: "opp", en: "Geralt! The Chameleon's grand opening needs a headline act. A friendly game, for the crowd?", es: "¡Geralt! La gran inauguración del Camaleón necesita un número principal. ¿Una partida amistosa, para el público?"},
					{who: "geralt", en: "Friendly. With you.", es: "Amistosa. Contigo."},
					{who: "opp", en: "I'm wounded. Deal the cards.", es: "Me hieres. Reparte las cartas."}
				],
				win: [
					{who: "opp", en: "Bravo! Take my card. Every army needs a bard to sing of its victories.", es: "¡Bravo! Toma mi carta. Todo ejército necesita un bardo que cante sus victorias."},
					{who: "narrator", en: "For the record, I let him win. The audience adored it.", es: "Que conste que lo dejé ganar. Al público le encantó."}
				],
				loss: [{who: "opp", en: "And the crowd goes wild! For me, naturally.", es: "¡Y el público enloquece! Por mí, naturalmente."}]
			}
		},
		triss: {
			chapter: "novigrad", name: "Triss Merigold", portrait: "neutral_triss", pin: {x: 49, y: 29}, place: "novigrad", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[12,1], [50,1], [48,1], [31,1], [32,1], [30,3], [28,3], [45,1], [54,1],
				[55,1], [44,1], [53,1], [52,1], [46,1], [35,1], [36,1], [4,1], [5,1], [1,1]
			]},
			modifiers: [{id: "terms", rule: "noWeather", name: "Witch Hunters"}], objectives: ["sweep", "noLeader"], rewards: [[12,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "Novigrad burned sorceresses in those days. Triss Merigold was hiding in plain sight, and she wanted nothing on the table that smelled of magic.", es: "En aquellos días, Novigrad quemaba hechiceras. Triss Merigold se escondía a plena vista, y no quería en la mesa nada que oliera a magia."},
					{who: "opp", en: "Geralt. Witch hunters are watching. No weather cards, please.", es: "Geralt. Los cazadores de brujas vigilan. Nada de cartas de clima, por favor."},
					{who: "geralt", en: "And your own cards?", es: "¿Y tus propias cartas?"},
					{who: "opp", en: "Mine are perfectly respectable. Mostly.", es: "Las mías son perfectamente respetables. Casi todas."}
				],
				win: [{who: "opp", en: "You haven't lost your touch. Keep my card, and think of me in Kovir.", es: "No has perdido el toque. Quédate con mi carta, y piensa en mí cuando esté en Kovir."}],
				loss: [{who: "opp", en: "Careful, Geralt. People are watching.", es: "Cuidado, Geralt. La gente está mirando."}]
			}
		},
		dijkstra: {
			chapter: "novigrad", name: "Sigismund Dijkstra", portrait: "realms_dijkstra", pin: {x: 49, y: 29}, place: "novigrad", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[47,1], [42,1], [43,1], [28,2], [30,2], [54,1], [31,1], [32,1], [53,1], [35,1],
				[44,1], [50,1], [10,1], [1,1], [2,1]
			]},
			modifiers: [{id: "informants", name: "Informants"}], objectives: ["margin20", "hand3"], rewards: [[47,1], [24,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher. Sit. My informants tell me everything, including what's in your hand.", es: "Brujo. Siéntate. Mis informantes me lo cuentan todo, incluso lo que tienes en la mano."},
					{who: "geralt", en: "Then you know I'm about to win.", es: "Entonces sabes que estoy a punto de ganar."},
					{who: "narrator", en: "His spies cost Geralt a card before the game began. Sigi never played fair, and he was proud of it.", es: "Sus espías le costaron a Geralt una carta antes de que empezara el juego. Sigi nunca jugó limpio, y estaba orgulloso de ello."}
				],
				win: [{who: "opp", en: "Hah! Fine. My card, and Foltest's old siege banner. Redania remembers its friends.", es: "¡Ja! Está bien. Mi carta, y el viejo estandarte de asedio de Foltest. Redania recuerda a sus amigos."}],
				loss: [{who: "opp", en: "Information wins wars, witcher. And card games.", es: "La información gana guerras, brujo. Y partidas de cartas."}]
			}
		},
		philippa: {
			chapter: "novigrad", name: "Philippa Eilhart", portrait: "realms_philippa", pin: {x: 56, y: 25}, level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[39,1], [48,1], [28,2], [30,2], [54,1], [32,1], [53,1], [36,1],
				[1,1]
			]},
			modifiers: [{id: "informants", name: "Lodge Intrigue"}], objectives: ["noLeader", "sweep"], rewards: [[39,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "In Radovid's camp the Lodge of Sorceresses was plotting again. Philippa received Geralt with an owl's patience.", es: "En el campamento de Radovid, la Logia de Hechiceras volvía a conspirar. Philippa recibió a Geralt con la paciencia de un búho."},
					{who: "opp", en: "The Lodge has eyes everywhere, witcher. You'll find your hand a little lighter.", es: "La Logia tiene ojos en todas partes, brujo. Notarás tu mano algo más ligera."},
					{who: "geralt", en: "Figures.", es: "Era de esperar."}
				],
				win: [{who: "opp", en: "Impressive. Take my card. Consider it an investment.", es: "Impresionante. Toma mi carta. Considérala una inversión."}],
				loss: [{who: "opp", en: "Predictable. Men usually are.", es: "Predecible. Los hombres suelen serlo."}]
			}
		},
		roche: {
			chapter: "novigrad", name: "Vernon Roche", portrait: "realms_vernon", pin: {x: 67, y: 38}, level: "hard",
			deck: {faction: "realms", leader: 25, cards: [
				[51,1], [28,3], [52,1], [46,1], [30,3], [40,4], [54,1], [32,1], [45,1],
				[5,1], [1,1], [10,1], [2,1]
			]},
			modifiers: [{id: "ambush", name: "Partisans"}], objectives: ["margin20", "noWeather"], rewards: [[51,1], [25,1]],
			dialogue: {
				intro: [
					{who: "opp", en: "Geralt. The Blue Stripes don't wait for permission. We strike first.", es: "Geralt. Las Rayas Azules no piden permiso. Atacamos primero."},
					{who: "geralt", en: "Like old times.", es: "Como en los viejos tiempos."}
				],
				win: [{who: "opp", en: "For Temeria. Take my card, and the Steel-Forged king's. He'd want it in good hands.", es: "Por Temeria. Toma mi carta, y la del rey Forjado en Acero. Él la querría en buenas manos."}],
				loss: [{who: "opp", en: "Temeria isn't dead yet. Neither is my deck.", es: "Temeria aún no ha muerto. Tampoco mi mazo."}]
			}
		},
		zoltan: {
			chapter: "novigrad", name: "Zoltan Chivay", portrait: "neutral_zoltan", pin: {x: 49, y: 29}, place: "novigrad", level: "hard", boss: true, unlocks: "scoiatael",
			deck: {faction: "scoiatael", leader: 142, cards: [
				[16,1], [151,1], [152,1], [153,1], [168,1], [169,1], [170,1], [171,1], [172,1], [146,1],
				[145,1], [162,1], [163,1], [164,1], [159,1], [160,1], [176,1], [177,1], [178,1],
				[179,1], [10,1], [5,1], [1,1], [2,1]
			]},
			modifiers: [], objectives: ["sweep", "margin20"], rewards: [[16,1]],
			dialogue: {
				intro: [
					{who: "narrator", en: "Every tale needs a dwarf, and ours had the best: Zoltan Chivay, who played gwent the way he fought, all axe and no apology.", es: "Toda historia necesita un enano, y la nuestra tenía al mejor: Zoltan Chivay, que jugaba al gwent como peleaba, todo hacha y ninguna disculpa."},
					{who: "opp", en: "Geralt, you old bugger! A round for old times' sake? Loser buys the mead.", es: "¡Geralt, viejo granuja! ¿Una ronda por los viejos tiempos? El que pierda paga el hidromiel."},
					{who: "geralt", en: "Mahakam deck?", es: "¿Mazo de Mahakam?"},
					{who: "opp", en: "What else? Elves too, if they behave.", es: "¿Qué otro? Y elfos también, si se portan bien."}
				],
				win: [
					{who: "opp", en: "Ha! Fair and square. The Scoia'tael cards are yours, and mine too. Now, about that mead...", es: "¡Ja! Limpio y justo. Las cartas de los Scoia'tael son tuyas, y la mía también. Ahora, sobre ese hidromiel..."},
					{who: "narrator", en: "Word spread fast: the Passiflora was hosting a tournament, and they had saved a seat for a witcher.", es: "La noticia corrió rápido: el Passiflora organizaba un torneo, y habían guardado un asiento para un brujo."}
				],
				loss: [{who: "opp", en: "Mead's on you, witcher!", es: "¡El hidromiel lo pagas tú, brujo!"}]
			}
		}
	}
};
