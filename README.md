# Gwent Classic

The Gwent card game from *The Witcher 3: Wild Hunt*, rebuilt for the browser. It has every card from the base game, *Hearts of Stone*, *Blood and Wine* and the next-gen update, a story campaign that follows Geralt across the Continent, an AI opponent, online matches with a room code, pass-and-play matches on one device, a deck builder, and a refreshed UI with a title screen, visual effects and music that changes between menus and matches. It's playable in English and Spanish and installs as an app on phones.

No install, no build step. It's plain HTML, CSS and JavaScript.

## Contents
- [Quick start](#quick-start)
- [How to play](#how-to-play)
- [Story mode](#story-mode)
- [Online play](#online-play)
- [Pass and play](#pass-and-play)
- [Factions](#factions)
- [Card abilities](#card-abilities)
- [Deck building](#deck-building)
- [Settings](#settings)
- [Project structure](#project-structure)
- [Development notes](#development-notes)
- [Credits](#credits)
- [License](#license)

## Quick start
**Windows:** double-click `Start Gwent.bat`. It starts a local server at http://127.0.0.1:8000/ and opens it in your browser. It uses Python if it's installed (the `py` launcher or a real `python`, not the Microsoft Store shortcut) and falls back to Node.js (`npx http-server`) if not. If neither is found it tells you what to install. Close the server window to stop it.

**Any platform:** serve the folder with a static web server and open it, for example:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

> Opening `index.html` directly (`file://`) runs the game, but some browsers fail to load the music and larger sound effects. Use a local server for the full experience.

Press **F11** for fullscreen. The board keeps a 16:9 aspect ratio and scales to any window size.

## How to play
Win **two of three rounds**. The player with the higher total score when a round ends wins it. Each player has two gems, and a gem is lost for every round lost.

1. **Start of match:** a coin toss decides who goes first (Scoia'tael players may choose). Leaders with passive abilities (King Bran, Daisy of the Valley, the White Flame and so on) are announced with a banner. Each player then has the option to **redraw up to 2 cards** from their starting hand of 10.
2. **Turns:** on your turn, play one card or use your **leader ability** (once per match) by clicking your leader. A gold badge above the active player's panel shows whose turn it is.
3. **Passing:** **hold** the Pass button for a moment to pass (a quick tap does nothing, so you can't pass by accident; <kbd>Enter</kbd> on the focused button passes at once). Your opponent keeps playing until they pass too.
4. **End of round:** once both players have passed, scores are compared, the board is cleared to the discard piles, and the next round begins. You **do not draw** between rounds, so card advantage matters.

Units go in one of three rows: **Close Combat**, **Ranged** or **Siege**. Click a card in your hand to select it, then click a row to play it. Click a row, discard pile or leader to inspect it; this works during your opponent's turn too. Hovering a button or leader with the mouse (or focusing it with <kbd>Tab</kbd>) shows a short hint; touch screens skip these hints so they don't stay stuck on screen after a tap.

**Keyboard:** <kbd>Tab</kbd> moves between cards, rows and buttons; <kbd>Enter</kbd> or <kbd>Space</kbd> activates the focused one. In card pickers, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> browse, <kbd>Enter</kbd> selects and <kbd>Esc</kbd> closes. <kbd>Esc</kbd> also cancels a selected card. Game messages are announced to screen readers.

The **?** button opens an illustrated How to Play guide covering the rules, every game mode and the controls.

## Story mode
A single-player campaign that follows Geralt through *The Witcher 3*, told by Dandelion. Choose **Story** on the title screen. You start with a weak Northern Realms deck and an empty purse, and build a collection by beating the people (and monsters) Geralt met along the way.

### The map
- Each pin is an opponent, or a place with several (the number on the pin; click it for the list). Pulsing pins are ready to play, a crown marks a chapter boss, a padlock means locked, and stars under a pin show the objectives you've earned.
- Regions you haven't reached are covered in fog, and a dotted route links the bosses of the chapters you've opened. Zoom with the mouse wheel, a pinch or the **+**/**&minus;** buttons, and drag to pan.
- The side panel starts on the **Journal**: every chapter with its progress and stars, plus any open tournaments. Chapters and places show a tavern rumor; **Replay Story** plays a chapter's opening again. <kbd>Esc</kbd> goes back.
- The bar on top shows your **crowns** and opens your **Deck**, **Collection**, **Shop**, **Stats** and **Options**.

### Chapters
| Chapter | Boss | Unlocks |
| --- | --- | --- |
| Prologue: White Orchard | Vesemir | |
| I: Vizima | Emhyr var Emreis | Nilfgaard |
| II: Velen | The Crones | Monsters |
| III: Novigrad & Oxenfurt | Zoltan Chivay | Scoia'tael, Passiflora tournament |
| IV: Skellige | Crach an Craite | Skellige, Kaer Trolde tournament |
| V: Kaer Morhen | Battle of Kaer Morhen | |
| VI: The Wild Hunt | Eredin | Credits, post-game chapters |

A chapter's boss appears once you've beaten its key opponents and enough of the others (the opponent panel says what's missing), and beating the boss opens the next chapter. The Wild Hunt is linear: each general must fall before the next. Beating Eredin rolls the credits and opens two post-game chapters, *Hearts of Stone* and *Blood and Wine* (with the Beauclair tournament); one of their opponents is a secret that only appears on the map once it can be challenged. An unlocked faction comes with its own starter deck and leader.

### Opponents and matches
Select an opponent to see their faction and AI level, your current deck, their **special rules**, the **objectives** and the **reward**, then press **Challenge**. The first challenge plays the opponent's introduction; after the match, Dandelion tells how it went and a results screen shows stars, crowns and cards.

- **AI level:** fixed per opponent, from Easy in White Orchard to Expert for the final bosses. There's no difficulty setting, and Hard/Expert deck caps don't apply.
- **Special rules:** weather played at the start of some or every round, an ambush (the opponent goes first), an extra card for you or both players in round 1, informants (you discard a random card in round 1), a blocked leader, or deck terms (for example no weather cards in your deck; **Challenge** stays disabled until your deck complies).
- **Stars:** up to 3 per opponent: one for winning and one for each of its two objectives (win 2&ndash;0, win without using your leader, win the final round by 20+, finish with 3+ cards in hand, win without playing weather, win while going second). Rematches can earn the stars you missed.
- **Losing** costs nothing: adjust your deck and try again. The end screen offers **Continue** (back to the map) and **Rematch**. Leaving a match early counts as a loss.
- **Music:** chapter bosses get Silver for Monsters (Monsters) or Steel for Humans (everyone else); the map plays The Trail.

### Rewards and the collection
- **Crowns:** each win pays the chapter's rate (10 in White Orchard up to 100 for the Wild Hunt and the post-game). A boss pays double the first time, rematches pay half, and every new star adds a quarter of the rate.
- **Cards:** after every win you pick 1 of 3 cards (from the opponent's faction if you've unlocked it, otherwise from yours, plus neutrals; heroes are rarer on rematches). A first win also gives the opponent's fixed reward cards, shown in the panel. Copies beyond a card's limit are paid out in crowns. Unpicked rewards wait on the map, even after a reload.
- **Deck:** opens the deck builder limited to the copies and leaders you own, one deck per unlocked faction, with the usual rules (22+ units, at most 10 special cards). The faction you leave selected is the one you play with.
- **Collection:** every card by faction, owned/maximum copies, and how much of the set you've collected.
- **Shop (Card Trader):** 8 cards from your unlocked factions and the neutral, special and weather cards, never leaders or fixed rewards. New stock every 3 matches. Prices: 10 crowns for plain units, 30 for cards with an ability (special and weather cards included), 100 for heroes.
- **Wagers:** on rematches and tournament rounds you can stake 10, 25 or 50 crowns (a win doubles them, a draw returns them) or a spare card, meaning a copy not used in any of your decks (win to keep it and pick a card from the opponent's deck, draw to keep it). Losing the match, or leaving it, loses the stake.
- **Stats:** wins, losses, streaks, crowns earned, tournaments won, stars and collection per faction.

### Tournaments
| Tournament | Opens after | Entry fee | Per round won | Champion |
| --- | --- | --- | --- | --- |
| Passiflora (Novigrad) | Zoltan | 20 | 20 | +80 and a leader card |
| Kaer Trolde (Skellige) | Crach | 50 | 50 | +200 and a leader card |
| Beauclair (Toussaint) | Regis | 100 | 100 | +400 and a leader card |

Three single-elimination rounds against random entrants with AI decks, each tougher than the last and possibly with a special rule. The bracket is drawn when you enter, so a reload resumes the same run. A draw replays the round; a loss, or leaving a match, ends the run; **Withdraw** quits at any time. The fee is never refunded, and only one run can be open at a time. Once you own all of a tournament's leaders, the champion picks a hero instead.

### Saving
Progress is saved automatically in the browser's `localStorage` (`gc-story`). **Options** exports the save as `gwent-story-save.json`, imports it on another device or browser, or resets the campaign. Imported files are validated; a save that fails validation on load is kept in `gc-story-backup` before a fresh one starts.

## Online play
Play someone on another device. Both players need an internet connection.

1. On the title screen choose **Online** and enter a name (up to 16 characters; it's remembered for next time).
2. One player picks a **turn timer** (none, 30, 60 or 90 seconds) and presses **Create Room**. Share the 5-character room code, or press **Share Invite Link** and send the link (it opens the game with the code filled in).
3. The other player enters the code and presses **Join Room**.
4. Both players pick a deck in the deck builder and press **Ready**. The match starts when both are ready. Pressing **Back** in the deck builder asks before leaving the room (**Stay** / **Leave**).

During the match you only see your own hand. A countdown appears next to the player whose move it is when a timer is set; if it runs out on your turn you pass the round, and an unanswered card choice (redraw, medic, leader picks) is skipped or takes the card on show. After the match, **Rematch** (both players must accept) keeps the decks, **New Game** sends both players back to the deck builder, and **Main Menu** leaves the room. Leaving a match early counts as a forfeit.

If the connection drops, the game tries to reconnect for 60 seconds. Reloading the page during a match rejoins it automatically (in the same tab). If the opponent doesn't come back in time, you win.

How it works: the two browsers connect directly with WebRTC through [PeerJS](https://peerjs.com/) (its free public server is only used to find each other). When a direct connection isn't possible (strict NATs, mobile data), traffic goes through a Cloudflare TURN relay; `api/turn.js` (a Vercel function) hands out 6-hour relay credentials, only to requests coming from the game's own site. Both run the same game from a shared random seed and only send each other their moves, and each turn they compare a checksum of the game state; if the games ever disagree, or a move breaks the rules, the match ends. Some strict networks (corporate firewalls) can still block the connection.

## Pass and play
Two people can play each other on the same device, passing it between turns.

1. On the title screen choose **Local Play**, then pick **Pass and Play** under *Opponent* in the deck builder.
2. Each player builds their own deck. Use the **Editing: Player 1 / Player 2** switch under *Opponent* to choose whose deck the builder shows; faction, leader and card changes all apply to that player. Player 2's decks are saved separately from Player 1's, one per faction.
3. Press **Start game**. Both decks must be legal (22+ units, at most 10 specials).

Player 1 plays the bottom half of the board and Player 2 the top half. The hand tray at the bottom only ever shows the hand of the player whose turn it is. Whenever control changes hands, a **Pass the device** screen hides the board until the next player presses **Ready**, so neither player sees the other's cards. This also happens for each player's opening redraw. If one player has passed, the other keeps playing without the handoff screen.

Banners, the end screen and screen reader messages name the player ("Player 2's turn", "Player 1 wins!") instead of saying "you" and "opponent". Leader abilities, faction perks (such as the Scoia'tael choice of who goes first) and card choices work the same for both players. **Rematch** keeps both decks; **New Game** returns to the deck builder so both players can pick again. **Quit match** on the handoff screen, or the exit button, returns to the deck builder.

## Factions
Your faction determines which unit cards and leaders you can use (neutral and special cards are available to all) and gives you a passive perk.

| Faction | Perk |
| --- | --- |
| Northern Realms | Draw a card from your deck whenever you win a round. |
| Nilfgaardian Empire | Wins any round that ends in a draw. |
| Monsters | Keeps a random unit card on the board after each round. |
| Scoia'tael | Decides who takes the first turn. |
| Skellige | 2 random units from the graveyard return to the battlefield at the start of round 3. |

Each faction has several leaders, each with its own ability. Most are used once per match by clicking the leader; a few are passive and work from the start (announced with a banner). The White Flame cancels both players' leader abilities. Leader horns (Siegemaster, Commander of the Red Riders, The Beautiful) can't be used on a row that already has Dandelion or Draig Bon-Dhu, since horns don't stack.

## Card abilities
| Ability | Effect |
| --- | --- |
| Hero | Immune to weather, special cards and abilities. |
| Agile | Can be placed in either Close Combat or Ranged. |
| Medic | Revive a unit from your discard pile (not heroes or specials). |
| Morale Boost | +1 to every other unit in its row. |
| Muster | Summons all copies of the same card from your deck. |
| Spy | Played on the opponent's side (counts toward their score); you draw 2 cards. |
| Tight Bond | Strength is multiplied when placed next to copies of the same card. |
| Scorch | Destroys the strongest card(s) on the board, or in a specific enemy row for unit variants. |
| Commander's Horn | Doubles the strength of all units in a row (one per row). |
| Decoy | Swap with a unit on the board to return it to your hand. |
| Berserker / Mardroeme | Mardroeme transforms Berserkers into a stronger bear form. The bear is a token: when it leaves the board the original Berserker takes its place (in the discard pile, or in hand after a Decoy). |
| Avenger | Summons another card when removed from the battlefield (the summon disappears when it leaves the board). |
| Biting Frost / Impenetrable Fog / Torrential Rain | Sets all Close Combat / Ranged / Siege units to 1 strength for both players. |
| Skellige Storm | Applies both Fog and Rain. |
| Clear Weather | Removes all weather effects. |

## Deck building
Open the **Deck Builder** from the title screen.

- Choose a faction at the top, then click cards in the left (collection) and right (deck) lists to add or remove them.
- Click your leader to cycle through the leaders available for that faction.
- A deck needs **at least 22 unit cards** and **no more than 10 special cards**. The stats column shows your counts.
- **Opponent:** choose **AI** or **Pass and Play** (see [Pass and play](#pass-and-play)). The choice is remembered.
- **AI difficulty:** pick **Easy**, **Normal**, **Hard** or **Expert** under *Opponent* (shown when playing the AI). Each difficulty has its own pool of decks, one or more per faction, each with a set leader: Easy brings weak starter decks, Normal the classic premade decks, and Hard thin decks full of heroes, spies, medics and the strongest leaders. Easy also skips its redraw and often makes random plays; Normal weighs its options with some randomness; Hard plays for card advantage: it takes free cards first (spies, decoyed spies, Avengers), answers with its cheapest card that takes the lead, passes once ahead in rounds it can afford to lose, and once you've passed it wins with the fewest cards (or gives up a round that would cost too many). On Hard your deck may have at most 180 total unit strength and 4 hero cards. Expert is the Hard AI with Hard decks, but your deck may have at most 130 total unit strength and 3 hero cards; the deck stats show these limits and turn red when exceeded. The choice is remembered.

Decks are saved per faction in your browser's `localStorage`, along with the last faction you used (separately for Player 2 in pass and play). Story mode keeps its own decks and collection (see [Story mode](#story-mode)).

Deck file format (`index` refers to the position of the card in `card_dict` in `cards.js`):

```json
{ "faction": "realms", "leader": 0, "cards": [[index, count], ...] }
```

Valid factions are `realms`, `nilfgaard`, `monsters`, `scoiatael` and `skellige`.

## Settings
The four toggle buttons are in the center column of the deck builder and in the top-left of the board during a match (next to the exit button). All settings are remembered between sessions.

| Setting | Notes |
| --- | --- |
| Music | Local MP3s in `sfx/music/` (128 kbps, from the official soundtracks, loudness-normalized to -18 LUFS so every track plays at the same volume; full-quality originals go in the ignored `sfx/music-src/`). Kaer Morhen plays in the menus. On the story map each chapter has its own theme (`music` in `campaign.js`), following the chapter you're looking at. Matches rotate the Gwent soundtrack, Drink Up, There's More! and The Nightingale; story bosses and some key opponents have their own themes (otherwise Silver for Monsters or Steel for Humans), the Beauclair tournament has For Honor! For Toussaint!, and Farewell, Old Friend plays over the credits. Tracks crossfade and only download the first time they play. If the browser blocks autoplay, music starts on your first click or key press. |
| Sound effects | Card placement, abilities, weather, round and match results, menu sounds. |
| Game messages | In-game notifications such as round start, pass and faction perks. |
| Visual effects | Particle bursts, screen shake, sunlight, score pulses and card flips. Also disabled automatically when the OS asks for reduced motion. |

During a match (and while waiting in an online room) the game asks the browser to keep the screen on, so phones don't dim or lock mid-game. Browsers that don't support it, or phones in battery saver, just time out as usual.

The **EN**/**ES** button on the title screen switches between English and Spanish (story dialogue included; card names stay in English).

## Project structure
| Path | Contents |
| --- | --- |
| `index.html` | Page markup, title screen, How to Play guide, story screen and script/style includes |
| `i18n.js` | Spanish translations (`t()`), loaded first; `translatePage()` translates the static markup |
| `gwent.js` | Game engine: board, rows, players, AI, pass and play, UI, deck builder, guide, settings, audio, music |
| `online.js` | Online play: lobby, PeerJS connection, move exchange, reconnects, turn timer |
| `campaign.js` | Story content: starter decks, places, chapters, opponents (decks, rules, objectives, rewards, dialogue in English and Spanish), tournaments |
| `story.js` | Story mode: save and collection (`StoryMode`), progression, rewards, shop, wagers, tournaments, and the map, side panel, dialogue and modals (`StoryUI`) |
| `portrait-frames.js` | Crop and zoom of card art used in round story portraits (`portraitFrames`) |
| `api/turn.js` | Vercel serverless function that mints Cloudflare TURN relay credentials (env `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`) |
| `lib/peerjs.min.js` | PeerJS 1.5.5 (MIT), loaded only when hosting or joining a room |
| `cards.js` | Card database (`card_dict`) |
| `decks.js` | Decks used by the AI, per difficulty (`ai_decks`) |
| `factions.js` | Faction perks |
| `abilities.js` | Card and leader abilities (`ability_dict`) |
| `fx.js` | Visual effects API (`fx.burst`, `fx.shake`, `fx.sunlight`, `fx.pulse`, `fx.flash`) |
| `common.js` | Shared helpers |
| `sw.js`, `manifest.webmanifest` | Service worker (offline cache) and web app manifest for installing |
| `css/` | Stylesheets: `tokens`, `base`, `board`, `cards`, `overlays`, `deckbuilder`, `title`, `fx`, `guide`, `story` |
| `img/` | Board, card art (`sm/`, `lg/`), icons, app icons (`app/`), guide screenshots (`guide/`) and the story map (`map/`) |
| `svg/` | UI button icons |
| `sfx/` | Sound effects (`card.animate(name)` plays `sfx/<name>.mp3`) and music (`sfx/music/`) |
| `tools/portrait-framer.html` | Editor for `portrait-frames.js` (not deployed) |
| `Start Gwent.bat` | Local server launcher for Windows |

## Development notes
- **No build tooling.** Edit the files and reload the page.
- **Sizing:** the stage is a letterboxed 16:9 box. `var(--u)` equals 1% of the stage width; use it instead of `vw`.
- **Board art:** row positions and score circles are baked into `img/board.jpg`. Restyle overlays freely, but don't move them.
- **Card transforms:** `gwent.js` sets an inline `transform` on cards while moving them, so card animations in CSS should use the standalone `translate` / `scale` / `rotate` properties.
- **Script order:** `i18n.js` loads first; `online.js`, `campaign.js`, `portrait-frames.js`, `story.js` and `fx.js` load after `gwent.js`, in that order. New shell files also go in the `SHELL_FILES` list in `sw.js`; bump its `VERSION` when replacing assets in place.
- **Online determinism:** online clients must make the same random choices in the same order. Game-state randomness uses the player's seeded `player.rng` (or `Online.rng` for the coin toss) and random picks from a container sort by `card.uid` first, because the two clients order hands, rows and graves differently. Player choices go through `Online.carousel` / `Online.rowChoice` / `Online.choice` so the opponent's client replays them.
- **Testing audio and music:** serve over http. `file://` can fail to load larger sound and music files.
- **Summons and resets:** `Game.reset()` empties the rows while the state can still be `PLAYING`, which fires `removed` callbacks. Abilities that put cards on the board from a `removed` callback must check `game.summonsAllowed()`.
- **Off-turn input:** `main.noclick` blocks play while it isn't your turn, but rows, weather, discard piles and leaders stay clickable for inspection. `ui.viewCardsInContainer(container)` without an action opens a view-only carousel that never changes `ui.enablePlayer`; anything that plays a card must check `ui.isInteractive()`.
- **Pacing:** card placement always waits `DURATION_CARD_PLACEMENT`, independent of the sound effects setting.
- **Story matches:** `game.story` holds the running story match. `Game.startGame` calls `StoryMode.applyModifiers` before setting up the players, and the end screen, exit and rematch hand off to `StoryMode` (`onGameEnd`, `finish`, `leaveMatch`). The deck builder reads and writes story decks through `StoryMode.deckStore` while `dm.story` is set.
- **Campaign data:** cards in `campaign.js` are `[card_dict index, count]`, and pins and fog reveals are percentages of the map image. Dialogue lines are `{who, en, es}`; `who` is `"opp"`, `"geralt"`, `"ciri"`, `"narrator"` (Dandelion) or `"chronicle"` (an in-world book quote with a `source`). Short labels such as names go through `t()`, so they need an `I18N.es` entry. Fixed rewards are never offered in random picks or the shop.
- **Story saves:** `StoryMode.sanitize()` rebuilds every loaded or imported save from known fields only. Add any new save field there, or it's dropped.
- **Story map art:** the game uses `img/map/continent-1280.jpg` and `continent-2560.jpg`, plus `continent-4096.jpg` when zoomed in on large desktop screens. The full-size source map is ignored by git and Vercel.
- **Story portraits:** round portraits (map pins, panel rows, tournament trophies) frame card art with `portraitFrames[name] = [x%, y%, zoom%]`. Open `tools/portrait-framer.html` over http to drag and zoom them and save the file.

## Credits
- Original project by [asundr](https://github.com/asundr/gwent-classic).
- Many sound effects come from [RandomPianist's gwent-classic-v3.1](https://github.com/RandomPianist/gwent-classic-v3.1).
- Gwent, The Witcher and all related art and music are property of CD PROJEKT RED. This is a non-commercial fan project.
- Music, avatars and the story map come from the official soundtracks and goodie pack of The Witcher 3: Wild Hunt (composers include Marcin Przybyłowicz and Mikolai Stroinski).

## License
Released under the license in [LICENSE](LICENSE), which includes the Commons Clause: the software may not be sold.
