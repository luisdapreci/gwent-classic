"use strict"

// Story mode content. Cards are [card_dict index, count]; pins and reveal areas are % of img/map/continent-*.jpg.
// Dialogue lines are {who: "geralt" | "opp" | "narrator" | "chronicle", en, es}; the narrator is Dandelion, telling the tale afterwards,
// and chronicle lines are excerpts from in-world books with a source {en, es}. Voice rules: "Voice & style" in .github/prompts/plan-storyMode.prompt.md.
// Chapters have an epigraph (chronicle quote), an opener (lines played once when the chapter opens) and rumors; opponents and tournaments have a rumor.
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
	reserved: [],

	// Locations shared by several opponents (one map pin opening a list)
	places: {
		crowsperch: {name: "Crow's Perch", x: 52, y: 56},
		novigrad: {name: "Novigrad", x: 49, y: 29},
		kaertrolde: {name: "Kaer Trolde", x: 17, y: 51},
		kaermorhen: {name: "Kaer Morhen", x: 83, y: 15},
		naglfar: {name: "Naglfar", x: 22, y: 30},
		toussaint: {name: "Road to Toussaint", x: 88, y: 96}
	},

	// Crowns for a first win by chapter (bosses x2 the first time, rematches x0.5); music = map theme (UI.initMusic key)
	chapters: [
		{id: "prologue", name: "White Orchard", bossAfter: 2, required: ["innkeeper"], winCrowns: 10, music: "map",
			reveal: [{x: 89, y: 85, rx: 11, ry: 14}],
			epigraph: {source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi"},
				en: "White Orchard: a village in Temeria, famous for its orchards, which burned, and its inn, which did not. Population: variable, depending on the war.",
				es: "Huerto Blanco: aldea de Temeria, famosa por sus huertos, que ardieron, y por su posada, que no. Población: variable, según la guerra."},
			opener: [
				{who: "narrator", en: "Every ballad needs a beginning, dear reader, and this one begins badly: in a muddy village, in wartime, with a witcher who had never held a gwent card.", es: "Toda balada necesita un comienzo, querido lector, y esta comienza mal: en una aldea embarrada, en tiempos de guerra, con un brujo que jamás había sostenido una carta de gwent."},
				{who: "narrator", en: "He was looking for Yennefer. Nilfgaard was looking for everyone else. The inn was the only roof in White Orchard nobody had set on fire yet.", es: "Él buscaba a Yennefer. Nilfgaard buscaba a todos los demás. La posada era el único techo de Huerto Blanco al que nadie había prendido fuego todavía."},
				{who: "narrator", en: "A word on method. When Geralt sat at a card table, I tell you what was played. When the other side had claws, I tell it as cards anyway: the truth makes ugly ballads.", es: "Una aclaración de método. Cuando Geralt se sentaba a una mesa de cartas, cuento lo que se jugó. Cuando el otro bando tenía garras, lo cuento como cartas de todos modos: la verdad hace baladas feas."},
				{who: "geralt", en: "Smells like smoke and wet dog. Must be the inn.", es: "Huele a humo y a perro mojado. Debe ser la posada."}
			],
			rumors: [
				{en: "Notice on the inn door, in Nilfgaardian and bad Temerian: GAMBLING FORBIDDEN BY ORDER. Underneath, in chalk: except with the captain.", es: "Aviso en la puerta de la posada, en nilfgaardiano y en mal temerio: PROHIBIDO APOSTAR POR ORDEN SUPERIOR. Debajo, en tiza: salvo con el capitán."},
				{en: "The well-digger swears the griffin only took soldiers. \"Picky eater,\" he says. \"Like my wife.\"", es: "El pocero jura que el grifo solo se llevaba soldados. «Quisquillosa para comer», dice. «Como mi mujer»."},
				{en: "A white-haired stranger asked at the inn about a woman in black who smells of lilac and gooseberries. The innkeeper charged him for the question.", es: "Un forastero de cabello blanco preguntó en la posada por una mujer de negro que huele a lilas y grosellas. La posadera le cobró la pregunta."}
			]},
		{id: "vizima", name: "Vizima", bossAfter: 1, winCrowns: 20, music: "geralt-of-rivia",
			reveal: [{x: 90, y: 66, rx: 9, ry: 9}],
			epigraph: {source: {en: "Roderick de Novembre, The History of the World", es: "Roderick de Novembre, Historia del mundo"},
				en: "Upon taking Vizima, the Emperor held court in the royal palace, which he declared temporary. Temerian historians note that the furniture was not.",
				es: "Tras tomar Vizima, el Emperador instaló su corte en el palacio real, que declaró temporal. Los historiadores temerios señalan que los muebles no lo eran."},
			opener: [
				{who: "narrator", en: "Vizima, once Temeria's crown, now Nilfgaard's waiting room. Geralt had been summoned by an emperor, which is rarely good news and never optional.", es: "Vizima, antes corona de Temeria, ahora sala de espera de Nilfgaard. Un emperador había mandado llamar a Geralt, lo cual rara vez es buena noticia y nunca es opcional."},
				{who: "narrator", en: "There were forms to sign before the audience. Forms, I remind you, in triplicate, to see a man who wanted a favor.", es: "Antes de la audiencia había formularios que firmar. Formularios, te recuerdo, por triplicado, para ver a un hombre que quería pedir un favor."},
				{who: "narrator", en: "Yennefer was waiting in the palace, in black and white, as if she'd been expecting him for an hour and disapproved of every minute of it.", es: "Yennefer lo esperaba en el palacio, de blanco y negro, como si llevara una hora esperándolo y desaprobara cada minuto."},
				{who: "geralt", en: "Hm. Polished floors. Someone missed a bloodstain.", es: "Hm. Pisos pulidos. Alguien olvidó una mancha de sangre."}
			],
			rumors: [
				{en: "The palace cooks say the Emperor eats like a soldier and signs death warrants like a clerk: quickly, neatly, and before lunch.", es: "Los cocineros del palacio dicen que el Emperador come como un soldado y firma sentencias de muerte como un escribano: rápido, con buena letra y antes del almuerzo."},
				{en: "\"The king's ghost plays gwent in the throne room.\" \"And?\" \"And he still loses.\" (two guards, palace kitchens)", es: "«El fantasma del rey juega gwent en el salón del trono». «¿Y?». «Y sigue perdiendo». (dos guardias, cocinas del palacio)"},
				{en: "They say the Emperor's daughter died years ago. They also say she didn't. In Vizima, both rumors cost a copper.", es: "Dicen que la hija del Emperador murió hace años. También dicen que no. En Vizima, ambos rumores cuestan un cobre."}
			]},
		{id: "velen", name: "Velen", bossAfter: 2, required: ["baron"], winCrowns: 30, music: "the-vagabond",
			reveal: [{x: 62, y: 58, rx: 22, ry: 20}],
			epigraph: {source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi, vol. XV", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi, vol. XV"},
				en: "Velen, or No Man's Land: a marshy region notable for its bogs, its gallows, and a remarkably brisk traffic between the living and the dead.",
				es: "Velen, o Tierra de Nadie: región pantanosa, notable por sus ciénagas, sus horcas y un tráfico notablemente fluido entre los vivos y los muertos."},
			opener: [
				{who: "narrator", en: "Velen smelled of wet ash and old rope. Every village had a gallows, and every gallows had a tenant.", es: "Velen olía a ceniza mojada y a soga vieja. Cada aldea tenía una horca, y cada horca, un inquilino."},
				{who: "narrator", en: "Two armies had passed through and taken everything but the crows. Somewhere in that mud, someone had seen a girl with ashen hair.", es: "Dos ejércitos habían pasado por allí y se lo habían llevado todo menos los cuervos. En algún lugar de ese barro, alguien había visto a una muchacha de cabello ceniza."},
				{who: "geralt", en: "Ciri was here. Question is who else noticed.", es: "Ciri estuvo aquí. La pregunta es quién más se dio cuenta."}
			],
			rumors: [
				{en: "A ferryman claims the Baron's wife ran off with a sailor. Another swears she's at the bottom of the bog. Both charge extra for the details.", es: "Un barquero asegura que la esposa del Barón se fugó con un marinero. Otro jura que está en el fondo del pantano. Ambos cobran aparte por los detalles."},
				{en: "In Midcopse they leave bread on the windowsill for the Ladies of the Wood. The children who forget don't grow up.", es: "En Midcopse dejan pan en la ventana para las Damas del Bosque. Los niños que lo olvidan no llegan a crecer."},
				{en: "A Velen counting rhyme: one for the Baron, two for the crows, three for the Ladies, and where the rest go, nobody knows.", es: "Una rima de Velen para contar: uno es del Barón, dos son del cuervo, tres de las Damas, y el resto, del suelo."}
			]},
		{id: "novigrad", name: "Novigrad & Oxenfurt", bossAfter: 3, winCrowns: 50, music: "merchants-of-novigrad",
			reveal: [{x: 57, y: 31, rx: 15, ry: 13}],
			epigraph: {source: {en: "Ordinances of the Novigrad Temple Guard, art. 4", es: "Ordenanzas de la Guardia del Templo de Novigrad, art. 4"},
				en: "Card games are permitted within the city walls, provided no card depicts a sorceress, a nonhuman, or anything else a reasonable priest might find suspicious.",
				es: "Se permiten los juegos de cartas dentro de las murallas, siempre que ninguna carta represente a una hechicera, a un no humano ni ninguna otra cosa que un sacerdote razonable pudiera considerar sospechosa."},
			opener: [
				{who: "narrator", en: "Novigrad, free city: free to tax you, free to rob you, and free to burn whoever the Church disliked that week.", es: "Novigrad, ciudad libre: libre para cobrarte impuestos, libre para robarte y libre para quemar a quien la Iglesia aborreciera esa semana."},
				{who: "narrator", en: "Bells rang from dawn to dusk, and the smoke from the pyres never quite cleared. I, of course, ran a cabaret there. Someone had to keep the city civilized.", es: "Las campanas sonaban del alba al anochecer, y el humo de las hogueras nunca terminaba de disiparse. Yo, por supuesto, tenía allí un cabaret. Alguien tenía que mantener civilizada la ciudad."},
				{who: "narrator", en: "Ciri had passed through Novigrad too. I happen to know, because I was among the last to see her there. I mention it modestly, and often.", es: "Ciri también había pasado por Novigrad. Lo sé porque fui de los últimos en verla allí. Lo menciono con modestia, y a menudo."},
				{who: "geralt", en: "Big city. Lots of people who saw nothing.", es: "Ciudad grande. Mucha gente que no vio nada."}
			],
			rumors: [
				{en: "A fishwife at the harbor says the Eternal Fire burns brighter on Tuesdays. That's when the witch hunters work overtime.", es: "Una pescadera del puerto dice que el Fuego Eterno arde más fuerte los martes. Es cuando los cazadores de brujas hacen horas extra."},
				{en: "A beggar on Hierarch Square claims to be the rightful king of Novigrad. He has a crown, a court and three fleas, which is more than the last one had.", es: "Un mendigo de la Plaza del Jerarca dice ser el legítimo rey de Novigrad. Tiene corona, corte y tres pulgas, que es más de lo que tenía el anterior."},
				{en: "Novigrad customs ledger: confiscated at the gate, one deck of cards depicting sorceresses. Burned. A second deck, the same: under review by the Hierarch, personally.", es: "Registro de aduanas de Novigrad: confiscado en la puerta, un mazo de cartas con hechiceras. Quemado. Un segundo mazo, igual: en revisión por el Jerarca, personalmente."}
			]},
		{id: "skellige", name: "Skellige", bossAfter: 3, required: ["avallach"], winCrowns: 70, music: "fields-of-ard-skellig",
			reveal: [{x: 20, y: 68, rx: 21, ry: 28}],
			epigraph: {source: {en: "Roderick de Novembre, The History of the World", es: "Roderick de Novembre, Historia del mundo"},
				en: "The Skelligers are a proud, seafaring people who settle disputes by duel, by feast, or, most often, by both at once.",
				es: "Los skelligenses son un pueblo orgulloso y marinero que resuelve sus disputas mediante duelos, banquetes o, con mayor frecuencia, ambas cosas a la vez."},
			opener: [
				{who: "narrator", en: "Skellige: salt wind, black rocks, and a king freshly dead. On the islands that meant a funeral, a feast and a brawl, in no particular order.", es: "Skellige: viento salado, rocas negras y un rey recién muerto. En las islas eso significaba un funeral, un banquete y una pelea, sin orden particular."},
				{who: "narrator", en: "Ciri had come this way and left a burned village and a mystery behind her. Geralt took a boat. He hates boats.", es: "Ciri había pasado por allí y había dejado atrás una aldea quemada y un misterio. Geralt tomó un barco. Odia los barcos."},
				{who: "geralt", en: "Cold, wet, and everyone's armed. Could be worse.", es: "Frío, humedad y todos armados. Podría ser peor."}
			],
			rumors: [
				{en: "An Ard Skellig fisherman says the late king's ghost walks the cliffs, looking for whoever poisoned his mead. He's checking every tavern.", es: "Un pescador de Ard Skellig dice que el fantasma del difunto rey recorre los acantilados buscando a quien envenenó su hidromiel. Está revisando cada taberna."},
				{en: "The jarls' sons are competing for the crown. So far the contest has involved three duels, two shipwrecks and one very confused bear.", es: "Los hijos de los jarls compiten por la corona. Hasta ahora, la contienda ha incluido tres duelos, dos naufragios y un oso muy confundido."},
				{en: "A drinking song from An Skellig: the king is dead, the mead is not, so drink the king's, and drink a lot.", es: "Una canción de taberna de An Skellig: el rey murió, el hidromiel no; bebe el del rey, que el rey ya se fue."}
			]},
		{id: "kaermorhen", name: "Kaer Morhen", bossAfter: 2, winCrowns: 85, music: "menu",
			reveal: [{x: 83, y: 15, rx: 15, ry: 15}],
			epigraph: {source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi"},
				en: "Kaer Morhen: a ruined keep in the Blue Mountains, formerly a school of witchers. Abandoned. See also: mutants; superstition; regrettable episodes.",
				es: "Kaer Morhen: fortaleza en ruinas en las Montañas Azules, antigua escuela de brujos. Abandonada. Véase también: mutantes; superstición; episodios lamentables."},
			opener: [
				{who: "narrator", en: "Kaer Morhen, where witchers were made and, for the most part, died. Half its walls had fallen, and the other half were thinking about it.", es: "Kaer Morhen, donde se forjaban los brujos y donde, en su mayoría, morían. La mitad de sus murallas había caído, y la otra mitad se lo estaba pensando."},
				{who: "narrator", en: "Ciri was home at last. So, unfortunately, was everything hunting her. Geralt sent for every friend he had left, which took fewer letters than I'd have liked.", es: "Ciri por fin estaba en casa. Por desgracia, también lo que la perseguía. Geralt mandó llamar a todos los amigos que le quedaban, y hicieron falta menos cartas de las que me habría gustado."},
				{who: "geralt", en: "Walls won't hold. People might.", es: "Las murallas no aguantarán. La gente, quizá."}
			],
			rumors: [
				{en: "A trapper swears he saw witchers in the valley again, carrying lumber. \"Building, not killing,\" he said, \"which was worse somehow.\"", es: "Un trampero jura que volvió a ver brujos en el valle, cargando madera. «Construyendo, no matando», dijo, «lo cual por alguna razón era peor»."},
				{en: "They say the old witcher Vesemir keeps a cookbook. Nobody who has eaten his cooking believes it.", es: "Dicen que el viejo brujo Vesemir tiene un libro de recetas. Nadie que haya probado su comida se lo cree."},
				{en: "Shepherds in the Blue Mountains say the frost came early this year, in a single night, in the shape of a hand.", es: "Los pastores de las Montañas Azules dicen que este año la escarcha llegó temprano, en una sola noche, con la forma de una mano."}
			]},
		// Linear: each opponent requires the previous one
		{id: "hunt", name: "The Wild Hunt", bossAfter: 2, winCrowns: 100, music: "the-hunt-is-coming",
			reveal: [{x: 22, y: 30, rx: 13, ry: 13}, {x: 65, y: 66, rx: 6, ry: 6}],
			epigraph: {source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi"},
				en: "Wild Hunt: a folk superstition concerning spectral riders in the sky, regarded by serious scholarship as a misinterpretation of storms, geese and drink.",
				es: "Cacería Salvaje: superstición popular sobre jinetes espectrales en el cielo, que la erudición seria considera una mala interpretación de tormentas, gansos y bebida."},
			opener: [
				{who: "narrator", en: "They buried Vesemir on the mountain. I wasn't there, and I won't write about that day. Some songs I keep for myself.", es: "Enterraron a Vesemir en la montaña. Yo no estuve allí, y no escribiré sobre ese día. Algunas canciones me las guardo para mí."},
				{who: "narrator", en: "After that, Geralt stopped running. He went looking for the Hunt instead, one general at a time.", es: "Después de eso, Geralt dejó de huir. Fue a buscar a la Cacería, un general a la vez."},
				{who: "geralt", en: "No more waiting.", es: "Se acabó esperar."}
			],
			rumors: [
				{en: "Sailors swear a ship of nails was seen near Undvik, sailing against the wind. The captain's drink was blamed, as usual.", es: "Los marineros juran haber visto un barco de uñas cerca de Undvik, navegando contra el viento. Se culpó a la bebida del capitán, como de costumbre."},
				{en: "Velen widows say the witches of Bald Mountain hold a sabbath this month, with a new guest of honor. He wears armor.", es: "Las viudas de Velen dicen que las brujas de la Montaña Calva celebran un aquelarre este mes, con un nuevo invitado de honor. Lleva armadura."},
				{en: "Wanted poster, Novigrad: the White Wolf, dead or alive. Someone has crossed out \"dead or alive\" and written \"good luck\".", es: "Cartel de se busca, Novigrad: el Lobo Blanco, vivo o muerto. Alguien tachó «vivo o muerto» y escribió «buena suerte»."}
			]},
		// Post-game side stories: both open once Eredin is beaten and have no boss
		{id: "heartsofstone", name: "Hearts of Stone", opensAfter: "eredin", bossAfter: 0, winCrowns: 100, music: "hearts-of-stone",
			reveal: [{x: 65, y: 33, rx: 7, ry: 6}, {x: 13, y: 93, rx: 7, ry: 7}],
			epigraph: {source: {en: "Oxenfurt Academy, Faculty of Folklore (unfinished thesis)", es: "Academia de Oxenfurt, Facultad de Folclore (tesis inconclusa)"},
				en: "Of the Man of Glass, or Master Mirror, little can be stated with certainty, as every scholar who studied him has, on reflection, declined to continue.",
				es: "Del Hombre de Cristal, o Maestro Espejo, poco puede afirmarse con certeza, pues todo erudito que lo estudió decidió, tras pensarlo bien, no continuar."},
			opener: [
				{who: "narrator", en: "With the Hunt gone, Geralt took ordinary contracts again. Drowners, nekkers, the odd frog prince. Peace, for a witcher, is just smaller monsters.", es: "Sin la Cacería, Geralt volvió a aceptar contratos comunes. Ahogadores, nekkers, algún que otro príncipe sapo. La paz, para un brujo, son solo monstruos más pequeños."},
				{who: "narrator", en: "Then a contract near Oxenfurt led him to a crossroads, and to a debt he didn't know he owed. I've changed some names in this part. It seemed wise.", es: "Entonces un contrato cerca de Oxenfurt lo llevó a una encrucijada, y a una deuda que no sabía que tenía. En esta parte he cambiado algunos nombres. Me pareció prudente."},
				{who: "geralt", en: "Hm. Something's off.", es: "Hm. Algo no cuadra."}
			],
			rumors: [
				{en: "A Redanian merchant swears a nobleman with a scarred brow can't be killed. He tried. Twice. The nobleman bought him a drink.", es: "Un mercader redanio jura que a un noble de frente marcada no se le puede matar. Lo intentó. Dos veces. El noble lo invitó a una copa."},
				{en: "The old women at the Gustfields crossroads won't sell pomegranates to strangers. They won't say why.", es: "Las ancianas de la encrucijada de Gustfields no les venden granadas a los desconocidos. No dicen por qué."},
				{en: "Sailors in Skellige say a whirlpool off the south coast sings when the moon is full. The ones who answer don't sail back.", es: "Los marineros de Skellige dicen que frente a la costa sur hay un remolino que canta con la luna llena. Los que responden no vuelven a puerto."}
			]},
		{id: "bloodandwine", name: "Blood and Wine", opensAfter: "eredin", bossAfter: 0, winCrowns: 100, music: "blood-and-wine",
			reveal: [{x: 88, y: 94, rx: 9, ry: 8}],
			epigraph: {source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi"},
				en: "Toussaint: a southern duchy, vassal of Nilfgaard, where wine is a staple, chivalry a sport, and murder, when it happens, is considered terribly impolite.",
				es: "Toussaint: ducado del sur, vasallo de Nilfgaard, donde el vino es un alimento básico, la caballería un deporte y el asesinato, cuando ocurre, se considera terriblemente descortés."},
			opener: [
				{who: "narrator", en: "Toussaint! Sunshine, vineyards, knights who weep at poetry. I had warned Geralt about the place years before. He ignored me, which is how I knew he'd go.", es: "¡Toussaint! Sol, viñedos, caballeros que lloran con la poesía. Yo le había advertido a Geralt sobre ese lugar años atrás. Me ignoró, y así supe que iría."},
				{who: "narrator", en: "Someone was killing knights there, neatly and without hurry. The Duchess wanted a witcher. The knights wanted a joust. Geralt wanted a quiet glass.", es: "Alguien estaba matando caballeros allí, con pulcritud y sin prisa. La Duquesa quería un brujo. Los caballeros querían una justa. Geralt quería una copa tranquila."},
				{who: "geralt", en: "Too much sun. Too many smiles.", es: "Demasiado sol. Demasiadas sonrisas."}
			],
			rumors: [
				{en: "A Beauclair vintner says a beast has been killing knights by night. The knights say it's the wine. The vintner is offended.", es: "Un viñatero de Beauclair dice que una bestia mata caballeros por la noche. Los caballeros dicen que es el vino. El viñatero está ofendido."},
				{en: "From a lady's letter, Beauclair: \"My dear, the Duchess has a sister, and we are forbidden to say so, so I shan't. Burn this.\" The letter was not burned.", es: "De la carta de una dama de Beauclair: «Querida, la Duquesa tiene una hermana, y está prohibido decirlo, así que no lo diré. Quema esto». La carta no fue quemada."},
				{en: "Toussaint's knights take five vows: chivalry, courage, courtesy, chastity and wine. Most keep one.", es: "Los caballeros de Toussaint hacen cinco votos: caballerosidad, valor, cortesía, castidad y vino. La mayoría cumple uno."}
			]}
	],

	// Narrator lines after a rematch: no reward card is handed over again, and fights told as cards (opp.retold) are simply retold
	rematch: {
		win: [
			{who: "narrator", en: "A rematch, and another win. No new card this time, only crowns. Geralt says crowns are the only honest reward in the world.", es: "Una revancha, y otra victoria. Esta vez no hubo carta nueva, solo coronas. Geralt dice que las coronas son la única recompensa honrada del mundo."},
			{who: "narrator", en: "Another win. I'd write a second verse, but nobody buys second verses.", es: "Otra victoria. Escribiría una segunda estrofa, pero nadie compra segundas estrofas."},
			{who: "narrator", en: "Geralt won again, and his opponent took it worse than the first time. Rematches are like that.", es: "Geralt volvió a ganar, y su rival se lo tomó peor que la primera vez. Las revanchas son así."},
			{who: "narrator", en: "Geralt won again. The loser paid up with the face of someone who had hoped he'd forgotten the way back.", es: "Geralt volvió a ganar. El perdedor pagó con la cara de quien esperaba que él hubiera olvidado el camino de vuelta."}
		],
		retoldWin: [
			{who: "narrator", en: "Again? Fine. Once more, from the top: Geralt won. The ending doesn't change no matter how often you ask.", es: "¿Otra vez? Está bien. Una vez más, desde el principio: Geralt ganó. El final no cambia por más que lo pidas."},
			{who: "narrator", en: "I've told this one so often the tavern mouths the words along with me. He won. He always wins in this one.", es: "He contado esta tantas veces que la taberna mueve los labios conmigo. Ganó. En esta siempre gana."}
		],
		retoldLoss: [
			{who: "narrator", en: "Tonight's telling ends badly. It happens when I'm tired. Ask me again tomorrow.", es: "El relato de esta noche acaba mal. Pasa cuando estoy cansado. Pregúntame mañana."}
		]
	},

	// Single-elimination runs against random opponents; each round sets the AI deck pool, play level and whether heroes are removed
	tournaments: {
		passiflora: {
			name: "Passiflora Tournament", place: "novigrad", requires: "zoltan", fee: 20, perRound: 20, champion: 80,
			prizes: [141, 139],
			rumor: {en: "Novigrad's finest house of pleasure hosts the city's finest gwent tournament. The Church disapproves of both, and attends both, in disguise.", es: "La casa de placer más fina de Novigrad organiza el mejor torneo de gwent de la ciudad. La Iglesia desaprueba ambas cosas y asiste a ambas, disfrazada."},
			dialogue: {
				entry: [{who: "narrator", en: "The Passiflora's madam took Geralt's fee, his sword and his coat, in that order, and gave him back one of the three.", es: "La madama del Passiflora le cobró la inscripción, la espada y el abrigo, en ese orden, y le devolvió una de las tres cosas."}],
				champion: [{who: "narrator", en: "Geralt won the Passiflora tournament. The madam paid him in full and then, as is the custom of the house, charged him for the privilege.", es: "Geralt ganó el torneo del Passiflora. La madama le pagó completo y luego, como es costumbre de la casa, le cobró por el privilegio."}]
			},
			rounds: [{decks: "easy", level: "easy"}, {decks: "easy", level: "hard"}, {decks: "normal", level: "easy", noHeroes: true}],
			entrants: [
				{name: "Count Tybalt", portrait: "realms_natalis"}, {name: "Sasha", portrait: "nilfgaard_assire"},
				{name: "Finneas", portrait: "nilfgaard_stefan"}, {name: "Vimme Vivaldi", portrait: "scoiatael_barclay"},
				{name: "Marquise Serenity", portrait: "realms_sheala"}, {name: "Elihal", portrait: "scoiatael_riordain"},
				{name: "Eveline Gallo", portrait: "realms_sabrina"}, {name: "Stjepan", portrait: "nilfgaard_young_emissary"}
			],
			modifiers: [
				null, null,
				{id: "weather", card: 9, rounds: [1]},
				{id: "weather", card: 11, rounds: [1]},
				{id: "ambush", name: "Card Sharp"},
				{id: "extraDraw", side: "both", name: "House Rules"},
				{id: "informants", name: "Loaded Deck"}
			]
		},
		kaertrolde: {
			name: "Kaer Trolde Tournament", place: "kaertrolde", requires: "crach", fee: 50, perRound: 50, champion: 200, emblem: "skellige_svanrige",
			prizes: [140, 59, 58],
			rumor: {en: "Kaer Trolde notice: TOURNAMENT TONIGHT. Bring a deck, a cup and your own bench. The last bench was used as a weapon.", es: "Aviso en Kaer Trolde: TORNEO ESTA NOCHE. Trae un mazo, una copa y tu propia banca. La última banca se usó como arma."},
			dialogue: {
				entry: [{who: "narrator", en: "In Kaer Trolde the entry fee is paid in crowns, and the real fee in hangovers.", es: "En Kaer Trolde la inscripción se paga en coronas, y la de verdad, en resacas."}],
				champion: [{who: "narrator", en: "The champion of Kaer Trolde is carried around the hall on a shield. Geralt asked them not to. They dropped him twice.", es: "Al campeón de Kaer Trolde lo pasean por el salón sobre un escudo. Geralt les pidió que no. Lo dejaron caer dos veces."}]
			},
			rounds: [{decks: "easy", level: "hard"}, {decks: "normal", level: "easy", noHeroes: true}, {decks: "normal", level: "normal", noHeroes: true}],
			entrants: [
				{name: "Jutta an Dimun", portrait: "skellige_shield_maiden"}, {name: "Sigrdrifa", portrait: "skellige_birna"},
				{name: "Folan", portrait: "skellige_craite_warrior"}, {name: "Gremist", portrait: "skellige_udalryk"},
				{name: "Ulf of Svorlag", portrait: "skellige_holger"}, {name: "Haern Caduch", portrait: "skellige_donar"},
				{name: "Sjusta", portrait: "skellige_heymaey"}, {name: "Brokva Skald", portrait: "skellige_draig"}
			],
			modifiers: [
				null, null,
				{id: "weather", card: 204, rounds: [1], name: "Sea Squall"},
				{id: "weather", card: 2, rounds: [1]},
				{id: "ambush", name: "Raiders"},
				{id: "extraDraw", side: "both", name: "Jarl's Feast"},
				{id: "informants", name: "Loaded Deck"}
			]
		},
		beauclair: {
			name: "Beauclair Tournament", place: "toussaint", requires: "regis", fee: 100, perRound: 100, champion: 400, music: "for-honor",
			prizes: [26, 97, 143],
			rumor: {en: "In Beauclair every match opens with a bow, a toast and a sonnet. Cheating is permitted, provided it rhymes.", es: "En Beauclair cada partida empieza con una reverencia, un brindis y un soneto. Hacer trampa está permitido, siempre que rime."},
			dialogue: {
				entry: [{who: "narrator", en: "The herald read out Geralt's titles, most of which he invented on the spot. Toussaint does not admit untitled players.", es: "El heraldo leyó los títulos de Geralt, que inventó casi todos en el momento. Toussaint no admite jugadores sin título."}],
				champion: [{who: "narrator", en: "Geralt was named Champion of Beauclair, kissed by three baronesses and challenged to two duels before he'd left the table. Toussaint celebrates thoroughly.", es: "Nombraron a Geralt Campeón de Beauclair; tres baronesas lo besaron y lo retaron a dos duelos antes de que se levantara de la mesa. Toussaint celebra a fondo."}]
			},
			rounds: [{decks: "normal", level: "easy", noHeroes: true}, {decks: "normal", level: "normal", noHeroes: true}, {decks: "hard", level: "hard", noHeroes: true}],
			entrants: [
				{name: "Palmerin de Launfal", portrait: "realms_siegfried"}, {name: "Guillaume de Launfal", portrait: "nilfgaard_cahir"},
				{name: "Count Crespi", portrait: "nilfgaard_tibor"}, {name: "Baroness Mariette", portrait: "scoiatael_ida"},
				{name: "Milton de Peyrac-Peyran", portrait: "nilfgaard_albrich"}, {name: "Damien de la Tour", portrait: "nilfgaard_menno"},
				{name: "Vivienne de Tabris", portrait: "scoiatael_havekar_nurse"}, {name: "Orianna", portrait: "monsters_bruxa"}
			],
			modifiers: [
				null, null,
				{id: "weather", card: 9, rounds: [1]},
				{id: "weather", card: 11, rounds: [1]},
				{id: "ambush", name: "First Joust"},
				{id: "extraDraw", side: "both", name: "Wine Tasting"},
				{id: "informants", name: "Loaded Deck"}
			]
		}
	},

	opponents: {
		// ---------- Prologue: White Orchard ----------
		innkeeper: {
			chapter: "prologue", name: "Innkeeper", portrait: "realms_banner_nurse", pin: {x: 83, y: 81}, level: "easy", guide: true,
			deck: {faction: "realms", leader: 22, cards: [
				[40,3], [42,1], [43,1], [35,1], [36,1], [53,1], [44,1], [50,1], [28,2], [30,2],
				[52,1], [46,1], [54,1], [27,1], [45,1], [48,1], [31,1], [1,1], [2,1]
			]},
			modifiers: [], objectives: ["sweep", "hand3"], rewards: [[1,1]],
			rumor: {en: "The White Orchard innkeeper has served Temerians, Nilfgaardians and deserters, often at the same table. She waters the ale for all of them equally.", es: "La posadera de Huerto Blanco ha servido a temerios, nilfgaardianos y desertores, a menudo en la misma mesa. Les agua la cerveza a todos por igual."},
			dialogue: {
				intro: [
					{who: "narrator", en: "The inn served three things: thin ale, thinner stew, and news. Geralt wanted the news. The innkeeper wanted a game.", es: "La posada servía tres cosas: cerveza aguada, guiso más aguado aún y noticias. Geralt quería las noticias. La posadera quería una partida."},
					{who: "opp", en: "A witcher. Haven't seen your kind since before the war. You play gwent?", es: "Un brujo. No veía a uno de los tuyos desde antes de la guerra. ¿Juegas gwent?"},
					{who: "geralt", en: "Never had the time.", es: "Nunca tuve tiempo."},
					{who: "opp", en: "Then learn. Three rounds, two lives, the stronger board takes the round. Win, and I'll tell you who passed through here.", es: "Entonces aprende. Tres rondas, dos vidas, el tablero más fuerte gana la ronda. Gana y te digo quién pasó por aquí."}
				],
				win: [
					{who: "opp", en: "Fast learner. Here, a Decoy. Every player needs one, and every soldier wishes he had one.", es: "Aprendes rápido. Toma, un Decoy. Todo jugador necesita uno, y todo soldado desearía tenerlo."},
					{who: "narrator", en: "She told him about a woman in black on a black horse, smelling of lilac. It was the first true thing he'd heard in a month.", es: "Le habló de una mujer de negro en un caballo negro, que olía a lilas. Fue lo primero cierto que él escuchaba en un mes."}
				],
				loss: [{who: "opp", en: "Don't sulk, witcher. Nobody wins their first hand. Except the house.", es: "No te enojes, brujo. Nadie gana su primera mano. Salvo la casa."}]
			}
		},
		gwynleve: {
			chapter: "prologue", name: "Capt. Peter Saar Gwynleve", portrait: "nilfgaard_imperal_brigade", pin: {x: 91, y: 77}, level: "easy",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[61,1], [66,1], [71,3], [74,1], [76,3], [77,1], [78,1], [80,1], [85,1],
				[87,1], [89,1], [67,1], [90,1], [91,1], [5,1], [11,1]
			]},
			modifiers: [], objectives: ["noLeader", "margin20"], rewards: [[5,1]],
			rumor: {en: "The Nilfgaardian captain fines looters, hangs deserters and files a report on both. The villagers can't decide if he's a tyrant or the only honest man in Temeria.", es: "El capitán nilfgaardiano multa a los saqueadores, ahorca a los desertores y redacta un informe sobre ambos. Los aldeanos no saben si es un tirano o el único hombre honrado de Temeria."},
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher. You'll need a permit to travel the Imperial road. Permits are issued after supper. Supper is after cards.", es: "Brujo. Necesitarás un permiso para usar el camino imperial. Los permisos se expiden después de la cena. La cena es después de las cartas."},
					{who: "geralt", en: "Efficient.", es: "Eficiente."},
					{who: "opp", en: "The Empire is many things. Efficient is the one we put on the banners.", es: "El Imperio es muchas cosas. Eficiente es la que ponemos en los estandartes."}
				],
				win: [{who: "opp", en: "Hm. Take the Commander's Horn, and your permit. Stamped. Do not lose either.", es: "Hm. Toma el Commander's Horn, y tu permiso. Sellado. No pierdas ninguno de los dos."}],
				loss: [{who: "opp", en: "Discipline beats talent. I'll note that in the report.", es: "La disciplina vence al talento. Lo anotaré en el informe."}]
			}
		},
		griffin: {
			chapter: "prologue", name: "The Griffin", portrait: "monsters_gryffin", pin: {x: 95, y: 95}, level: "easy", retold: true,
			deck: {faction: "monsters", leader: 96, cards: [
				[121,1], [122,1], [103,1], [137,1], [104,1], [116,1], [110,1], [113,1], [127,1], [128,1],
				[129,1], [117,1], [118,1], [119,1], [114,1], [115,1], [102,1], [120,1],
				[10,1], [9,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1]}], objectives: ["sweep", "noWeather"], rewards: [[10,1]],
			rumor: {en: "The hunters say the griffin only attacks men in uniform. The soldiers call that slander. The griffin has not commented.", es: "Los cazadores dicen que el grifo solo ataca a hombres de uniforme. Los soldados dicen que es una calumnia. El grifo no ha hecho comentarios."},
			dialogue: {
				intro: [
					{who: "narrator", en: "I'll tell this fight as a game of cards. The truth involves a cart of bait, a great many feathers, and more blood than a ballad can carry.", es: "Contaré esta pelea como una partida de cartas. La verdad incluye un carro de cebo, muchísimas plumas y más sangre de la que cabe en una balada."},
					{who: "narrator", en: "Soldiers had killed her mate two summers before. Since then she hunted anything in uniform. I don't defend her. I only note she had reasons, which is more than most kings can say.", es: "Unos soldados habían matado a su pareja dos veranos antes. Desde entonces cazaba todo lo que llevara uniforme. No la defiendo. Solo señalo que tenía razones, algo que pocos reyes pueden decir."},
					{who: "geralt", en: "Fog's rolling in. She'll come out of it.", es: "Se acerca la niebla. Saldrá de ella."}
				],
				win: [
					{who: "narrator", en: "When it was over, Geralt sat by her a while. Among the bones of her nest he found a soldier's Scorch card, singed but whole.", es: "Cuando terminó, Geralt se quedó un rato sentado junto a ella. Entre los huesos de su nido encontró la carta de Scorch de algún soldado, chamuscada pero entera."},
					{who: "narrator", en: "I'd have written a ballad. He pocketed the card and said nothing all the way back.", es: "Yo le habría compuesto una balada. Él se guardó la carta y no dijo nada en todo el camino de vuelta."}
				],
				loss: [{who: "geralt", en: "Too fast in the fog. Need a better plan.", es: "Demasiado rápida en la niebla. Necesito un mejor plan."}]
			}
		},
		vesemir: {
			chapter: "prologue", name: "Vesemir", portrait: "neutral_vesemir", pin: {x: 90, y: 82}, level: "normal", boss: true, music: "eyes-of-the-wolf",
			deck: {faction: "realms", leader: 22, cards: [
				[13,1], [214,1], [28,3], [30,2], [54,1], [38,1],
				[48,1], [52,1], [46,1], [35,1], [36,1], [37,1], [2,1], [4,1]
			]},
			modifiers: [], objectives: ["sweep", "noLeader"], rewards: [[13,1], [214,1]],
			rumor: {en: "An old witcher camps by the White Orchard mill. He cooks badly, sings worse, and this week has seen off three wolves and a Nilfgaardian tax collector.", es: "Un viejo brujo acampa junto al molino de Huerto Blanco. Cocina mal, canta peor y esta semana ya ahuyentó a tres lobos y a un recaudador nilfgaardiano."},
			dialogue: {
				intro: [
					{who: "opp", en: "Gwent? You? Fifty years I tried to teach you patience. Seems a card table managed it in a week.", es: "¿Gwent? ¿Tú? Cincuenta años intenté enseñarte paciencia. Parece que una mesa de cartas lo logró en una semana."},
					{who: "geralt", en: "Don't go easy on me.", es: "No te contengas."},
					{who: "opp", en: "Never have. Not about to start now you've gone grey.", es: "Nunca lo hice. No voy a empezar ahora que te has puesto canoso."}
				],
				win: [
					{who: "opp", en: "Not bad, pup. Take my card, and Roach's. Someone has to keep an eye on you, and she's smarter than both of us.", es: "Nada mal, cachorro. Toma mi carta, y la de Roach. Alguien tiene que vigilarte, y ella es más lista que nosotros dos."},
					{who: "narrator", en: "The trail led north, to Vizima and an emperor. Vesemir rode beside him. I'd give a great deal for more mornings like that one.", es: "El rastro llevaba al norte, a Vizima y a un emperador. Vesemir cabalgaba a su lado. Daría mucho por más mañanas como aquella."},
					{who: "chronicle", source: {en: "Kaer Morhen records (one page, water-damaged)", es: "Registros de Kaer Morhen (una página, dañada por el agua)"}, en: "Vesemir. Instructor. Fencing, alchemy, bestiary. Cooking: no.", es: "Vesemir. Instructor. Esgrima, alquimia, bestiario. Cocina: no."}
				],
				loss: [{who: "opp", en: "Sloppy. Again. And this time, think before you play.", es: "Descuidado. Otra vez. Y esta vez, piensa antes de jugar."}],
				rematch: [{who: "narrator", en: "Long after, Geralt still replayed his games with Vesemir in his head, move by move. He tells me he wins most of them now. He doesn't sound pleased about it.", es: "Mucho después, Geralt todavía repasaba en su cabeza sus partidas con Vesemir, jugada por jugada. Me dice que ahora gana casi todas. No suena contento."}]
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
			rumor: {en: "The Nilfgaardian ambassador has a smile for every occasion. The palace servants have counted eleven. None of them reach his eyes.", es: "El embajador nilfgaardiano tiene una sonrisa para cada ocasión. Los criados del palacio han contado once. Ninguna le llega a los ojos."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Shilard Fitz-Oesterlen, ambassador, could insult you in four languages and be thanked for it in all of them.", es: "Shilard Fitz-Oesterlen, embajador, podía insultarte en cuatro idiomas y recibir las gracias en todos ellos."},
					{who: "opp", en: "Geralt of Rivia! His Imperial Majesty is delayed by matters of state. Shall we pass the time like civilized men?", es: "¡Geralt de Rivia! Asuntos de Estado retrasan a Su Majestad Imperial. ¿Pasamos el rato como hombres civilizados?"},
					{who: "geralt", en: "Diplomats don't play civilized.", es: "Los diplomáticos no juegan limpio."},
					{who: "opp", en: "Precisely why we play so well.", es: "Justamente por eso jugamos tan bien."}
				],
				win: [{who: "opp", en: "Splendid. A gift: Clear Weather. One should always leave a meeting with something, even if it is only the forecast.", es: "Espléndido. Un regalo: Clear Weather. Uno siempre debe salir de una reunión con algo, aunque solo sea el pronóstico del tiempo."}],
				loss: [{who: "opp", en: "Do not keep the Emperor waiting on account of a sore loss. He has had men hanged for less. Well, for different.", es: "No hagas esperar al Emperador por tu mal perder. Ha mandado colgar a hombres por menos. Bueno, por otras cosas."}]
			}
		},
		emhyr: {
			chapter: "vizima", name: "Emhyr var Emreis", portrait: "nilfgaard_emhyr_copper", pin: {x: 93.5, y: 62}, level: "normal", boss: true, unlocks: "nilfgaard", music: "emhyr-var-emreis",
			deck: {faction: "nilfgaard", leader: 58, cards: [
				[63,1], [65,1], [71,2],
				[79,1], [78,1], [87,1], [66,1], [92,1], [82,1], [9,1],
				[11,1], [5,1], [1,1]
			]},
			modifiers: [], objectives: ["sweep", "margin20"], rewards: [[56,1]],
			rumor: {en: "They say the Emperor once spent years cursed, as a hedgehog. Say it in Vizima and you'll spend years in a cell, as a prisoner.", es: "Dicen que el Emperador pasó años maldito, convertido en erizo. Dilo en Vizima y pasarás años en una celda, convertido en preso."},
			dialogue: {
				intro: [
					{who: "narrator", en: "The Emperor of Nilfgaard received Geralt alone, which was an honor, and without guards, which was a threat.", es: "El Emperador de Nilfgaard recibió a Geralt a solas, lo cual era un honor, y sin guardias, lo cual era una amenaza."},
					{who: "opp", en: "Witcher. You will find my daughter. Before that, you will sit. I wish to see how you think.", es: "Brujo. Encontrarás a mi hija. Antes, te sentarás. Quiero ver cómo piensas."},
					{who: "geralt", en: "And if I win?", es: "¿Y si gano?"},
					{who: "narrator", en: "Emhyr did not answer. The White Flame tolerates no other leader at his table, so Geralt played without his. Nobody suggested otherwise.", es: "Emhyr no respondió. La Llama Blanca no tolera a ningún otro líder en su mesa, así que Geralt jugó sin el suyo. Nadie sugirió lo contrario."}
				],
				win: [
					{who: "opp", en: "Adequate. My card is yours, and the Empire's cards with it. Find her, witcher. She is all that is left of her mother.", es: "Aceptable. Mi carta es tuya, y con ella las cartas del Imperio. Encuéntrala, brujo. Es lo único que queda de su madre."},
					{who: "geralt", en: "Velen, then.", es: "Entonces, a Velen."},
					{who: "narrator", en: "He left with a purse of gold and the feeling of having been bought. Both turned out to be accurate.", es: "Se fue con una bolsa de oro y la sensación de que lo habían comprado. Ambas cosas resultaron ciertas."},
					{who: "chronicle", source: {en: "Imperial Chancery of Nilfgaard, register of expenses", es: "Cancillería Imperial de Nilfgaard, registro de gastos"}, en: "Item: one witcher, retained for the recovery of a person of interest. Paid in advance. Outcome: to be determined.", es: "Partida: un brujo, contratado para la recuperación de una persona de interés. Pagado por adelantado. Resultado: por determinar."}
				],
				loss: [{who: "opp", en: "You disappoint me. Do not make a habit of it.", es: "Me decepcionas. No lo conviertas en costumbre."}]
			}
		},

		// ---------- Chapter II: Velen ----------
		quartermaster: {
			chapter: "velen", name: "Crow's Perch Quartermaster", portrait: "realms_poor_infantry", pin: {x: 53, y: 57}, place: "crowsperch", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[28,3], [30,3], [40,4], [35,1], [36,1], [37,1], [32,1], [54,1],
				[44,1], [53,1], [50,1], [2,1], [11,1]
			]},
			modifiers: [], objectives: ["sweep", "noWeather"], rewards: [[32,1]],
			rumor: {en: "Crow's Perch stores, Tuesday: arrows, 400. Grain, 12 sacks. \"Baron's secrets\", 1, sold. Price illegible.", es: "Almacén de Nido de Cuervos, martes: flechas, 400. Grano, 12 sacos. «Secretos del Barón», 1, vendido. Precio ilegible."},
			dialogue: {
				intro: [
					{who: "opp", en: "The Baron's busy. Busy drinking, mostly. You want a word, you earn it at my table first.", es: "El Barón está ocupado. Ocupado bebiendo, sobre todo. Si quieres hablar con él, primero gánatelo en mi mesa."},
					{who: "geralt", en: "Deal.", es: "Trato hecho."},
					{who: "narrator", en: "Geralt had passed a dozen hanged men on the way to that table. In Velen, I'm sorry to say, a game of cards was the polite option.", es: "Camino a esa mesa, Geralt había pasado junto a una docena de ahorcados. En Velen, lamento decirlo, una partida de cartas era la opción educada."}
				],
				win: [{who: "opp", en: "Fine, fine. Take the medic too. She's patched up worse than you, mostly on the Baron's orders.", es: "Está bien, está bien. Llévate también a la sanadora. Ha curado a gente en peor estado que tú, casi siempre por orden del Barón."}],
				loss: [{who: "opp", en: "Come back when you've got a real deck, witcher. Or a real bribe.", es: "Vuelve cuando tengas un mazo de verdad, brujo. O un soborno de verdad."}]
			}
		},
		baron: {
			chapter: "velen", name: "Bloody Baron", portrait: "realms_redania_1", pin: {x: 51, y: 55}, place: "crowsperch", level: "normal",
			deck: {faction: "realms", leader: 23, cards: [
				[28,2], [30,1], [52,1], [46,1], [48,1], [38,1],
				[54,1], [55,1], [27,1], [35,1], [36,1], [37,1], [5,1], [1,1],
				[4,1]
			]},
			modifiers: [{id: "extraDraw", side: "both"}], objectives: ["noLeader", "margin20"], rewards: [[23,1]],
			rumor: {en: "The Baron's men call him a fair master. The Baron's servants say nothing at all, and look at the floor while they say it.", es: "Los hombres del Barón dicen que es un amo justo. Los criados del Barón no dicen nada, y miran al suelo mientras lo dicen."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Phillip Strenger, the Bloody Baron, held Crow's Perch, a great deal of wine and a grief he would not name. He drank to the first two and played cards to avoid the third.", es: "Phillip Strenger, el Barón Sanguinario, tenía Nido de Cuervos, mucho vino y una pena que no nombraba. Bebía por las dos primeras cosas y jugaba a las cartas para evitar la tercera."},
					{who: "opp", en: "Witcher! Sit, drink, play. A man's hand says more about him than his tongue.", es: "¡Brujo! Siéntate, bebe, juega. La mano de un hombre dice más de él que su lengua."},
					{who: "geralt", en: "After, we talk about a girl with ashen hair.", es: "Después hablamos de una muchacha de cabello ceniza."},
					{who: "opp", en: "After. My hospitality first: an extra card for everyone at my table, you and me both.", es: "Después. Primero mi hospitalidad: una carta extra para todos en mi mesa, para ti y para mí."}
				],
				win: [
					{who: "opp", en: "Ha! You play like you fight. Take Foltest. My old king would've liked you. He liked anyone who didn't ask questions.", es: "¡Ja! Juegas como peleas. Llévate a Foltest. A mi viejo rey le habrías caído bien. Le caía bien cualquiera que no hiciera preguntas."},
					{who: "narrator", en: "Then he told Geralt about Ciri, and about his wife and daughter, who had left him. He didn't say why. He didn't have to.", es: "Entonces le habló a Geralt de Ciri, y de su esposa y su hija, que lo habían abandonado. No dijo por qué. No hacía falta."}
				],
				loss: [{who: "opp", en: "Another round! And another drink! The questions can wait. They always do.", es: "¡Otra ronda! ¡Y otro trago! Las preguntas pueden esperar. Siempre esperan."}]
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
			rumor: {en: "A sorceress lives in a hut in the swamp, they say, and cures warts for free. Nobody can work out what she's really after.", es: "Dicen que una hechicera vive en una choza del pantano y cura verrugas gratis. Nadie logra averiguar qué busca en realidad."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Keira Metz, once of the royal court, now of a hut in the woods. She had traded silk for mud and never once stopped complaining about it.", es: "Keira Metz, antes de la corte real, ahora de una choza en el bosque. Había cambiado la seda por el barro y no había dejado de quejarse ni un solo día."},
					{who: "opp", en: "Geralt, darling. You smell like a bog. Sit. I've conjured a little rain for the first round, to keep the peasants away and you humble.", es: "Geralt, querido. Hueles a pantano. Siéntate. Conjuré un poco de lluvia para la primera ronda, para alejar a los campesinos y para que seas humilde."},
					{who: "geralt", en: "Your rain won't save you.", es: "Tu lluvia no te salvará."},
					{who: "opp", en: "We'll see.", es: "Ya veremos."}
				],
				win: [{who: "opp", en: "Clever. Keep my card, a reminder of the sorceress who let you win. And do write. Nobody writes to Velen.", es: "Astuto. Quédate con mi carta, como recuerdo de la hechicera que te dejó ganar. Y escríbeme. Nadie le escribe a Velen."}],
				loss: [{who: "opp", en: "Don't look so glum. It's only rain. Everything here is only rain.", es: "No pongas esa cara. Solo es lluvia. Aquí todo es solo lluvia."}]
			}
		},
		peasant: {
			chapter: "velen", name: "Midcopse Peasant", portrait: "neutral_cow", pin: {x: 61, y: 53}, level: "easy",
			deck: {faction: "realms", leader: 22, cards: [
				[20,1], [40,4], [42,1], [43,1], [35,1], [36,1], [37,1], [53,1], [44,1], [50,1],
				[28,2], [27,1], [54,1], [52,1], [46,1], [30,2], [11,1]
			]},
			modifiers: [], objectives: ["sweep", "second"], rewards: [[20,1]],
			rumor: {en: "A Midcopse farmer claims his cow is cursed. The cow claims nothing, and is by all accounts the more reliable witness.", es: "Un granjero de Midcopse asegura que su vaca está maldita. La vaca no asegura nada, y según todos es el testigo más fiable."},
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher! Play me, and if ye win, ye can have me cow. She's cursed. Probably.", es: "¡Brujo! Juega conmigo y, si ganas, te quedas con mi vaca. Está maldita. Seguramente."},
					{who: "geralt", en: "Cursed how?", es: "¿Maldita cómo?"},
					{who: "opp", en: "Last fella what owned her died, and something big crawled out of the ground. Could be coincidence. Velen's like that.", es: "El último que la tuvo se murió, y algo enorme salió de la tierra. Puede ser casualidad. Velen es así."},
					{who: "geralt", en: "...Fine.", es: "...Está bien."}
				],
				win: [
					{who: "opp", en: "Take 'er! And if something big and angry shows up when she dies, that's yer problem.", es: "¡Llévatela! Y si aparece algo grande y furioso cuando se muera, es tu problema."},
					{who: "narrator", en: "Geralt led the cow away on a rope. I have it on good authority that Roach never forgave him.", es: "Geralt se llevó a la vaca atada de una soga. Sé de buena fuente que Roach nunca se lo perdonó."}
				],
				loss: [{who: "opp", en: "Ha! Not even a witcher beats a Velen farmer!", es: "¡Ja! ¡Ni un brujo le gana a un granjero de Velen!"}]
			}
		},
		deserters: {
			chapter: "velen", name: "Deserters", portrait: "weather_frost", pin: {x: 60, y: 43}, level: "normal",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[71,4], [76,3], [90,1], [91,1], [74,1], [78,1], [89,1], [65,1], [79,1], [77,1],
				[87,1], [66,1], [85,1], [61,1], [80,1], [92,1], [82,1], [67,1], [68,1], [2,1],
				[1,1]
			]},
			modifiers: [{id: "ambush"}], objectives: ["second", "noLeader"], rewards: [[27,1]],
			rumor: {en: "\"We're not deserters. We're early retirees.\" (a man in boots from three different armies, on the old Nilfgaardian road)", es: "«No somos desertores. Somos jubilados anticipados». (un hombre con botas de tres ejércitos distintos, en el viejo camino nilfgaardiano)"},
			dialogue: {
				intro: [
					{who: "opp", en: "Nice sword. Nicer purse. Sit down and lose 'em proper, witcher.", es: "Linda espada. Mejor bolsa. Siéntate y piérdelas como se debe, brujo."},
					{who: "narrator", en: "They dealt before he'd even sat down, so they went first. Deserters, I find, have no manners whatsoever, and in Velen nobody had any to spare.", es: "Repartieron antes de que se sentara, así que empezaron ellos. Los desertores, me temo, no tienen modales en absoluto, y en Velen a nadie le sobraban."},
					{who: "geralt", en: "Fine. You first.", es: "Bien. Ustedes primero."}
				],
				win: [{who: "opp", en: "Take the bloody ballista. We stole it anyway. Off a dead man, so nobody's asking.", es: "Llévate la maldita balista. De todos modos la robamos. A un muerto, así que nadie va a preguntar."}],
				loss: [{who: "opp", en: "Thanks for the coin, witcher! It's going to a good cause. Us.", es: "¡Gracias por las monedas, brujo! Van a una buena causa. Nosotros."}]
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
			rumor: {en: "From a Nilfgaardian soldier's letter home: \"The commander is polite to us. Nobody knows what we did.\"", es: "De la carta de un soldado nilfgaardiano a su casa: «El comandante es educado con nosotros. Nadie sabe qué hicimos»."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Morvran Voorhis had been sent to Velen to win a war, and spent his days signing requisitions for boots. He welcomed any distraction.", es: "A Morvran Voorhis lo habían enviado a Velen a ganar una guerra, y pasaba los días firmando solicitudes de botas. Agradecía cualquier distracción."},
					{who: "opp", en: "The Emperor's witcher. My orders say to assist you. They say nothing about letting you win.", es: "El brujo del Emperador. Mis órdenes dicen que te ayude. No dicen nada de dejarte ganar."},
					{who: "geralt", en: "Wouldn't want it any other way.", es: "No lo querría de otra forma."}
				],
				win: [{who: "opp", en: "Well played. My card is yours. May it serve you better than Velen serves me.", es: "Bien jugado. Mi carta es tuya. Ojalá te sirva mejor de lo que Velen me sirve a mí."}],
				loss: [{who: "opp", en: "Nilfgaard does not lose to mercenaries. It merely, on occasion, pays them.", es: "Nilfgaard no pierde contra mercenarios. Solo, en ocasiones, les paga."}]
			}
		},
		werewolf: {
			chapter: "velen", name: "Werewolf", portrait: "monsters_werewolf", pin: {x: 74.5, y: 62}, level: "normal", retold: true,
			deck: {faction: "monsters", leader: 93, cards: [
				[136,1], [121,1], [102,1], [117,1], [118,1],
				[119,1], [122,1], [103,1],
				[110,1], [137,1], [9,1], [5,1]
			]},
			modifiers: [], objectives: ["noWeather", "second"], rewards: [[136,1]],
			rumor: {en: "The hunters say the werewolf only takes sheep. The shepherd's wife says it only takes from her husband's flock. She seems oddly pleased about it.", es: "Los cazadores dicen que el hombre lobo solo se lleva ovejas. La esposa del pastor dice que solo se las lleva del rebaño de su marido. Parece extrañamente contenta."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Claw marks on the doors, a howl in the woods, a contract on the notice board. In my telling it's a game of cards. In the woods it was something else entirely.", es: "Marcas de garras en las puertas, un aullido en el bosque, un contrato en el tablón. En mi relato es una partida de cartas. En el bosque fue algo muy distinto."},
					{who: "narrator", en: "The beast had been a man once, a woodcutter cursed for something his father did. Curses, like debts, are inherited in Velen.", es: "La bestia había sido un hombre, un leñador maldito por algo que hizo su padre. Las maldiciones, como las deudas, se heredan en Velen."},
					{who: "geralt", en: "Full moon tonight. Let's get this over with.", es: "Hoy hay luna llena. Terminemos con esto."}
				],
				win: [{who: "narrator", en: "The curse lifted with the dawn. The woodcutter woke in the ferns and wept. The village paid Geralt with a card bearing the beast's face, which struck me as tactless.", es: "La maldición se rompió al amanecer. El leñador despertó entre los helechos y lloró. La aldea le pagó a Geralt con una carta que llevaba el rostro de la bestia, lo cual me pareció de mal gusto."}],
				loss: [{who: "geralt", en: "Faster than I thought. Angrier, too.", es: "Más rápido de lo que pensé. Y más furioso."}]
			}
		},
		crones: {
			chapter: "velen", name: "The Crones", portrait: "monsters_witch_velen", pin: {x: 65, y: 60}, level: "normal", boss: true, unlocks: "monsters", retold: true, music: "ladies-of-the-woods",
			deck: {faction: "monsters", leader: 96, cards: [
				[105,1], [106,1], [107,1], [130,1], [113,1], [127,1], [128,1], [129,1], [117,1],
				[118,1], [119,1], [102,1],
				[122,1], [120,1], [9,1], [1,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1, 2, 3]}], objectives: ["sweep", "noLeader"], rewards: [[105,1], [106,1], [107,1]],
			rumor: {en: "Children in Crookback Bog sing a rhyme about three old mothers. The ones who sing it wrong are never punished. They're simply never seen again.", es: "Los niños del Pantano Jorobado cantan una rima sobre tres viejas madres. A los que la cantan mal nunca los castigan. Simplemente, nadie vuelve a verlos."},
			dialogue: {
				intro: [
					{who: "narrator", en: "In the heart of Crookback Bog the Ladies of the Wood held court. The villagers loved them, fed them and feared them, which in Velen is the same thing.", es: "En el corazón del Pantano Jorobado, las Damas del Bosque tenían su corte. Los aldeanos las amaban, las alimentaban y les temían, lo cual en Velen es lo mismo."},
					{who: "opp", en: "Little wolf, come to bargain with the Ladies of the Wood?", es: "Lobito, ¿vienes a negociar con las Damas del Bosque?"},
					{who: "opp", en: "Fight for the girl, then. The mist is ours, and so are the children of the bog.", es: "Pelea por la niña, entonces. La niebla es nuestra, y también los hijos del pantano."},
					{who: "geralt", en: "Fog won't lift. Not while they live.", es: "La niebla no se levantará. No mientras ellas vivan."}
				],
				win: [
					{who: "opp", en: "Clever wolf... Take our sisters' cards. They will serve you. For now.", es: "Lobo astuto... Toma las cartas de nuestras hermanas. Te servirán. Por ahora."},
					{who: "narrator", en: "Ciri had escaped them long before, it turned out. The orphans of the bog had not. I've left their part out of the song. Geralt asked me to.", es: "Resultó que Ciri se les había escapado mucho antes. Los huérfanos del pantano, no. He dejado su parte fuera de la canción. Geralt me lo pidió."},
					{who: "narrator", en: "As for the Baron's wife: she was found, in a manner of speaking, and the Baron carried her off toward the mountains. No version of how that ended is worth singing.", es: "En cuanto a la esposa del Barón: la encontraron, por así decirlo, y el Barón se la llevó hacia las montañas. Ninguna versión de cómo terminó aquello merece cantarse."},
					{who: "chronicle", source: {en: "Effenberg & Talbot, Encyclopaedia Maxima Mundi", es: "Effenberg y Talbot, Encyclopaedia Maxima Mundi"}, en: "Ladies of the Wood: in Velenian folk belief, benevolent spirits who protect villages in exchange for small offerings. Harmless.", es: "Damas del Bosque: en las creencias populares de Velen, espíritus benévolos que protegen las aldeas a cambio de pequeñas ofrendas. Inofensivas."}
				],
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
			rumor: {en: "The new owner of the Chameleon is a famous poet, they say, and a famous debtor. His creditors come to every show.", es: "Dicen que el nuevo dueño del Camaleón es un poeta famoso, y un deudor famoso. Sus acreedores van a todas las funciones."},
			dialogue: {
				intro: [
					{who: "narrator", en: "In the interest of honesty, I must tell you the next opponent was devilishly handsome, and modest besides.", es: "En honor a la verdad, debo decirte que el siguiente rival era endiabladamente apuesto y, además, modesto."},
					{who: "opp", en: "Geralt! The Chameleon's grand opening needs a headline act. A friendly game, for the crowd?", es: "¡Geralt! La gran inauguración del Camaleón necesita un número principal. ¿Una partida amistosa, para el público?"},
					{who: "geralt", en: "Friendly. With you.", es: "Amistosa. Contigo."},
					{who: "opp", en: "I'm wounded. Deal the cards.", es: "Me hieres. Reparte las cartas."}
				],
				win: [
					{who: "opp", en: "Bravo! Take my card. Every army needs a bard to sing of its victories, and to invent a few.", es: "¡Bravo! Toma mi carta. Todo ejército necesita un bardo que cante sus victorias, y que invente algunas."},
					{who: "narrator", en: "For the record, I let him win. The audience adored it. My creditors, less so.", es: "Que conste que lo dejé ganar. Al público le encantó. A mis acreedores, no tanto."},
					{who: "narrator", en: "Afterwards I told him what I knew: Ciri had found trouble in Novigrad, left it worse, and taken a ship for Skellige. He listened to every word, which was a first.", es: "Después le conté lo que sabía: Ciri había encontrado problemas en Novigrad, los había dejado peor y había tomado un barco a Skellige. Escuchó cada palabra, lo cual fue una novedad."}
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
			rumor: {en: "The witch hunters are searching Novigrad for a red-haired sorceress. So far they've arrested four redheads, a fox and a very surprised priest.", es: "Los cazadores de brujas buscan en Novigrad a una hechicera pelirroja. Hasta ahora han arrestado a cuatro pelirrojos, un zorro y un sacerdote muy sorprendido."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Novigrad burned sorceresses in those days. Triss Merigold was hiding in plain sight, and she wanted nothing on the table that smelled of magic.", es: "En aquellos días, Novigrad quemaba hechiceras. Triss Merigold se escondía a plena vista, y no quería en la mesa nada que oliera a magia."},
					{who: "opp", en: "Geralt. Witch hunters are watching. No weather cards, please.", es: "Geralt. Los cazadores de brujas vigilan. Nada de cartas de clima, por favor."},
					{who: "geralt", en: "And your own cards?", es: "¿Y tus propias cartas?"},
					{who: "opp", en: "Mine are perfectly respectable. Mostly.", es: "Las mías son perfectamente respetables. Casi todas."}
				],
				win: [
					{who: "opp", en: "You haven't lost your touch. Keep my card, and think of me in Kovir, where they don't burn people for being clever.", es: "No has perdido el toque. Quédate con mi carta y piensa en mí cuando esté en Kovir, donde no queman a la gente por ser lista."},
					{who: "narrator", en: "She sailed that week with the city's last mages hidden in the hold. Not all of them made it to the docks. She doesn't talk about that.", es: "Zarpó esa semana con los últimos magos de la ciudad escondidos en la bodega. No todos llegaron al muelle. Ella no habla de eso."}
				],
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
			rumor: {en: "Sigi Reuven, bathhouse owner, insists he's an honest businessman. Three kingdoms' worth of missing spies would disagree, if anyone could find them.", es: "Sigi Reuven, dueño de una casa de baños, insiste en que es un comerciante honrado. Los espías desaparecidos de tres reinos dirían lo contrario, si alguien pudiera encontrarlos."},
			dialogue: {
				intro: [
					{who: "opp", en: "Witcher. Sit. My informants tell me everything, including what's in your hand.", es: "Brujo. Siéntate. Mis informantes me lo cuentan todo, incluso lo que tienes en la mano."},
					{who: "geralt", en: "Then you know I'm about to win.", es: "Entonces sabes que estoy a punto de ganar."},
					{who: "narrator", en: "His spies relieved Geralt of a random card before the first round, which Sigi called \"an audit\". He never played fair, and he was proud of it.", es: "Sus espías le quitaron a Geralt una carta al azar antes de la primera ronda, algo que Sigi llamaba «una auditoría». Nunca jugó limpio, y estaba orgulloso de ello."}
				],
				win: [{who: "opp", en: "Hah! Fine. My card, and Foltest's old siege banner. Redania remembers its friends. Mostly when it needs them.", es: "¡Ja! Está bien. Mi carta, y el viejo estandarte de asedio de Foltest. Redania recuerda a sus amigos. Sobre todo cuando los necesita."}],
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
			rumor: {en: "King Radovid has put a price on a sorceress who can turn into an owl. Since then, every owl in Redania has been arrested at least once.", es: "El rey Radovid puso precio a la cabeza de una hechicera que puede convertirse en búho. Desde entonces, cada búho de Redania ha sido arrestado al menos una vez."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Hiding from Radovid's hunters, the Lodge of Sorceresses was plotting again. Philippa received Geralt with an owl's patience.", es: "Escondida de los cazadores de Radovid, la Logia de Hechiceras volvía a conspirar. Philippa recibió a Geralt con la paciencia de un búho."},
					{who: "opp", en: "The Lodge has eyes everywhere, witcher. You'll find your hand a little lighter.", es: "La Logia tiene ojos en todas partes, brujo. Notarás tu mano algo más ligera."},
					{who: "geralt", en: "Figures.", es: "Era de esperar."}
				],
				win: [{who: "opp", en: "Impressive. My card, then. Consider it an investment. The Lodge always collects.", es: "Impresionante. Mi carta, entonces. Considérala una inversión. La Logia siempre cobra."}],
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
			rumor: {en: "Temerian partisans hide in the woods near Oxenfurt, they say. They pay for bread in Nilfgaardian coin, taken from Nilfgaardians.", es: "Dicen que los partisanos temerios se esconden en los bosques cerca de Oxenfurt. Pagan el pan con monedas nilfgaardianas, sacadas de nilfgaardianos."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Vernon Roche served a king who was dead, in a kingdom that no longer existed. Loyalty like that is either admirable or a symptom.", es: "Vernon Roche servía a un rey muerto, en un reino que ya no existía. Una lealtad así es admirable o es un síntoma."},
					{who: "opp", en: "Geralt. The Blue Stripes don't wait for permission. We strike first.", es: "Geralt. Las Rayas Azules no piden permiso. Atacamos primero."},
					{who: "geralt", en: "Like old times.", es: "Como en los viejos tiempos."}
				],
				win: [{who: "opp", en: "For Temeria. Take my card, and the Steel-Forged king's. Better in your hands than Radovid's.", es: "Por Temeria. Toma mi carta, y la del rey Forjado en Acero. Mejor en tus manos que en las de Radovid."}],
				loss: [{who: "opp", en: "Temeria isn't dead yet. Neither is my deck.", es: "Temeria aún no ha muerto. Tampoco mi mazo."}]
			}
		},
		zoltan: {
			chapter: "novigrad", name: "Zoltan Chivay", portrait: "neutral_zoltan", pin: {x: 49, y: 29}, place: "novigrad", level: "hard", boss: true, unlocks: "scoiatael", music: "tavern",
			deck: {faction: "scoiatael", leader: 142, cards: [
				[16,1], [151,1], [152,1], [153,1], [168,1], [169,1], [170,1], [171,1], [172,1], [146,1],
				[145,1], [162,1], [163,1], [164,1], [159,1], [160,1], [176,1], [177,1], [178,1],
				[179,1], [10,1], [5,1], [1,1], [2,1]
			]},
			modifiers: [], objectives: ["sweep", "margin20"], rewards: [[16,1]],
			rumor: {en: "A dwarf in Novigrad owes money to half the city, they say. The other half owes money to him. He calls it a balanced economy.", es: "Dicen que un enano de Novigrad le debe dinero a media ciudad. La otra mitad le debe dinero a él. Él lo llama una economía equilibrada."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Every tale needs a dwarf, and ours had the best: Zoltan Chivay, who played gwent the way he fought, all axe and no apology.", es: "Toda historia necesita un enano, y la nuestra tenía al mejor: Zoltan Chivay, que jugaba al gwent como peleaba, todo hacha y ninguna disculpa."},
					{who: "opp", en: "Geralt, you old bugger! A round for old times' sake? Loser buys the mead.", es: "¡Geralt, viejo granuja! ¿Una ronda por los viejos tiempos? El que pierda paga el hidromiel."},
					{who: "geralt", en: "Mahakam deck?", es: "¿Mazo de Mahakam?"},
					{who: "opp", en: "What else? Elves too, if they behave.", es: "¿Qué otro? Y elfos también, si se portan bien."}
				],
				win: [
					{who: "opp", en: "Ha! Fair and square. The Scoia'tael cards are yours, and mine too. Now, about that mead...", es: "¡Ja! Limpio y justo. Las cartas de los Scoia'tael son tuyas, y la mía también. Ahora, sobre ese hidromiel..."},
					{who: "narrator", en: "Word spread fast: the Passiflora was hosting a tournament and had saved a seat for a witcher. Geralt had a different seat in mind, on the next ship to Skellige.", es: "La noticia corrió rápido: el Passiflora organizaba un torneo y había guardado un asiento para un brujo. Geralt tenía otro asiento en mente, en el próximo barco a Skellige."},
					{who: "chronicle", source: {en: "Novigrad city tax register", es: "Registro de impuestos de la ciudad de Novigrad"}, en: "Received from Z. Chivay, dwarf: nothing. Owed by Z. Chivay: see attached pages 1 to 40.", es: "Recibido de Z. Chivay, enano: nada. Adeudado por Z. Chivay: véanse las páginas adjuntas 1 a 40."}
				],
				loss: [{who: "opp", en: "Mead's on you, witcher!", es: "¡El hidromiel lo pagas tú, brujo!"}]
			}
		},

		// ---------- Chapter IV: Skellige ----------
		cerys: {
			chapter: "skellige", name: "Cerys an Craite", portrait: "skellige_cerys", pin: {x: 12, y: 71}, level: "normal",
			deck: {faction: "skellige", leader: 211, cards: [
				[184,1], [187,1], [188,1], [189,1], [192,2], [190,1], [191,1], [205,1], [200,3], [185,1],
				[182,1], [193,1], [208,1], [181,1], [1,1]
			]},
			modifiers: [{id: "weather", card: 204, rounds: [1]}], objectives: ["noLeader", "hand3"], rewards: [[184,1]],
			rumor: {en: "Crach an Craite's daughter once lifted a curse with patience and a sack of flour, they say. Her brothers would have used axes and made it worse.", es: "Dicen que la hija de Crach an Craite rompió una vez una maldición con paciencia y un saco de harina. Sus hermanos habrían usado hachas y lo habrían empeorado."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Cerys an Craite was the youngest of Crach's children and, by general agreement, the only one who thought before she swung.", es: "Cerys an Craite era la menor de los hijos de Crach y, según todos, la única que pensaba antes de golpear."},
					{who: "opp", en: "Witcher. My father's council squabbles and my brother drinks. Let's see if you think faster than they do.", es: "Brujo. El consejo de mi padre discute y mi hermano bebe. Veamos si piensas más rápido que ellos."},
					{who: "geralt", en: "Low bar.", es: "No es mucho pedir."},
					{who: "opp", en: "Then clear it. And mind the squall. It hits in the first round, every time.", es: "Entonces supéralo. Y cuidado con la borrasca. Llega en la primera ronda, siempre."}
				],
				win: [{who: "opp", en: "Clever. The card's yours. The shield maidens follow whoever earns it.", es: "Astuto. La carta es tuya. Las doncellas escuderas siguen a quien se lo gana."}],
				loss: [{who: "opp", en: "Brawn without wits. You'd fit right in on Ard Skellig.", es: "Fuerza sin ingenio. Encajarías de maravilla en Ard Skellig."}]
			}
		},
		icegiant: {
			chapter: "skellige", name: "Ice Giant of Undvik", portrait: "monsters_frost_giant", pin: {x: 9, y: 78}, level: "hard", retold: true,
			deck: {faction: "monsters", leader: 96, cards: [
				[123,1], [121,1], [114,1], [115,1], [111,1], [130,1], [109,1], [112,1], [104,1], [110,1],
				[116,1], [137,1], [127,1], [128,1], [129,1], [117,1], [118,1], [119,1], [5,1]
			]},
			modifiers: [{id: "weather", card: 2, rounds: [1, 2, 3], name: "Eternal Winter"}], objectives: ["noWeather", "sweep"], rewards: [[197,1]],
			rumor: {en: "Hjalmar an Craite has sworn to kill the giant of Undvik. He has also sworn to stop drinking, three times this month.", es: "Hjalmar an Craite juró matar al gigante de Undvik. También juró dejar de beber, tres veces este mes."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Undvik was a frozen ruin, and in its heart slept a giant. Hjalmar an Craite had sworn to slay it. Geralt had sworn to keep Hjalmar alive, which was harder.", es: "Undvik era una ruina helada, y en su corazón dormía un gigante. Hjalmar an Craite había jurado matarlo. Geralt había jurado mantener vivo a Hjalmar, lo cual era más difícil."},
					{who: "narrator", en: "I tell it as cards again, since the truth is mostly frostbite and screaming. The winter on Undvik never broke, not for a single round.", es: "Lo cuento otra vez como cartas, porque la verdad es sobre todo congelación y gritos. El invierno de Undvik no cesó nunca, ni una sola ronda."},
					{who: "geralt", en: "Frost everywhere. Better not crowd the front line.", es: "Escarcha por todas partes. Mejor no saturar la primera línea."}
				],
				win: [
					{who: "narrator", en: "The giant fell, Hjalmar claimed the glory, and the skalds sang of it for a week. They left Geralt out of the song entirely. I have since corrected that.", es: "El gigante cayó, Hjalmar se llevó la gloria y los escaldos lo cantaron durante una semana. A Geralt lo dejaron fuera de la canción por completo. Yo ya lo he corregido."},
					{who: "narrator", en: "Hjalmar pressed his own card on Geralt, \"so you'll know who to call\". Half the crew who sailed to Undvik did not sail home.", es: "Hjalmar le dio a Geralt su propia carta, «para que sepas a quién llamar». La mitad de la tripulación que zarpó a Undvik no volvió a casa."}
				],
				loss: [{who: "geralt", en: "Too cold to think.", es: "Hace demasiado frío para pensar."}]
			}
		},
		lugos: {
			chapter: "skellige", name: "Madman Lugos", portrait: "skellige_madmad_lugos", pin: {x: 3.5, y: 54}, level: "normal",
			deck: {faction: "skellige", leader: 211, cards: [
				[201,1], [183,1], [181,1], [210,3], [202,2], [192,3], [205,1], [208,1], [191,1], [190,1],
				[185,1], [200,3]
			]},
			modifiers: [], objectives: ["second", "hand3"], rewards: [[201,1], [183,1]],
			rumor: {en: "\"My father isn't mad. He's just Skelliger, only louder.\" (Blueboy Lugos, crying into his mead)", es: "«Mi padre no está loco. Solo es skelligense, pero más ruidoso». (Blueboy Lugos, llorando sobre su hidromiel)"},
			dialogue: {
				intro: [
					{who: "narrator", en: "On Skellige, being called Madman is a compliment. Lugos had earned it twice over and was working on a third.", es: "En Skellige, que te llamen Loco es un cumplido. Lugos se lo había ganado dos veces y trabajaba en la tercera."},
					{who: "opp", en: "A witcher on Spikeroog! Play me, wolf, and if I lose you get my card AND my idiot son's!", es: "¡Un brujo en Spikeroog! Juega conmigo, lobo, y si pierdo te llevas mi carta, ¡y la de mi idiota de hijo!"},
					{who: "geralt", en: "Generous.", es: "Generoso."},
					{who: "opp", en: "Berserkers are generous. Right up until the mushrooms kick in.", es: "Los berserkers son generosos. Justo hasta que les hacen efecto los hongos."}
				],
				win: [{who: "opp", en: "Bah! Take us both. Blueboy, stop crying!", es: "¡Bah! Llévanos a los dos. ¡Blueboy, deja de llorar!"}],
				loss: [{who: "opp", en: "HA! Spikeroog wins again!", es: "¡JA! ¡Spikeroog gana otra vez!"}]
			}
		},
		ermion: {
			chapter: "skellige", name: "Ermion", portrait: "skellige_ermion", pin: {x: 39, y: 62}, level: "normal",
			deck: {faction: "skellige", leader: 211, cards: [
				[195,1], [190,1], [191,1], [205,1], [208,1], [193,1], [192,1], [187,1], [209,1], [185,2],
				[182,1], [198,1], [1,1]
			]},
			modifiers: [], objectives: ["margin20", "noLeader"], rewards: [[195,1]],
			rumor: {en: "The druid of Hindarsfjall prophesies for anyone who asks. His prophecies are vague. His fees are not.", es: "El druida de Hindarsfjall profetiza para quien se lo pida. Sus profecías son vagas. Sus tarifas, no."},
			dialogue: {
				intro: [
					{who: "narrator", en: "On Hindarsfjall, Ermion the druid tended his sacred grove and his sacred mushrooms. Mostly the mushrooms.", es: "En Hindarsfjall, el druida Ermion cuidaba su bosque sagrado y sus hongos sagrados. Sobre todo los hongos."},
					{who: "opp", en: "The gods favor the patient, witcher. Let us see if they favor you.", es: "Los dioses favorecen al paciente, brujo. Veamos si te favorecen a ti."},
					{who: "geralt", en: "I'll take my chances.", es: "Me arriesgaré."}
				],
				win: [{who: "opp", en: "Freya smiles on you. Carry my card, and use the mardroeme wisely.", es: "Freya te sonríe. Lleva mi carta, y usa el mardroeme con prudencia."}],
				loss: [{who: "opp", en: "Patience, Geralt. The gods are in no hurry.", es: "Paciencia, Geralt. Los dioses no tienen prisa."}]
			}
		},
		avallach: {
			chapter: "skellige", name: "Avallac'h", portrait: "neutral_mysterious_elf", pin: {x: 34, y: 82}, level: "normal",
			deck: {faction: "scoiatael", leader: 142, cards: [
				[0,1], [154,1], [165,1], [158,1], [148,1], [149,1], [150,1], [147,1], [144,1], [174,1],
				[176,1], [177,1], [178,1], [179,1], [180,1], [155,1], [156,1], [157,1], [159,1], [5,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1, 2, 3], name: "Mist"}], objectives: ["sweep", "noWeather"], rewards: [[0,1]],
			rumor: {en: "An elf knows where the Lady of Time and Space is hiding, they say. Asking him costs nothing. Understanding the answer takes years.", es: "Dicen que un elfo sabe dónde se esconde la Dama del Tiempo y del Espacio. Preguntarle no cuesta nada. Entender la respuesta lleva años."},
			dialogue: {
				intro: [
					{who: "narrator", en: "On the Isle of Mists, where Ciri had last been seen, the fog never lifts. Waiting in it was an elf who never gave a straight answer.", es: "En la Isla de las Nieblas, donde vieron a Ciri por última vez, la niebla nunca se disipa. En ella esperaba un elfo que jamás daba una respuesta directa."},
					{who: "opp", en: "Gwynbleidd. You came for Zireael. First, a game. Elves are patient, and the mist is ours.", es: "Gwynbleidd. Viniste por Zireael. Primero, una partida. Los elfos somos pacientes, y la niebla es nuestra."},
					{who: "geralt", en: "You talk in riddles.", es: "Hablas con acertijos."},
					{who: "opp", en: "And you play like a human. We shall see which serves better.", es: "Y tú juegas como un humano. Veremos qué sirve mejor."}
				],
				win: [
					{who: "opp", en: "Hm. My card is yours. We will meet again, at Kaer Morhen.", es: "Hm. Mi carta es tuya. Volveremos a vernos, en Kaer Morhen."},
					{who: "narrator", en: "And there, in the mist, he finally gave Geralt a straight answer: Ciri was alive, and close. It is the only straight answer I ever heard of him giving.", es: "Y allí, en la niebla, por fin le dio a Geralt una respuesta directa: Ciri estaba viva, y cerca. Es la única respuesta directa que he sabido que diera."}
				],
				loss: [{who: "opp", en: "Va faill, Gwynbleidd. Come back when you can see through the mist.", es: "Va faill, Gwynbleidd. Vuelve cuando puedas ver a través de la niebla."}]
			}
		},
		crach: {
			chapter: "skellige", name: "Crach an Craite", portrait: "skellige_crach_an_craite", pin: {x: 17, y: 51}, place: "kaertrolde", level: "hard", boss: true, unlocks: "skellige", music: "commanding-the-fury",
			deck: {faction: "skellige", leader: 211, cards: [
				[192,3], [187,1], [188,1], [189,1], [185,2], [186,1], [190,1], [191,1], [193,1], [205,1],
				[208,1], [181,1], [210,3], [202,1], [209,2], [182,1], [198,1], [5,1], [10,1]
			]},
			modifiers: [{id: "weather", card: 204, rounds: [1, 3]}], objectives: ["sweep", "margin20"], rewards: [[212,1]],
			rumor: {en: "The jarl of Kaer Trolde has buried a king, raised two children and outlived most of his enemies. He still laughs louder than anyone at the feast.", es: "El jarl de Kaer Trolde ha enterrado a un rey, criado a dos hijos y sobrevivido a casi todos sus enemigos. Aun así ríe más fuerte que nadie en los banquetes."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Crach an Craite, jarl of Kaer Trolde, had known Geralt for years and owed him a favor. On Skellige, that means you get to lose to him first.", es: "Crach an Craite, jarl de Kaer Trolde, conocía a Geralt desde hacía años y le debía un favor. En Skellige, eso significa que tienes derecho a perder contra él primero."},
					{who: "opp", en: "Geralt! Ciri's trail runs through my islands. First, show me you still have a warrior's nerve.", es: "¡Geralt! El rastro de Ciri pasa por mis islas. Primero, demuéstrame que aún tienes temple de guerrero."},
					{who: "geralt", en: "Storm's coming.", es: "Se acerca una tormenta."},
					{who: "opp", en: "There's always a storm in Skellige. First round and last. Deal.", es: "En Skellige siempre hay tormenta. En la primera ronda y en la última. Reparte."}
				],
				win: [
					{who: "opp", en: "Ha! Well fought, wolf. The clans' cards are yours, and King Bran's too. He'd have liked you.", es: "¡Ja! Bien peleado, lobo. Las cartas de los clanes son tuyas, y la del rey Bran también. Le habrías caído bien."},
					{who: "narrator", en: "The jarls toasted him all night, and by morning they were planning a tournament in his honor. By noon they were fighting over who would host it.", es: "Los jarls brindaron por él toda la noche, y al amanecer ya planeaban un torneo en su honor. Al mediodía se peleaban por quién lo organizaría."},
					{who: "chronicle", source: {en: "Roderick de Novembre, The History of the World", es: "Roderick de Novembre, Historia del mundo"}, en: "King Bran of Skellige died peacefully in his sleep, mourned by all. The succession that followed was, by island standards, orderly.", es: "El rey Bran de Skellige murió plácidamente mientras dormía, llorado por todos. La sucesión que siguió fue, para los estándares de las islas, ordenada."}
				],
				loss: [{who: "opp", en: "Back to your boat, landlubber!", es: "¡De vuelta a tu barca, marinero de agua dulce!"}]
			}
		},

		// ---------- Chapter V: Kaer Morhen ----------
		lambert: {
			chapter: "kaermorhen", name: "Lambert", portrait: "icons/notif_me_turn.png", pin: {x: 83, y: 15}, place: "kaermorhen", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[34,1], [28,3], [30,2], [29,2], [52,1], [46,1], [48,1], [31,1], [54,1], [55,1],
				[45,1], [27,1], [32,1], [5,1], [1,1]
			]},
			modifiers: [], objectives: ["sweep", "hand3"], rewards: [[5,1]],
			rumor: {en: "Sign on a Kaer Morhen door, in Lambert's hand: KNOCK AND DIE. Underneath, in Eskel's: he means it about half the time.", es: "Letrero en una puerta de Kaer Morhen, con la letra de Lambert: TOCA Y MUERE. Debajo, con la de Eskel: lo dice en serio la mitad de las veces."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Lambert had come home for the fight and spent the first night complaining about it. That was how you knew he'd stay.", es: "Lambert había vuelto a casa para la pelea y pasó la primera noche quejándose de ello. Así se sabía que se quedaría."},
					{who: "opp", en: "Look who finally came home. Fancy losing to me in front of Vesemir?", es: "Mira quién volvió por fin a casa. ¿Se te antoja perder contra mí delante de Vesemir?"},
					{who: "geralt", en: "Try not to sulk this time.", es: "Intenta no hacer berrinche esta vez."}
				],
				win: [{who: "opp", en: "Tch. Take the horn and get out of my sight. And don't tell Eskel.", es: "Bah. Llévate el cuerno y desaparece de mi vista. Y no se lo cuentes a Eskel."}],
				loss: [{who: "opp", en: "Ha! Somebody write that down!", es: "¡Ja! ¡Que alguien lo apunte!"}]
			}
		},
		eskel: {
			chapter: "kaermorhen", name: "Eskel", portrait: "icons/notif_me_turn.png", pin: {x: 83, y: 15}, place: "kaermorhen", level: "hard",
			deck: {faction: "realms", leader: 23, cards: [
				[33,1], [51,1], [28,3], [30,3], [29,2], [52,1], [31,1], [48,1],
				[54,1], [55,1], [45,1], [27,1], [32,1], [1,2], [4,1]
			]},
			modifiers: [], objectives: ["noLeader", "second"], rewards: [[1,1]],
			rumor: {en: "The witcher Eskel keeps a goat at Kaer Morhen. He says it's for the milk. Everyone knows it's for the company.", es: "El brujo Eskel tiene una cabra en Kaer Morhen. Dice que es por la leche. Todos saben que es por la compañía."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Eskel spent the days before the battle sharpening every blade in the keep, twice. Witchers don't pray. That is the closest they come.", es: "Eskel pasó los días previos a la batalla afilando cada hoja de la fortaleza, dos veces. Los brujos no rezan. Es lo más parecido que hacen."},
					{who: "opp", en: "Geralt. The Hunt is coming and we're playing cards. Feels like old times.", es: "Geralt. La Cacería viene y nosotros jugando a las cartas. Como en los viejos tiempos."},
					{who: "geralt", en: "Old times were worse.", es: "Los viejos tiempos eran peores."},
					{who: "opp", en: "True. Deal.", es: "Cierto. Reparte."}
				],
				win: [{who: "opp", en: "Good game. Here, a decoy. Saves lives, even in gwent.", es: "Buena partida. Toma, un señuelo. Salva vidas, incluso en el gwent."}],
				loss: [{who: "opp", en: "Don't tell Lambert I won. He'll want a rematch.", es: "No le digas a Lambert que gané. Querrá la revancha."}]
			}
		},
		yennefer: {
			chapter: "kaermorhen", name: "Yennefer of Vengerberg", portrait: "neutral_yennefer", pin: {x: 83, y: 15}, place: "kaermorhen", level: "normal",
			deck: {faction: "realms", leader: 22, cards: [
				[15,1], [39,1], [38,1], [48,1], [31,1], [30,3], [28,2], [54,1], [55,1], [45,1], [27,1], [32,1],
				[46,1], [52,1], [1,1]
			]},
			modifiers: [], objectives: ["margin20", "noWeather"], rewards: [[15,1]],
			rumor: {en: "A sorceress in black and white has been asking about the Wild Hunt all over the North. Those who lie to her regret it at length.", es: "Una hechicera de blanco y negro ha estado preguntando por la Cacería Salvaje por todo el norte. Quienes le mienten se arrepienten largamente."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Yennefer of Vengerberg did nothing halfway, and that included gwent. She brought the Lodge's favorite cards and no mercy whatsoever.", es: "Yennefer de Vengerberg no hacía nada a medias, y eso incluía el gwent. Trajo las cartas favoritas de la Logia y ni una pizca de piedad."},
					{who: "opp", en: "If you're going to stand between Ciri and the Hunt, Geralt, I want to see you think.", es: "Si vas a interponerte entre Ciri y la Cacería, Geralt, quiero verte pensar."},
					{who: "geralt", en: "And if I lose?", es: "¿Y si pierdo?"},
					{who: "opp", en: "Then you'll have learned something.", es: "Entonces habrás aprendido algo."}
				],
				win: [{who: "opp", en: "Not bad. Keep my card. And keep it close.", es: "Nada mal. Quédate con mi carta. Y tenla cerca."}],
				loss: [{who: "opp", en: "Disappointing. You used to read me better than that.", es: "Decepcionante. Antes me leías mejor."}]
			}
		},
		letho: {
			chapter: "kaermorhen", name: "Letho of Gulet", portrait: "nilfgaard_letho", pin: {x: 83, y: 15}, place: "kaermorhen", level: "hard",
			deck: {faction: "nilfgaard", leader: 57, cards: [
				[72,1], [73,1], [65,1], [69,1], [62,1], [63,1], [64,1], [71,4], [82,1], [92,1], [70,1],
				[90,1], [91,1], [79,1], [10,1], [1,1]
			]},
			modifiers: [], objectives: ["sweep", "noLeader"], rewards: [[72,1]],
			rumor: {en: "A bald witcher with a viper medallion killed two kings, they say. Others say three. He says he's retired.", es: "Dicen que un brujo calvo con medallón de víbora mató a dos reyes. Otros dicen que a tres. Él dice que está retirado."},
			dialogue: {
				intro: [
					{who: "opp", en: "Geralt. The Kingslayer, at your service. Heard you need allies for a war.", es: "Geralt. El Matarreyes, a tu servicio. Me dijeron que necesitas aliados para una guerra."},
					{who: "geralt", en: "One game. Then we talk.", es: "Una partida. Luego hablamos."},
					{who: "narrator", en: "Letho had killed kings for money, and for Nilfgaard. Geralt let him in anyway. When the Hunt is coming you don't count your friends; you count swords.", es: "Letho había matado reyes por dinero, y por Nilfgaard. Geralt lo dejó entrar de todos modos. Cuando viene la Cacería no cuentas amigos; cuentas espadas."}
				],
				win: [
					{who: "opp", en: "Fair. Card's yours. When the Hunt comes, I'll be on the walls.", es: "Justo. La carta es tuya. Cuando llegue la Cacería, estaré en las murallas."},
					{who: "narrator", en: "Geralt could have settled an old debt with Letho that day. He chose an extra sword over justice. I've never decided whether that was wise, and neither has he.", es: "Geralt podría haber saldado ese día una vieja deuda con Letho. Eligió una espada más en lugar de justicia. Nunca he decidido si fue sabio, y él tampoco."}
				],
				loss: [{who: "opp", en: "The School of the Viper doesn't lose, Wolf.", es: "La Escuela de la Víbora no pierde, Lobo."}]
			}
		},
		// Side battles in the valley around the keep (side: wins don't count toward the boss)
		troll: {
			chapter: "kaermorhen", name: "Rock Troll", portrait: "avatars/28.jpg", pin: {x: 76.5, y: 12}, level: "normal", side: true,
			deck: {faction: "realms", leader: 22, cards: [
				[29,2], [54,1], [55,1], [27,1], [215,1], [45,1], [32,1],
				[28,2], [30,2], [46,1], [52,1], [48,1], [44,1], [2,1]
			]},
			modifiers: [], objectives: ["hand3", "noWeather"], rewards: [[29,2]],
			rumor: {en: "A shepherd says the troll by the lake takes his toll in cards. Travelers without cards pay in sheep. Those without sheep don't come back to complain.", es: "Un pastor dice que el trol del lago cobra su peaje en cartas. Los viajeros sin cartas pagan con ovejas. Los que no tienen ovejas no vuelven para quejarse."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Below Kaer Morhen, by the lake, lived a rock troll. Trolls, unlike most things with that many teeth, can be bargained with, bribed, or beaten at cards. This one preferred cards.", es: "Bajo Kaer Morhen, junto al lago, vivía un trol de roca. Los troles, a diferencia de casi todo lo que tiene tantos dientes, aceptan tratos, sobornos o una derrota a las cartas. Este prefería las cartas."},
					{who: "opp", en: "Witcher! Troll find many cards. Soldiers come up mountain, soldiers not go down. Cards stay. You play troll?", es: "¡Brujo! Trol encontrar muchas cartas. Soldados subir montaña, soldados no bajar. Cartas quedar. ¿Tú jugar con trol?"},
					{who: "geralt", en: "What happened to the soldiers?", es: "¿Qué les pasó a los soldados?"},
					{who: "opp", en: "Troll not say. Troll like Catapult. Rocks fly far, go boom. Like troll.", es: "Trol no decir. A trol gustar Catapult. Piedras volar lejos, hacer bum. Como trol."}
				],
				win: [
					{who: "opp", en: "Hrrm. Witcher win. Take Catapult. Two Catapult. Troll keep rocks. Rocks better anyway.", es: "Jrrm. Brujo ganar. Llevar Catapult. Dos Catapult. Trol quedar piedras. Piedras mejores de todos modos."},
					{who: "narrator", en: "Geralt never learned what became of the soldiers. The troll's cave smelled of vodka and old boots, he told me, and he decided not to ask twice.", es: "Geralt nunca supo qué fue de los soldados. La cueva del trol olía a vodka y a botas viejas, me contó, y decidió no preguntar dos veces."}
				],
				loss: [{who: "opp", en: "Troll win! Witcher sad? Troll give rock. Rock good for sad.", es: "¡Trol ganar! ¿Brujo triste? Trol dar piedra. Piedra buena para triste."}]
			}
		},
		harpies: {
			chapter: "kaermorhen", name: "Harpy Nest", portrait: "monsters_celaeno_harpy", pin: {x: 92.5, y: 11.5}, level: "hard", retold: true, side: true,
			deck: {faction: "monsters", leader: 96, cards: [
				[125,1], [122,1], [121,1], [114,1], [115,1], [111,1], [130,1], [98,1], [99,1], [100,1], [101,1],
				[131,1], [132,1], [133,1], [134,1], [135,1], [109,1], [112,1], [5,1]
			]},
			modifiers: [{id: "ambush", name: "From Above"}], objectives: ["margin20", "hand3"], rewards: [[33,1]],
			rumor: {en: "Harpies steal anything that glitters, the valley folk say. A tinker lost a spoon, a ring and his best teeth to them. The gold ones.", es: "La gente del valle dice que las arpías roban todo lo que brilla. Un calderero perdió con ellas una cuchara, un anillo y sus mejores dientes. Los de oro."},
			dialogue: {
				intro: [
					{who: "narrator", en: "On the eastern cliffs, harpies had nested above the only road from the valley, and they screamed at every supply cart bound for the keep.", es: "En los acantilados del este, las arpías habían anidado sobre el único camino desde el valle, y chillaban a cada carro de provisiones que subía a la fortaleza."},
					{who: "narrator", en: "Again I tell it as cards; the truth is mostly feathers, mud and a witcher swearing. Harpies always strike first. It is the whole of their strategy, and it usually works.", es: "Otra vez lo cuento como cartas; la verdad es sobre todo plumas, barro y un brujo maldiciendo. Las arpías siempre atacan primero. Es toda su estrategia, y casi siempre les funciona."},
					{who: "geralt", en: "Wait for the dive.", es: "Espera a que se lancen."}
				],
				win: [
					{who: "narrator", en: "In the nest, among buttons, spoons and a bishop's ring, Geralt found a card of Esterad Thyssen, King of Kovir, gilt edges and all. Harpies have taste, if nothing else.", es: "En el nido, entre botones, cucharas y el anillo de un obispo, Geralt encontró una carta de Esterad Thyssen, rey de Kovir, con bordes dorados y todo. Las arpías tienen buen gusto, si nada más."},
					{who: "narrator", en: "The carts came up the next day. Nobody thanked him, which, he told me, is how he knows a job was done right.", es: "Los carros subieron al día siguiente. Nadie le dio las gracias, lo cual, me dijo, es como sabe que un trabajo se hizo bien."}
				],
				loss: [{who: "geralt", en: "Too many. Need to thin the flock.", es: "Demasiadas. Hay que diezmar la bandada."}]
			}
		},
		draug: {
			chapter: "kaermorhen", name: "Draug of the Morhen Eye", portrait: "monsters_draug", pin: {x: 74, y: 16.5}, level: "normal", retold: true, side: true,
			deck: {faction: "monsters", leader: 96, cards: [
				[108,1], [125,1], [130,1], [115,1], [111,1], [109,1], [112,1], [114,1], [121,1], [123,1], [136,1],
				[98,1], [99,1], [100,1], [101,1], [5,1]
			]},
			modifiers: [{id: "weather", card: 9, rounds: [1, 2, 3], name: "Grave Mist"}], objectives: ["sweep", "noLeader"], rewards: [[108,1]],
			rumor: {en: "A dead commander still holds the ruined fort on the Morhen Eye, the shepherds say. He lost that siege two hundred years ago. Nobody has had the heart to tell him.", es: "Los pastores dicen que un comandante muerto todavía defiende el fuerte en ruinas del Ojo de Morhen. Perdió ese asedio hace doscientos años. Nadie ha tenido el valor de decírselo."},
			dialogue: {
				intro: [
					{who: "narrator", en: "West of the keep, in the ruined fort they call the Morhen Eye, a draug kept watch: a commander so stubborn that death had not relieved him of his post.", es: "Al oeste de la fortaleza, en el fuerte en ruinas que llaman el Ojo de Morhen, montaba guardia un draug: un comandante tan terco que ni la muerte lo había relevado de su puesto."},
					{who: "narrator", en: "His dead garrison marched in a grave mist that never lifted, not for a single round. Cards again; the truth was colder, and it smelled of old iron.", es: "Su guarnición muerta marchaba en una niebla sepulcral que no se levantó nunca, ni una sola ronda. Otra vez cartas; la verdad fue más fría, y olía a hierro viejo."},
					{who: "opp", en: "Hold... the... wall.", es: "Mantengan... la... muralla."},
					{who: "geralt", en: "Your war's over. Has been for a while.", es: "Tu guerra terminó. Hace tiempo."}
				],
				win: [
					{who: "narrator", en: "When the draug fell, the mist went with him, and the fort was only stones again. Under a shield nobody had lifted in two centuries lay a card: Draug, the old commander himself.", es: "Cuando el draug cayó, la niebla se fue con él, y el fuerte volvió a ser solo piedras. Bajo un escudo que nadie había levantado en dos siglos había una carta: Draug, el viejo comandante en persona."},
					{who: "narrator", en: "Geralt said the old soldier had only done what Vesemir would do: hold a wall for people who would never thank him. He didn't say more, and I didn't ask.", es: "Geralt dijo que el viejo soldado solo había hecho lo que haría Vesemir: defender una muralla por gente que nunca se lo agradecería. No dijo más, y yo no pregunté."}
				],
				loss: [{who: "geralt", en: "Can't see a thing in this mist.", es: "No se ve nada con esta niebla."}]
			}
		},
		battle: {
			chapter: "kaermorhen", name: "Battle of Kaer Morhen", portrait: "monsters_eredin_silver", pin: {x: 83, y: 15}, place: "kaermorhen", level: "hard", boss: true, retold: true, music: "forged-in-fire",
			deck: {faction: "monsters", leader: 93, cards: [
				[124,1], [126,1], [108,1], [102,1], [111,1], [130,1], [121,1], [114,1], [115,1], [109,1], [112,1], [123,1], [120,1],
				[98,1], [99,1], [100,1], [101,1], [131,1], [132,1], [133,1], [134,1], [135,1], [5,1], [10,1]
			]},
			modifiers: [{id: "weather", card: 2, rounds: [1, 2, 3], name: "Breath of the Hunt"}, {id: "frostborn"}, {id: "extraDraw", name: "Defenders"}],
			objectives: ["noLeader", "hand3"], rewards: [[3,1], [93,1]],
			rumor: {en: "The valley folk say every witcher left in the world has gathered at Kaer Morhen. That's five, by most counts. Six if you count the goat.", es: "La gente del valle dice que todos los brujos que quedan en el mundo se han reunido en Kaer Morhen. Son cinco, según casi todos. Seis si cuentas la cabra."},
			dialogue: {
				intro: [
					{who: "narrator", en: "And then the Hunt came to Kaer Morhen. The frost arrived first, as it always did, and then the riders.", es: "Y entonces la Cacería llegó a Kaer Morhen. Primero llegó la escarcha, como siempre, y luego los jinetes."},
					{who: "opp", en: "Surrender Zireael, and we will spare your little fortress.", es: "Entreguen a Zireael y perdonaremos su pequeña fortaleza."},
					{who: "geralt", en: "Everyone to the walls!", es: "¡Todos a las murallas!"},
					{who: "narrator", en: "Every friend Geralt had ever made stood beside him. In gwent terms, an extra card. In any other terms, more than he had ever asked for.", es: "Cada amigo que Geralt había hecho en su vida estaba a su lado. En términos de gwent, una carta extra. En cualquier otro término, más de lo que jamás había pedido."}
				],
				win: [
					{who: "narrator", en: "The vanguard broke. Ciri stood among the defenders, sword in hand, and for one moment everything was as it should be.", es: "La vanguardia se quebró. Ciri estaba entre los defensores, espada en mano, y por un momento todo fue como debía ser."},
					{who: "narrator", en: "Then Vesemir fell in the courtyard, and Ciri's grief shattered the frost. The Hunt withdrew. Nobody cheered.", es: "Entonces Vesemir cayó en el patio, y el dolor de Ciri hizo añicos la escarcha. La Cacería se retiró. Nadie lo celebró."},
					{who: "ciri", en: "He held the gate for me, Geralt. Like he held everything.", es: "Sostuvo la puerta por mí, Geralt. Como lo sostenía todo."},
					{who: "narrator", en: "Two cards were found in the snow afterwards: Ciri's, and a Red Rider commander's. I've never asked Geralt why he kept both.", es: "Después encontraron dos cartas en la nieve: la de Ciri y la de un comandante de los Jinetes Rojos. Nunca le he preguntado a Geralt por qué conservó ambas."}
				],
				loss: [{who: "geralt", en: "Hold the gate! Hold it!", es: "¡Mantengan la puerta! ¡Aguanten!"}]
			}
		},

		// ---------- Chapter VI: The Wild Hunt ----------
		imlerith: {
			chapter: "hunt", name: "Imlerith", portrait: "monsters_imlerith", pin: {x: 65, y: 66}, level: "hard", retold: true, music: "eredin",
			deck: {faction: "monsters", leader: 96, cards: [
				[124,1], [108,1], [105,1], [106,1], [107,1], [111,1], [130,1], [121,1], [114,1], [115,1],
				[131,1], [132,1], [133,1], [134,1], [135,1], [120,1], [109,1], [112,1], [5,1], [10,1]
			]},
			modifiers: [{id: "ambush", name: "Sabbath"}, {id: "weather", card: 2, rounds: [1]}, {id: "frostborn"}], objectives: ["margin20", "noWeather"], rewards: [[124,1]],
			rumor: {en: "The Hunt's general sleeps in his armor, they say. The witches of Bald Mountain say he doesn't sleep at all.", es: "Dicen que el general de la Cacería duerme con la armadura puesta. Las brujas de la Montaña Calva dicen que no duerme en absoluto."},
			dialogue: {
				intro: [
					{who: "narrator", en: "On Bald Mountain the witches held their sabbath, and Imlerith waited at the top. The revelers struck first, and the frost came with them.", es: "En la Montaña Calva las brujas celebraban su aquelarre, e Imlerith esperaba en la cima. Los juerguistas atacaron primero, y la escarcha llegó con ellos."},
					{who: "opp", en: "The White Wolf. I will enjoy breaking you.", es: "El Lobo Blanco. Disfrutaré rompiéndote."},
					{who: "geralt", en: "Get in line.", es: "Ponte a la cola."}
				],
				win: [
					{who: "narrator", en: "Imlerith fell on his own altar. I'll spare you how. Geralt washed his hands in the snow for a long time afterwards.", es: "Imlerith cayó sobre su propio altar. Te ahorraré los detalles. Geralt se lavó las manos en la nieve durante un buen rato."},
					{who: "narrator", en: "He kept the general's card. Trophies, he told me, are for remembering what things cost.", es: "Se quedó con la carta del general. Los trofeos, me dijo, sirven para recordar lo que cuestan las cosas."}
				],
				loss: [{who: "opp", en: "Kneel, wolf.", es: "Arrodíllate, lobo."}]
			}
		},
		caranthir: {
			chapter: "hunt", name: "Caranthir", portrait: "monsters_eredin_bronze", pin: {x: 22, y: 30}, place: "naglfar", level: "hard", requires: "imlerith", retold: true, music: "eredin",
			deck: {faction: "monsters", leader: 94, cards: [
				[126,1], [108,1], [125,1], [123,1], [109,1], [112,1], [120,1], [138,1],
				[111,1], [130,1], [121,1], [114,1], [115,1],
				[98,1], [99,1], [100,1], [101,1], [105,1], [106,1], [107,1], [5,1], [1,1]
			]},
			modifiers: [{id: "weather", card: 2, rounds: [1, 2, 3], name: "Navigator's Blizzard"}, {id: "frostborn"}], objectives: ["sweep", "hand3"], rewards: [[94,1]],
			rumor: {en: "Sailors say the Hunt's navigator can open a door anywhere, even under the sea. They don't say where the doors lead.", es: "Los marineros dicen que el navegante de la Cacería puede abrir una puerta en cualquier parte, incluso bajo el mar. No dicen adónde llevan esas puertas."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Naglfar, the Hunt's ship of nails, lay moored in the frozen sea. Its navigator, Caranthir, greeted Geralt with a blizzard that never let up.", es: "Naglfar, el barco de uñas de la Cacería, estaba amarrado en el mar helado. Su navegante, Caranthir, recibió a Geralt con una ventisca que nunca amainó."},
					{who: "opp", en: "You are far from home, witcher. Here, the cold answers to me.", es: "Estás lejos de casa, brujo. Aquí, el frío me obedece a mí."},
					{who: "geralt", en: "Cold doesn't bother me.", es: "El frío no me molesta."}
				],
				win: [
					{who: "opp", en: "The king... will finish what I... could not.", es: "El rey... terminará lo que yo... no pude."},
					{who: "narrator", en: "Among his things was a card of the king himself. Caranthir had carried it the way soldiers carry their gods.", es: "Entre sus cosas había una carta del propio rey. Caranthir la llevaba como los soldados llevan a sus dioses."}
				],
				loss: [{who: "opp", en: "Freeze, and be forgotten.", es: "Congélate, y que te olviden."}]
			}
		},
		eredin: {
			chapter: "hunt", name: "Eredin Bréacc Glas", portrait: "monsters_eredin_gold", pin: {x: 22, y: 30}, place: "naglfar", level: "expert", boss: true, requires: "caranthir", credits: true, retold: true, music: "eredin",
			deck: {faction: "monsters", leader: 95, cards: [
				[108,1], [126,1], [125,1], [111,1], [130,1], [121,1], [114,1], [115,1], [123,1], [109,1],
				[112,1], [131,1], [132,1], [133,1], [134,1], [135,1], [98,1], [99,1], [100,1], [101,1],
				[127,1], [128,1], [129,1], [138,1], [10,2], [5,1], [1,1]
			]},
			modifiers: [{id: "weather", card: 2, rounds: [1, 2, 3], name: "Breath of the Hunt"}, {id: "frostborn"}, {id: "ambush"}, {id: "whiteFrost"}], objectives: ["noLeader", "margin20"], rewards: [[8,1], [95,1]],
			rumor: {en: "Nobody has ever seen the face of the King of the Wild Hunt, they say. Those who have aren't saying anything.", es: "Dicen que nadie ha visto jamás el rostro del Rey de la Cacería Salvaje. Los que lo han visto no dicen nada."},
			dialogue: {
				intro: [
					{who: "opp", en: "Gwynbleidd. You have come far, for a human. It ends here.", es: "Gwynbleidd. Has llegado lejos, para ser un humano. Aquí termina todo."},
					{who: "geralt", en: "For one of us.", es: "Para uno de los dos."},
					{who: "opp", en: "Then come. The frost is mine, and so is the first blow.", es: "Entonces ven. La escarcha es mía, y también el primer golpe."},
					{who: "narrator", en: "Every card he'd won, every friend he'd made, all of it came down to this last fight, which I tell as one last game. He said none of this. He never does. I'm saying it for him.", es: "Cada carta que había ganado, cada amigo que había hecho, todo se reducía a esta última pelea, que cuento como una última partida. Él no dijo nada de eso. Nunca lo dice. Lo digo yo por él."}
				],
				win: [
					{who: "opp", en: "Impossible... a mere... human...", es: "Imposible... un simple... humano..."},
					{who: "narrator", en: "And that is how the White Wolf beat the King of the Wild Hunt at his own game. The truth was colder, longer and much less tidy. It usually is.", es: "Y así fue como el Lobo Blanco venció al Rey de la Cacería Salvaje en su propio juego. La verdad fue más fría, más larga y mucho menos ordenada. Suele serlo."}
				],
				loss: [{who: "opp", en: "Kneel, Gwynbleidd. Your road ends in ice.", es: "Arrodíllate, Gwynbleidd. Tu camino termina en el hielo."}],
				credits: [
					{who: "narrator", en: "Ciri was safe. The Hunt was broken. The Continent, as always, thanked no one.", es: "Ciri estaba a salvo. La Cacería, derrotada. El Continente, como siempre, no le dio las gracias a nadie."},
					{who: "ciri", en: "Thank you, Geralt. For everything. Now go and lose at cards somewhere warm.", es: "Gracias, Geralt. Por todo. Ahora ve a perder a las cartas a algún lugar cálido."},
					{who: "narrator", en: "Geralt kept the cards, of course: every face from White Orchard to the Naglfar, and one with his own grim face on it.", es: "Geralt se quedó con las cartas, por supuesto: cada rostro desde Huerto Blanco hasta el Naglfar, y una con su propia cara de pocos amigos."},
					{who: "narrator", en: "As for me, I wrote it all down. Embellished nothing. Well, almost nothing.", es: "En cuanto a mí, lo puse todo por escrito. No adorné nada. Bueno, casi nada."},
					{who: "chronicle", source: {en: "Roderick de Novembre, The History of the World", es: "Roderick de Novembre, Historia del mundo"}, en: "The so-called Wild Hunt was dispersed that winter by a coalition of northern sorcerers. No witcher is recorded as having taken part.", es: "La llamada Cacería Salvaje fue dispersada aquel invierno por una coalición de hechiceros norteños. No consta que ningún brujo participara."},
					{who: "narrator", en: "Historians. They weren't there. I was, more or less.", es: "Historiadores. Ellos no estuvieron allí. Yo sí, más o menos."},
					{who: "narrator", en: "The tables of the Continent are still open, dear reader. Rematches, tournaments, rumors from the south... The tale goes on as long as you keep playing.", es: "Las mesas del Continente siguen abiertas, querido lector. Revanchas, torneos, rumores del sur... La historia continúa mientras sigas jugando."}
				]
			}
		},

		// ---------- Post-game: Hearts of Stone ----------
		olgierd: {
			chapter: "heartsofstone", name: "Olgierd von Everec", portrait: "neutral_olgierd", pin: {x: 68, y: 33.5}, level: "hard", music: "immortal",
			deck: {faction: "realms", leader: 22, cards: [
				[17,1], [51,1], [28,3], [30,3], [29,2], [46,1], [33,1], [34,1], [54,1], [55,1],
				[45,1], [31,1], [48,1], [27,1], [32,1], [10,1], [5,1], [1,1]
			]},
			modifiers: [], objectives: ["sweep", "noLeader"], rewards: [[17,1]],
			rumor: {en: "A Redanian drinking song: von Everec lost his head, von Everec stayed undead, von Everec bought the round instead.", es: "Una canción de taberna redania: von Everec perdió la cabeza, von Everec no murió, von Everec pagó la ronda y la fiesta siguió."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Olgierd von Everec had been cursed with immortality and had grown terribly bored of it. A game of gwent was the most fun he'd had in a century.", es: "Olgierd von Everec había sido maldecido con la inmortalidad y estaba terriblemente aburrido de ella. Una partida de gwent era lo más divertido que le había pasado en un siglo."},
					{who: "opp", en: "A witcher! Excellent. Sit, play, and if you win, I might even feel something.", es: "¡Un brujo! Excelente. Siéntate, juega y, si ganas, puede que hasta sienta algo."},
					{who: "geralt", en: "And if I lose?", es: "¿Y si pierdo?"},
					{who: "opp", en: "Then you'll be as bored as I am.", es: "Entonces estarás tan aburrido como yo."}
				],
				win: [{who: "opp", en: "Ha! Marvellous. Have my card. I find I have no use for things anymore.", es: "¡Ja! Maravilloso. Quédate con mi carta. Descubro que ya no me sirven de nada las cosas."}],
				loss: [{who: "opp", en: "Another round! Life is long. Unfortunately.", es: "¡Otra ronda! La vida es larga. Por desgracia."}]
			}
		},
		odimm: {
			chapter: "heartsofstone", name: "Gaunter O'Dimm", portrait: "neutral_gaunter_odimm", pin: {x: 62, y: 31}, level: "expert", requires: "olgierd", music: "hearts-of-stone",
			deck: {faction: "realms", leader: 22, cards: [
				[18,1], [19,3], [28,3], [30,3], [29,2], [33,1], [34,1], [39,1], [51,1],
				[54,1], [55,1], [45,1], [10,1], [5,1], [1,1], [4,1]
			]},
			modifiers: [{id: "leaderBlocked", name: "O'Dimm's Bargain"}], objectives: ["margin20", "hand3"], rewards: [[18,1], [19,3]],
			rumor: {en: "A mirror merchant travels the roads near Oxenfurt. Everyone who has met him remembers him fondly. Nobody remembers his face.", es: "Un vendedor de espejos recorre los caminos cerca de Oxenfurt. Todos los que lo conocieron lo recuerdan con cariño. Nadie recuerda su rostro."},
			dialogue: {
				intro: [
					{who: "narrator", en: "At the Gustfields crossroads, a friendly little man in a plain hat was waiting. I won't say his name. Some names are better left unsaid.", es: "En la encrucijada de Gustfields esperaba un hombrecillo amable con un sombrero sencillo. No diré su nombre. Hay nombres que es mejor no pronunciar."},
					{who: "opp", en: "Geralt! A game between friends. Only one small condition: your leader stays out of it. A bargain's a bargain.", es: "¡Geralt! Una partida entre amigos. Solo una pequeña condición: tu líder no participa. Un trato es un trato."},
					{who: "geralt", en: "I don't remember agreeing.", es: "No recuerdo haber aceptado."},
					{who: "opp", en: "Oh, you did. Long ago.", es: "Oh, sí que aceptaste. Hace mucho."}
				],
				win: [
					{who: "opp", en: "Well played. Truly. Take my cards. We'll meet again; I'm a patient man.", es: "Bien jugado. De verdad. Toma mis cartas. Volveremos a vernos; soy un hombre paciente."},
					{who: "narrator", en: "The crossroads were empty when Geralt looked up. I still don't like to talk about it.", es: "La encrucijada estaba vacía cuando Geralt levantó la vista. Todavía no me gusta hablar de ello."}
				],
				loss: [{who: "opp", en: "Tsk. A bargain is a bargain, witcher.", es: "Tsk. Un trato es un trato, brujo."}]
			}
		},
		maelstrom: {
			chapter: "heartsofstone", name: "The Maelstrom", portrait: "neutral_villen", pin: {x: 13, y: 93}, level: "expert", requires: "odimm", hidden: true, music: "hearts-of-stone",
			deck: {faction: "monsters", leader: 96, cards: [
				[108,1], [125,1], [126,1], [14,1], [111,1], [130,1], [121,1], [114,1], [115,1], [102,1],
				[98,1], [99,1], [100,1], [101,1], [131,1], [132,1], [133,1], [134,1], [135,1],
				[109,1], [112,1], [10,1], [5,1]
			]},
			modifiers: [{id: "weather", card: 204, rounds: [1, 2, 3], name: "Endless Storm"}], objectives: ["sweep", "noWeather"], rewards: [[14,1]],
			rumor: {en: "Fishermen say the Maelstrom sings to those it wants. It has been quiet for three hundred years, as if waiting for the right voice.", es: "Los pescadores dicen que el Maelstrom les canta a los que quiere. Lleva trescientos años callado, como esperando la voz adecuada."},
			dialogue: {
				intro: [
					{who: "narrator", en: "There is a whirlpool off the southern coast of Skellige that sailors refuse to name. Geralt sailed into it. For a card game. I have tried to talk him out of worse.", es: "Frente a la costa sur de Skellige hay un remolino que los marineros se niegan a nombrar. Geralt navegó hacia él. Por una partida de cartas. He intentado disuadirlo de cosas peores."},
					{who: "geralt", en: "Storm every round. Of course.", es: "Tormenta en cada ronda. Cómo no."}
				],
				win: [{who: "narrator", en: "At the bottom of the Maelstrom waited a golden dragon in human form, who said he'd been hoping for a decent opponent for three hundred years.", es: "En el fondo del Maelstrom esperaba un dragón dorado con forma humana, que dijo llevar trescientos años esperando un rival decente."}],
				loss: [{who: "geralt", en: "The sea wins this round.", es: "El mar gana esta ronda."}]
			}
		},

		// ---------- Post-game: Blood and Wine ----------
		regis: {
			chapter: "bloodandwine", name: "Regis", portrait: "neutral_emiel", pin: {x: 88, y: 96}, place: "toussaint", level: "normal", music: "blood-and-wine",
			deck: {faction: "monsters", leader: 93, cards: [
				[7,1], [6,1], [108,1], [125,1], [131,1], [132,1], [133,1], [134,1], [135,1], [111,1], [130,1],
				[121,1], [109,1], [112,1], [98,1], [99,1], [100,1], [101,1], [5,1]
			]},
			modifiers: [], objectives: ["noLeader", "hand3"], rewards: [[7,1]],
			rumor: {en: "A barber-surgeon in Toussaint treats the poor for free and never calls during the day. His patients call him a saint. The garlic sellers have doubts.", es: "Un barbero-cirujano de Toussaint atiende gratis a los pobres y nunca visita de día. Sus pacientes lo llaman santo. Los vendedores de ajo tienen sus dudas."},
			dialogue: {
				intro: [
					{who: "narrator", en: "And then there was Toussaint, where the wine is sweet, the knights are earnest, and an old friend was waiting: Emiel Regis, barber-surgeon and, strictly speaking, a vampire.", es: "Y luego estaba Toussaint, donde el vino es dulce, los caballeros sinceros, y un viejo amigo esperaba: Emiel Regis, barbero-cirujano y, en sentido estricto, vampiro."},
					{who: "opp", en: "Geralt. Shall we? I have had a few centuries to practice.", es: "Geralt. ¿Jugamos? He tenido unos cuantos siglos para practicar."},
					{who: "geralt", en: "Go easy on me.", es: "No seas duro conmigo."}
				],
				win: [{who: "opp", en: "Splendid. My card is yours, my friend. As for Dettlaff... I fear he will be less gracious.", es: "Espléndido. Mi carta es tuya, amigo mío. En cuanto a Dettlaff... me temo que será menos cortés."}],
				loss: [{who: "opp", en: "Patience, Geralt. I can wait. I'm rather good at it.", es: "Paciencia, Geralt. Puedo esperar. Se me da bastante bien."}]
			}
		},
		dettlaff: {
			chapter: "bloodandwine", name: "Dettlaff van der Eretein", portrait: "monsters_katakan", pin: {x: 88, y: 96}, place: "toussaint", level: "hard", requires: "regis", retold: true, music: "night-of-long-fangs",
			deck: {faction: "monsters", leader: 96, cards: [
				[131,1], [132,1], [133,1], [134,1], [135,1], [108,1], [126,1], [111,1], [130,1], [121,1], [114,1],
				[115,1], [109,1], [112,1], [98,1], [99,1], [100,1], [101,1], [136,1], [125,1], [10,1], [5,1]
			]},
			modifiers: [{id: "ambush", name: "Night of Long Fangs"}, {id: "weather", card: 9, rounds: [1, 2, 3]}], objectives: ["margin20", "sweep"], rewards: [[60,1]],
			rumor: {en: "A gentle craftsman of toys and little boxes has gone missing in Beauclair, they say. The same week, the killings began. Nobody connects the two. Yet.", es: "Dicen que en Beauclair desapareció un amable artesano de juguetes y cajitas. Esa misma semana empezaron los asesinatos. Nadie relaciona una cosa con la otra. Todavía."},
			dialogue: {
				intro: [
					{who: "narrator", en: "Beauclair burned that night, under a fog that never lifted. Dettlaff van der Eretein, the Higher Vampire, called Geralt out, and the city's fate rode on it. No pressure.", es: "Esa noche Beauclair ardía, bajo una niebla que nunca se levantó. Dettlaff van der Eretein, el vampiro superior, desafió a Geralt, y el destino de la ciudad dependía de ello. Sin presión."},
					{who: "opp", en: "You. Witcher. Now.", es: "Tú. Brujo. Ahora."},
					{who: "geralt", en: "It's dark. And foggy.", es: "Está oscuro. Y hay niebla."},
					{who: "opp", en: "The night is mine. And I strike first.", es: "La noche es mía. Y ataco primero."}
				],
				win: [
					{who: "narrator", en: "Dettlaff had been lied to by the woman he loved, and he answered with a massacre. I don't excuse him. I only note that love has started worse wars.", es: "A Dettlaff le había mentido la mujer que amaba, y respondió con una masacre. No lo disculpo. Solo señalo que el amor ha empezado guerras peores."},
					{who: "narrator", en: "Beauclair was saved, and the Duchess pinned a medal on Geralt that he has never once worn. With it came a card bearing an emperor's face, a gift from Nilfgaard's embassy.", es: "Beauclair se salvó, y la Duquesa le prendió a Geralt una medalla que jamás se ha puesto. Con ella llegó una carta con el rostro de un emperador, regalo de la embajada de Nilfgaard."}
				],
				loss: [{who: "opp", en: "Weak.", es: "Débil."}]
			}
		}
	}
};
