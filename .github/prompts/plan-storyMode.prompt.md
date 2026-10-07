## Plan: Story Mode "Path of the Witcher"

A campaign across the Continent that also has replayable parts. You start as Geralt with a weak Northern Realms deck, beat named opponents from the lore region by region, and build a collection that stays between sessions. That collection unlocks factions, fills shops and pays for wagers. After the final boss (Eredin) there's post-game content (Hearts of Stone, Toussaint). Randomized tournaments give replay value. The game engine stays the same: story mode adds one data file, one logic file and one stylesheet, and hooks into a few points in `Game` and `DeckMaker`.

### Campaign

The campaign follows The Witcher 3's story order on `img/map/The_Witcher_3_Wild_Hunt_World_Map.png` (4840×3993). Pin positions are `x,y` percentages of the map, measured on full-resolution crops with a 5% grid. They point at labels and at art that is already on the map: Emhyr next to Vizima, the Baron at Crow's Perch, Crach at Kaer Trolde, the Naglfar ship.

**Map labels used** (x,y %):
- **Temeria:** White Orchard 86,86 · Nilfgaardian Camp 91,77 · Vizima 89,66 (Emhyr figure 93.5,62) · White Orchard battlefield 95,95 · tower 90,82
- **Velen:** Crow's Perch 53,57 (Baron figure 51,55) · Midcopse 61,53 · Crookback Bog 65,60 · Bald Mountain 65,66 · Fyke Isle 54,68 · The Mire 56,74 · Hanged Man's Tree / Grayrocks (orange-bordered burned zone) 60,43 · Nilfgaardian Garrison 80,60 · werewolf 74.5,62
- **Redania:** Novigrad 49,29 · Redanian camp figure 56,25 · Gustfields 62,31 · Vegelbud Estate 67,28.5 · Carsten 68,33.5 · Oxenfurt 67,38
- **Kaer Morhen:** castle 83,15
- **Skellige:** Kaer Trolde 17,51 (Crach figure) · Spikeroog 7,55 (figure 3.5,54) · An Skellig 30,49 (figure 25,47) · Arinbjorn 13,66 (warrior figure 12,71) · Ard Skellig 30,75 · Hindarsfjall 37,65 (figure 39,62) · Undvik 9,78 · Faroe 29,88 (figure 31,86) · whirlpools 34.5,60 / 34,82 · sinkhole maelstrom 13,96
- **Sea:** Naglfar (the black ship) 22,30 · kraken 5,31

**Progression rules**
- Each chapter has optional opponents and one **boss** (★). Beating the boss reveals the next region: locked regions are darkened by a fog overlay, and a dotted path connects the chapters.
- A Geralt medallion token marks the current chapter.
- Each region's faction is unlocked by that chapter's boss: Nilfgaard (Ch I), Monsters (Ch II), Scoia'tael (Ch III), Skellige (Ch IV). Unlocking gives the faction's starter deck (22 low-strength units, 1–2 specials) and its starter leader.
- Fixed rewards from a locked faction go into the collection anyway and become usable once the faction unlocks, so the order of optional fights doesn't matter. The random pick-1-of-3 pool only uses unlocked factions.
- Starter leaders:
  - Northern Realms: Foltest – King of Temeria (22)
  - Nilfgaard: Emhyr – Emperor of Nilfgaard (57)
  - Monsters: Eredin – King of the Wild Hunt (96)
  - Scoia'tael: Francesca – Pureblood Elf (142)
  - Skellige: Crach an Craite (211)
- The numbers in parentheses below are `card_dict` indices, dumped with node.
- Portraits use `img/lg/<deck>_<filename>.jpg`. Characters without a card (Innkeeper, Baron, Lambert, Eskel, Caranthir, Detlaff, the Velen peasant) use a related card's art or a faction shield.

**Prologue: White Orchard** (south of Vizima). AI: Easy → Normal

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 83,81 | Innkeeper, White Orchard village (tutorial dialogue) | NR · Easy | none | Decoy (1) |
| 91,77 | Capt. Peter Saar Gwynleve, Nilfgaardian Camp | NG · Easy | none | Commander's Horn (5) |
| 95,95 | The Griffin, battlefield (burning field + corpses) | Monsters · Easy | Fog in round 1 | Scorch (10) |
| 90,82 ★ | Vesemir, at the tower (sparring) | NR · Normal | none | Vesemir (13), Roach (214) |

**Chapter I: Vizima** (Emhyr's palace). Unlocks Nilfgaard

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 88,67 | Amb. Shilard Fitz-Oesterlen, Vizima | NG · Normal | none | Clear Weather (4) |
| 93.5,62 ★ | Emhyr var Emreis (the figure next to Vizima) | NG · Normal, White Flame leader (lore: it blocks your leader) | none | NG unlock + Emhyr – His Imperial Majesty (56) |

**Chapter II: Velen** (No Man's Land). Unlocks Monsters

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 53,57 | Crow's Perch Quartermaster | NR · Normal | none | Dun Banner Medic (32) |
| 51,55 | Bloody Baron (the armored figure at Crow's Perch) | NR · Normal | Baron's Hospitality: both draw +1 in round 1 | Foltest – Lord Commander (23) |
| 54,68 | Keira Metz, Fyke Isle ("A Towerful of Mice") | NR · Normal | Hex: Torrential Rain in round 1 | Keira Metz (38) |
| 61,53 | Midcopse peasant | NR · Easy | none (comic side match) | Cow (20) |
| 60,43 | Deserters, Hanged Man's Tree (orange-bordered burned zone) | NG · Normal | Ambush: they go first | Ballista (27) |
| 80,60 | Nilfgaardian Garrison commander (optional) | NG · Normal | none | Morvran Voorhis (75) |
| 74.5,62 | Werewolf contract (optional, the creature on the map) | Monsters · Normal | none | Werewolf (136) |
| 65,60 ★ | The Crones, Crookback Bog | Monsters · Normal | Bog Mist: Fog every round | Monsters unlock + Crones (105–107) |

**Chapter III: Novigrad & Oxenfurt**. Unlocks Scoia'tael and the Passiflora tournament. One Novigrad pin (49,29) opens a panel with every opponent in the city.

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 49,29 | Dandelion (The Chameleon) | NR · Normal | none | Dandelion (6) |
| 49,29 | Triss Merigold | NR · Normal | Witch Hunters: no weather in your deck | Triss (12) |
| 49,29 | Sigismund Dijkstra | NR · Hard | Informants: you discard a random card after the redraw | Dijkstra (47), Foltest – Siegemaster (24) |
| 49,29 | Passiflora tournament | random | random | see Tournaments |
| 49,29 ★ | Zoltan Chivay (dwarves) | Scoia'tael · Hard | none | Scoia'tael unlock + Zoltan (16) |
| 56,25 | Philippa Eilhart, Redanian camp (the banner figure) | NR · Hard | Lodge Intrigue: you discard a random card after the redraw | Philippa Eilhart (39) |
| 67,38 | Vernon Roche, Oxenfurt | NR · Hard | Partisans: they go first | Vernon Roche (51), Foltest – Steel-Forged (25) |

**Chapter IV: Skellige**. Unlocks Skellige and the Kaer Trolde tournament

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 17,51 ★ | Crach an Craite, Kaer Trolde (the jarl figure) | Skellige · Hard | Skellige Storm in rounds 1 and 3 | Skellige unlock + King Bran (212) |
| 12,71 | Cerys an Craite (the warrior figure near Arinbjorn) | Skellige · Normal | Skellige Storm in round 1 | Cerys (184) |
| 9,78 | Ice Giant, with Hjalmar (Undvik) | Monsters · Hard | Biting Frost every round | Hjalmar (197) |
| 3.5,54 | Madman Lugos, Spikeroog (optional) | Skellige · Normal | none | Madman Lugos (201), Blueboy Lugos (183) |
| 39,62 | Ermion, Hindarsfjall | Skellige · Hard | none | Ermion (195) |
| 34,82 | Avallac'h, Isle of Mists (the southern whirlpool) | Scoia'tael · Hard | Mist: Fog every round | Mysterious Elf (0) |

**Chapter V: Kaer Morhen** (one pin at the castle, 83,15)

| Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|
| Lambert | NR · Normal | none | Commander's Horn (5) |
| Eskel | NR · Normal | none | Decoy (1) |
| Yennefer (Lodge mages deck) | NR · Hard | none | Yennefer (15) |
| Letho of Gulet (optional) | NG · Hard | none | Letho (72) |
| ★ Battle of Kaer Morhen (Wild Hunt vanguard) | Monsters · Hard, Eredin – Commander | Breath of the Hunt: Frost every round; Defenders: you draw +1 | Ciri (3), Eredin – Commander (93) |

**Chapter VI: The Hunt**

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 65,66 | Imlerith, Bald Mountain | Monsters · Hard | Sabbath: they go first, plus Frost | Imlerith (124) |
| 22,30 | Caranthir, Naglfar (the black ship) | Monsters · Hard, Bringer of Death | Frost every round | Eredin – Bringer of Death (94) |
| 22,30 ★ | Eredin Bréacc Glas (final) | Monsters · Expert (Hard AI + top deck), Destroyer | Frost every round, plus Ambush | Geralt of Rivia (8) (a trophy card for your legend, even though you play as Geralt), Eredin – Destroyer (95), then credits |

**Post-game**

| Pin | Opponent | Deck · AI | Modifier / terms | Fixed reward |
|---|---|---|---|---|
| 68,33.5 | Olgierd von Everec, near Oxenfurt (Hearts of Stone) | NR · Hard | none | Olgierd (17) |
| 62,31 | Gaunter O'Dimm, Gustfields crossroads (appears after Olgierd) | NR + Darkness · Expert | O'Dimm's Bargain: your leader is blocked | Gaunter O'Dimm (18), Darkness ×3 (19) |
| 13,96 | The Maelstrom (secret: the sea sinkhole, after O'Dimm) | Monsters · Expert | Skellige Storm every round | Villentretenmerth (14) |
| 88,99 | Regis (Toussaint: off-map pin on the bottom edge, "Road to Toussaint") | Monsters vampires · Hard | none | Regis (7) |
| 88,99 | Detlaff | Monsters vampires · Expert | Night of Long Fangs: they go first, plus Fog | Emhyr – Invader of the North (60) |
| 88,99 | Beauclair tournament | random | random | see Tournaments |

**Tournaments** (replayable, entry fee)
- **Passiflora** (Novigrad, after Ch III), **Kaer Trolde** (after Ch IV) and **Beauclair** (post-game).
- Each is a bracket of random opponents built from region NPC names, `ai_decks` pools and random modifiers.
- Grand prizes rotate through the leaders that aren't fixed rewards:
  - Passiflora: Francesca – Daisy (141), Francesca – Queen (139)
  - Kaer Trolde: Francesca – Beautiful (140), Emhyr – Relentless (59), Emhyr – White Flame (58)
  - Beauclair: Foltest – Son of Medell (26), Eredin – Treacherous (97), Francesca – Hope (143)
- Tournament pins: Passiflora at the Novigrad pin, Kaer Trolde at 17,51, Beauclair at the Toussaint pin.

**Size:** about 35 opponents. Core path: 7 bosses + finale. Everything else is optional.

### Rules and economy

**Rules**
- **Losing** costs nothing (except a wager); retry freely.
- **AI level** is fixed per opponent. Story mode has no difficulty setting.
- **Boss gating:** each chapter has `bossAfter` (default 2), the number of optional opponents in that chapter you must beat before the boss unlocks.
  - Prologue: the Innkeeper + 1 more.
  - Chapter VI is linear: Imlerith → Caranthir → Eredin.
  - Post-game opponents use `requires`.
- **Rematches:** an opponent's curated core stays the same, and 3 slots (`randomSlots`) are refilled with random cards from their faction pool. The deck stays legal (22+ units).
- **Duplicates:**
  - The pick-1-of-3 pool and the shop never offer a card you already own every copy of.
  - A fixed reward you already own at max converts to crowns equal to its shop price.
- **Wagers** are only offered on rematches of beaten opponents and in tournaments. Bosses don't accept them on the first attempt.
- **Free play** (Local Play / Online) isn't affected: every card stays available there.

**Crowns**

| Chapter | Prologue | I | II | III | IV | V | VI | Post-game |
|---|---|---|---|---|---|---|---|---|
| Win (first time) | 10 | 20 | 30 | 50 | 70 | 85 | 100 | 100 |

- A boss's first win pays ×2. Rematch wins pay 50%.
- Each newly earned star pays +25% of the opponent's win reward.
- Crown wagers: 10/25/50, doubled on a win, lost on a loss.

**Shop prices by rarity**

| Rarity | Price |
|---|---|
| Common | 10 |
| Ability card (spy, medic, muster, scorch, horn, bond, morale, agile) | 30 |
| Hero | 100 |
| Leader | 200 (leaders are never sold, only used for conversions) |

- The shop never sells cards that are fixed rewards.

**Tournaments**

| Tournament | Entry fee | Per round won | Champion |
|---|---|---|---|
| Passiflora | 20 | 20 | 80 + grand prize leader |
| Kaer Trolde | 50 | 50 | 200 + grand prize leader |
| Beauclair | 100 | 100 | 400 + grand prize leader |

- If you already own all of a tournament's grand prizes, the champion picks 1 of 3 heroes instead.

**Objectives** (3 stars per opponent; star 1 is always "Win")
- The other two come from this catalog: Win 2–0 · Win without using your leader · Win the final round by 20+ · Win with at most N heroes in your deck · Win without playing weather · Finish with 3+ cards in hand · Win while going second.
- All of them are checked from `roundHistory`, leader state, hand size and a per-match log of played cards in `StoryMode`.

**Dialogue**
- I draft the lines and you review them. Each opponent gets 2–4 intro lines, 1–2 win lines and 1 loss line, in EN + ES.
- Speakers: Geralt, the opponent, and the narrator.
- **Dandelion is the narrator.** As in The Witcher 3's journal, he tells the tale after the fact:
  - past tense, Geralt in the third person, with the occasional aside in the first person ("I'd have written a ballad; he simply pocketed it.").
  - It also fits his Chapter III match. He narrates from later on, so he can appear in the story while still being the one telling it.
- There's no in-match tutorial. The Innkeeper's intro has a "How to Play" button that opens the existing guide.

**Save**
- One localStorage save, plus Export/Import to a JSON file from the story settings.
- Import is validated: schema version, known opponent ids, card indices inside `card_dict`, counts no higher than each card's max, decks legal. Anything invalid is rejected with `ui.alert`.

**Stats screen**
- Wins, losses, current and best streak, crowns earned, tournaments won, and cards collected (% overall and per faction).

**Phase 1: Data and save** (blocks everything else)
1. New file `campaign.js` holds only data, no logic:
   - **Chapters and regions:** as in the Campaign section: Prologue → Vizima → Velen → Novigrad & Oxenfurt → Skellige → Kaer Morhen → The Hunt, then post-game.
   - **Each chapter:** id, name, region fog polygon (% coordinates), path point, `bossAfter`, and the boss that unlocks the next chapter.
   - **Each opponent:** id, chapter, name, portrait (an `img/lg` art filename, or a faction shield as fallback), pin `{x, y}`, AI level, curated deck `{faction, leader, cards:[[i,n]]}` in the same format as `ai_decks`, `randomSlots`, modifiers, 2 extra objectives, fixed rewards, a crown reward, dialogue `{intro, win, loss}`, an optional `unlocks` faction, and an optional `requires` (e.g. O'Dimm requires Olgierd).
   - **Starter decks:** 22 low-strength units for each of the 5 factions, plus the starter leader and 1–2 specials. Northern Realms only has 34 non-hero unit copies, so its rewards will be mostly heroes, neutrals, specials, leaders and the ~12 remaining units.
   - **Card indices:** get the real `card_dict` indices by dumping them with node (indices produced by subagents have been wrong before).
2. New file `story.js` with a `StoryMode` object that owns the save, a single `SavedObject("gc-story")`:
   - Saved fields: `version`, `collection {index: count}`, `decks {faction: {leader, cards}}`, `activeFaction`, `unlockedFactions`, `crowns`, `progress {oppId: {wins, stars[3], firstWinClaimed}}`, `chapter`, `shopStock`, `tournament` (the run in progress), `seenDialogue`, `stats`.
   - Methods: `reset()` (asks via `ui.confirm`), `exportSave()`, `importSave(file)` (validated, see Rules and economy → Save), and `rarity(cardData)`. Rarity is derived: leader > hero > ability card > common, and it drives prices and how often a card appears as a reward.

**Phase 2: Engine hooks in gwent.js** (*depends on 1*)

3. **Starting a match:** `StoryMode.startMatch(opp)`:
   - Builds `player_me = new Player(0, t("Geralt"), storyDeck)`: you play as Geralt, so his name shows on the board (`#name-me`), the end screen and the dialogue (Geralt's lines use the `neutral_geralt` portrait). Builds `player_op = new Player(1, opp.name, deck)`.
   - Then sets `player_op.controller = new ControllerAI(player_op, opp.level)`, the same per-instance pattern the AI benchmark uses.
   - Applies modifiers, then calls `game.startGame()`.
4. **Modifiers:** a `STORY_MODIFIERS` catalog. Each entry is `{label, desc, side, apply(player)}` and works by pushing into the existing `game.gameStart/roundStart/roundEnd` hooks, the same way factions.js does. They are applied after `Game.initPlayers`. The campaign needs these:
   - `weather(type, rounds)`: Frost / Fog / Rain / Skellige Storm at the start of the listed rounds, via `board.toWeather` with a fresh weather `Card`.
   - `ambush`: the opponent goes first, by setting `game.firstPlayer`.
   - `extraDraw(side)`: draw +1 at the start of round 1 (Baron's Hospitality uses both sides; Kaer Morhen Defenders only you).
   - `informants`: you discard a random hand card at the start of round 1.
   - `leaderBlocked`: your leader is blocked, reusing `leaderBlockedBy` and `disableLeader`.
   - `terms(rule)`: restrictions on your deck (e.g. no weather), reusing the ban functions in `DeckMaker.RULES` and `limitWarnings`, checked before the match starts.
5. **End of game:** `Game.endGame` calls `StoryMode.onGameEnd({won, draw, roundHistory, leaderUsed})` when story mode is active.
   - The end screen buttons become "Continue" (go to the reward screen), "Rematch" and "Map".
   - `returnToMainMenu` and `exitGame` go to the map when story mode is active. Quitting counts as a loss, so any wager is forfeited.
6. **Deck builder story mode:** controlled by `dm.storyMode` and `body.story`.
   - `makeBank` uses collection counts instead of `card.count`.
   - `selectFaction` only offers unlocked factions; `selectLeader` only owned leaders.
   - `select` saves to `StoryMode.decks`, not to the free-play `Settings.*Deck`.
   - `#start-game` becomes "Done" (back to the map), and `#opponent-preview` is hidden.
   - The 22-unit / 10-special rules still apply.
7. Online and hotseat stay unaffected: story mode forces AI mode and never touches the `Settings` decks.

**Phase 3: Story UI** (*depends on 2*; the steps can be done in parallel)

8. **Title screen:** a `#title-story` "Story" button in index.html, first in the title menu, wired up next to `#title-play` (gwent.js ~4630).
9. **`#story-screen` map:**
   - Uses downscaled copies of `img/map/The_Witcher_3_Wild_Hunt_World_Map.png` (4840×3993, 34 MB): `img/map/continent-2560.jpg` (963 KB) and `continent-1280.jpg` (350 KB) for phones, picked via `image-set`. Done: System.Drawing has no WebP encoder, so they are JPEGs.
   - Add the original PNG to `.vercelignore` (and consider `.gitignore`) so it never ships.
   - Pins sit at `--x/--y` percentages, like the `.g-pin` markers in the guide. Tapping a location pin opens a side panel with its opponents. A crowded place gets one pin of its own for all its opponents instead of overlapping markers: Novigrad 49,29, Kaer Morhen 83,15, Naglfar 22,30 and Toussaint 88,99 are 4 separate pins.
   - Each opponent shows locked/available/beaten, its 3 stars, a boss crest, and a faction-colored ring.
   - Fog overlay on unrevealed regions (CSS mask or an SVG polygon per chapter), a dotted chapter path (SVG polyline), and the Geralt medallion token.
   - Toussaint is off-map: a pin on the bottom edge with a "Road to Toussaint" arrow.
   - HUD: crowns, a Deck button (opens the builder in story mode), Collection, Shop, Tournaments, Stats, and story settings (Export / Import / Reset save).
   - The map pans and zooms on mobile, and the pan should follow the pointer handling in `Carousel.initSwipe`.
10. **Dialogue overlay** (`#story-dialogue`): the portrait's card art, the speaker's name, and the lines advanced by tap/Enter. Narrator lines (`who: "narrator"`) are spoken by Dandelion: his `neutral_dandelion` portrait and name, with the text in italics. It is shown before the match intro and after the outro (the win or loss lines), and skipped if already seen (with a replay option). The Innkeeper's intro has a "How to Play" button that calls `guide.show()`.
11. **Pre-match panel:**
    - Shows the opponent's faction, AI level, modifiers and the 3 objectives.
    - Wager picker, only on rematches of beaten opponents and in tournaments:
      - Crowns: 10/25/50, doubled on a win.
      - Card for card: stake one owned copy. A card can't be staked if losing it would make a saved deck illegal. On a win you choose 1 card from the opponent's deck in a Carousel.
12. **Reward screen:**
    - First win: the opponent's fixed card (converted to crowns if you already own the max), plus a faction unlock with its starter deck if it was a boss.
    - Every win: pick 1 of 3. The pool is the opponent's faction cards + neutral/special/weather cards, limited to unlocked factions and cards you don't own every copy of, weighted by rarity. Rematches give a smaller crown reward and a lower chance of rare cards.
    - Stars: an animated burst via `fx.burst`.
13. **Shop:** one merchant per region (e.g. the Novigrad card trader, Lugos in Skellige). Stock is drawn from the region's factions, priced by rarity (see Rules and economy), and refreshes every 3 matches. Fixed-reward cards and leaders are never sold.
14. **Collection viewer:** a read-only grid with owned/total counts per faction (it can reuse the deck builder's previews).
14b. **Stats screen:** the counters listed under Rules and economy → Stats screen, updated in `onGameEnd` and when a tournament ends.

**Phase 4: Tournaments** (*depends on 2–3*)

15. Tournaments unlock after Novigrad (Passiflora), Skellige (Kaer Trolde) and post-game Toussaint (Beauclair). Each has an entry fee and 3–4 single-elimination rounds. The grand prizes are the leaders listed under Campaign → Tournaments.
16. Opponents are a random NPC name and portrait for the region, a random deck from `ai_decks[level]`, and a random modifier. Difficulty rises each round: normal → hard → expert.
17. Prizes scale with how far you get, using the entry fees and payouts in the Rules and economy tournament table.
18. The run is saved after every match, so reloading resumes it. Between rounds you can edit your deck.

**Phase 5: Integration** (*parallel with 3–4*)

19. New `css/story.css`. Sizes use `var(--u)`, and it needs the phone `@media` blocks. The overlays go outside `main`, like `#deck-customization`, and dialogue must sit below `#popup` (z-index 1002).
20. Every string goes through `t()`, with entries in `I18N.es` in i18n.js (neutral/LatAm Spanish, tú). Card names stay in English. The exception is dialogue: it lives in `campaign.js` as `{en, es}` pairs and is picked by `Lang.current`, because long lines don't belong in the `I18N` table.
21. Add the script tags for `campaign.js` and `story.js` after `gwent.js`, plus `css/story.css`, to index.html. Add the same files to `SHELL_FILES` in sw.js and bump `VERSION`. The map image will be cached on first use (images are cache-first).

**Relevant files**
- gwent.js:
  - `Game.endGame/returnToMainMenu/exitGame/rematchGame/newOpponentGame`
  - `Game.initPlayers` (where modifiers are applied)
  - `DeckMaker.makeBank/setFaction/selectLeader/selectFaction/select/startNewGame/playerDeck`
  - `DeckMaker.RULES` and `limitWarnings` (reused for opponent's terms)
  - `Player` constructor and `ControllerAI` (per-match level)
  - `board.toWeather`, `SavedObject`, the title listeners (~4630)
- factions.js: the hook-push pattern that modifiers copy
- decks.js: `ai_decks` (tournament pools and the deck format)
- cards.js: source of the real card indices
- index.html, sw.js, i18n.js, new `campaign.js`, `story.js`, `css/story.css`
- `img/map/` (the map image, downscaled) and `.vercelignore` (exclude the 34 MB original)

**Verification**
1. Fresh save: the starter deck is legal (22 units) and the prologue can be won against the Easy Innkeeper.
2. Use the in-page pass-loop harness with notifications disabled (and re-enabled afterwards) to force a win and a loss. Check rewards, stars, crowns, wager payouts and losses, the faction unlock when a boss is beaten, and that a reload keeps the save.
3. The deck builder in story mode only shows owned cards and leaders and unlocked factions. Free-play decks stay untouched before and after.
4. Use the AI-vs-AI benchmark (`bench.js`) on curated opponent decks against starter-level decks, to set a difficulty curve per chapter of roughly 70% → 45% expected player win rate.
5. Each modifier triggers correctly, including across rounds. Quitting mid-match doesn't leak state into the next game (check against `game.session`).
6. Online and Pass and Play are unaffected (smoke test).
7. Spanish: compare live text nodes against the translations. Check the map screen on a phone in landscape.
8. Export, reset, then import restores the save exactly. Tampered files are rejected: unknown card indices, counts above a card's max, an unknown version, or broken JSON.
9. Boss gating: the boss stays locked until `bossAfter` optional wins. Duplicate fixed rewards convert to crowns. Wagers only appear on rematches and in tournaments.

**Scope**
- Included: everything above.
- Excluded: New Game+, a daily challenge, a story difficulty setting, an in-match tutorial, achievements, opponent play-style quirks, separate map music, extra lives for bosses (the health gems UI only supports 2), new card art, voice or audio for dialogue, and cloud sync.

**Further considerations**
1. **Map image licensing:** the TW3 world map is CD Projekt's art, like the card art, and the app is deployed publicly on Vercel.
2. **Release stages:**
   - R1 (first implementation): every system (map, dialogue, pre-match panel, modifiers, objectives, rewards, wagers, shop, collection, stats, save export/import) plus the Prologue, Vizima and Velen content. This tests the whole loop and unlocks Nilfgaard and Monsters. Tournament code waits for R2.
   - R2: Novigrad & Oxenfurt + Passiflora tournament.
   - R3: Skellige, Kaer Morhen and The Hunt.
   - R4: post-game.
3. **Lore liberties:**
   - Avallac'h appears as the "Mysterious Elf" card.
   - Lambert, Eskel, the Baron, Caranthir and Detlaff have no cards, so their portraits are stand-ins.
   - The Isle of Mists is the southern whirlpool.
   - Toussaint is off the map, so it gets a pin on the bottom edge.
   - Figures on the map with no label are assigned to characters: Emhyr, the Baron, Crach, Cerys, Lugos and the Redanian camp.
4. **Balance pressure points:** NG's 10-strength Black Infantry Archers make the Nilfgaard starter strong if it includes them, so keep those out of the starter. The Frost-every-round bosses need decks built around Frost (more siege/ranged units) to stay fair.
