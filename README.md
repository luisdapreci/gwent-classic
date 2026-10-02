# Gwent Classic

The Gwent card game from *The Witcher 3: Wild Hunt*, rebuilt for the browser. It has every card from the base game, *Hearts of Stone*, *Blood and Wine* and the next-gen update, an AI opponent, online matches with a room code, pass-and-play matches on one device, a deck builder, and a refreshed UI with a title screen, visual effects and music that changes between menus and matches.

No install, no build step. It's plain HTML, CSS and JavaScript.

## Contents
- [Quick start](#quick-start)
- [How to play](#how-to-play)
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

1. **Start of match:** a coin toss decides who goes first (Scoia'tael players may choose). Each player then has the option to **redraw up to 2 cards** from their starting hand of 10.
2. **Turns:** on your turn, play one card or use your **leader ability** (once per match) by clicking your leader.
3. **Passing:** pass when you're done for the round. Your opponent keeps playing until they pass too.
4. **End of round:** once both players have passed, scores are compared, the board is cleared to the discard piles, and the next round begins. You **do not draw** between rounds, so card advantage matters.

Units go in one of three rows: **Close Combat**, **Ranged** or **Siege**. Click a card in your hand to select it, then click a row to play it. Click a card or row on the board to inspect it.

**Keyboard:** <kbd>Tab</kbd> moves between cards, rows and buttons; <kbd>Enter</kbd> or <kbd>Space</kbd> activates the focused one. In card pickers, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> browse, <kbd>Enter</kbd> selects and <kbd>Esc</kbd> closes. <kbd>Esc</kbd> also cancels a selected card. Game messages are announced to screen readers.

## Online play
Play someone on another device. Both players need an internet connection.

1. On the title screen choose **Play Online** and enter a name (up to 16 characters; it's remembered for next time).
2. One player picks a **turn timer** (none, 30, 60 or 90 seconds) and presses **Create Room**. Share the 5-character room code, or press **Copy Invite Link** and send the link (it opens the game with the code filled in).
3. The other player enters the code and presses **Join Room**.
4. Both players pick a deck in the deck builder and press **Ready**. The match starts when both are ready.

During the match you only see your own hand. A countdown appears next to the player whose move it is when a timer is set; if it runs out on your turn you pass the round, and an unanswered card choice (redraw, medic, leader picks) is skipped or takes the card on show. After the match, **Rematch** (both players must accept) keeps the decks, **New Game** sends both players back to the deck builder, and **Main Menu** leaves the room. Leaving a match early counts as a forfeit.

If the connection drops, the game tries to reconnect for 60 seconds. Reloading the page during a match rejoins it automatically (in the same tab). If the opponent doesn't come back in time, you win.

How it works: the two browsers connect directly with WebRTC through [PeerJS](https://peerjs.com/) (its free public server is only used to find each other). Both run the same game from a shared random seed and only send each other their moves, and each turn they compare a checksum of the game state; if the games ever disagree, or a move breaks the rules, the match ends. Some strict networks (corporate firewalls, some mobile carriers) can block the connection.

## Pass and play
Two people can play each other on the same device, passing it between turns.

1. On the title screen choose **Pass and Play**, or pick **Pass and Play** under *Opponent* in the deck builder.
2. Each player builds their own deck. Use the **Editing: Player 1 / Player 2** switch under *Opponent* to choose whose deck the builder shows; faction, leader, card changes, **Upload Deck** and **Download Deck** all apply to that player. Player 2's decks are saved separately from Player 1's, one per faction.
3. Press **Start game**. Both decks must be legal (22+ units, at most 10 specials).

Player 1 plays the bottom half of the board and Player 2 the top half. The hand tray at the bottom only ever shows the hand of the player whose turn it is. Whenever control changes hands, a **Pass the device** screen hides the board until the next player presses **Ready**, so neither player sees the other's cards. This also happens for each player's opening redraw. If one player has passed, the other keeps playing without the handoff screen.

Banners, the end screen and screen reader messages name the player ("Player 2's turn", "Player 1 wins!") instead of saying "you" and "opponent". Leader abilities, faction perks (such as the Scoia'tael choice of who goes first) and card choices work the same for both players. **Rematch** keeps both decks; **New Game** gives Player 2 a random premade deck. **Quit match** on the handoff screen, or the exit button, returns to the deck builder.

## Factions
Your faction determines which unit cards and leaders you can use (neutral and special cards are available to all) and gives you a passive perk.

| Faction | Perk |
| --- | --- |
| Northern Realms | Draw a card from your deck whenever you win a round. |
| Nilfgaardian Empire | Wins any round that ends in a draw. |
| Monsters | Keeps a random unit card on the board after each round. |
| Scoia'tael | Decides who takes the first turn. |
| Skellige | 2 random units from the graveyard return to the battlefield at the start of round 3. |

Each faction has several leaders, each with its own ability.

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
| Berserker / Mardroeme | Mardroeme transforms Berserkers into a stronger bear form. |
| Avenger | Summons another card when removed from the battlefield. |
| Biting Frost / Impenetrable Fog / Torrential Rain | Sets all Close Combat / Ranged / Siege units to 1 strength for both players. |
| Skellige Storm | Applies both Fog and Rain. |
| Clear Weather | Removes all weather effects. |

## Deck building
Open the **Deck Builder** from the title screen.

- Choose a faction at the top, then click cards in the left (collection) and right (deck) lists to add or remove them.
- Click your leader to cycle through the leaders available for that faction.
- A deck needs **at least 22 unit cards** and **no more than 10 special cards**. The stats column shows your counts.
- **Download** saves your deck as `GwentDeck.json`. **Upload** loads one, checking the faction, leader, card IDs and copy limits; you can choose to import anyway if only some entries are invalid.
- **Opponent:** choose **AI** or **Pass and Play** (see [Pass and play](#pass-and-play)). The choice is remembered.
- **AI difficulty:** pick **Easy**, **Normal**, **Hard** or **Expert** under *Opponent* (shown when playing the AI). Each difficulty has its own pool of decks, one or more per faction, each with a set leader: Easy brings weak starter decks, Normal the classic premade decks, and Hard thin decks full of heroes, spies, medics and the strongest leaders. Easy also skips its redraw and often makes random plays; Normal weighs its options with some randomness; Hard plays for card advantage: it takes free cards first (spies, decoyed spies, Avengers), answers with its cheapest card that takes the lead, passes once ahead in rounds it can afford to lose, and once you've passed it wins with the fewest cards (or gives up a round that would cost too many). Expert is the Hard AI with Hard decks, but your deck may have at most 120 total unit strength and 4 hero cards; the deck stats show both limits and turn red when exceeded. The choice is remembered.

Decks are saved per faction in your browser's `localStorage`, along with the last faction you used (separately for Player 2 in pass and play).

Deck file format (`index` refers to the position of the card in `card_dict` in `cards.js`):

```json
{ "faction": "realms", "leader": 0, "cards": [[index, count], ...] }
```

Valid factions are `realms`, `nilfgaard`, `monsters`, `scoiatael` and `skellige`.

## Settings
The four toggle buttons are in the center column of the deck builder and in the top-left of the board during a match (next to the exit button). All settings are remembered between sessions.

| Setting | Notes |
| --- | --- |
| Music | Local MP3s in `sfx/music/`. The Kaer Morhen theme plays in the menus and the Gwent soundtrack plays in matches, with a crossfade between them. If the browser blocks autoplay, music starts on your first click or key press. |
| Sound effects | Card placement, abilities, weather, round and match results, menu sounds. |
| Game messages | In-game notifications such as round start, pass and faction perks. |
| Visual effects | Particle bursts, screen shake, sunlight, score pulses and card flips. Also disabled automatically when the OS asks for reduced motion. |

## Project structure
| Path | Contents |
| --- | --- |
| `index.html` | Page markup, title screen and script/style includes |
| `gwent.js` | Game engine: board, rows, players, AI, pass and play, UI, deck builder, settings, audio, music |
| `online.js` | Online play: lobby, PeerJS connection, move exchange, reconnects, turn timer |
| `lib/peerjs.min.js` | PeerJS 1.5.5 (MIT), loaded only when hosting or joining a room |
| `cards.js` | Card database (`card_dict`) |
| `decks.js` | Premade decks used by the AI |
| `factions.js` | Faction perks |
| `abilities.js` | Card and leader abilities (`ability_dict`) |
| `fx.js` | Visual effects API (`fx.burst`, `fx.shake`, `fx.sunlight`, `fx.pulse`, `fx.flash`) |
| `common.js` | Shared helpers |
| `css/` | Stylesheets: `tokens`, `base`, `board`, `cards`, `overlays`, `deckbuilder`, `title`, `fx` |
| `img/` | Board, card art (`sm/`, `lg/`) and icons |
| `svg/` | UI button icons |
| `sfx/` | Sound effects (`card.animate(name)` plays `sfx/<name>.mp3`) |
| `Start Gwent.bat` | Local server launcher for Windows |

## Development notes
- **No build tooling.** Edit the files and reload the page.
- **Sizing:** the stage is a letterboxed 16:9 box. `var(--u)` equals 1% of the stage width; use it instead of `vw`.
- **Board art:** row positions and score circles are baked into `img/board.jpg`. Restyle overlays freely, but don't move them.
- **Card transforms:** `gwent.js` sets an inline `transform` on cards while moving them, so card animations in CSS should use the standalone `translate` / `scale` / `rotate` properties.
- **Script order:** `online.js` and `fx.js` load after `gwent.js`.
- **Online determinism:** online clients must make the same random choices in the same order. Game-state randomness uses the player's seeded `player.rng` (or `Online.rng` for the coin toss) and random picks from a container sort by `card.uid` first, because the two clients order hands, rows and graves differently. Player choices go through `Online.carousel` / `Online.rowChoice` / `Online.choice` so the opponent's client replays them.
- **Testing audio and music:** serve over http. `file://` can fail to load larger sound and music files.

## Credits
- Original project by [asundr](https://github.com/asundr/gwent-classic).
- Many sound effects come from [RandomPianist's gwent-classic-v3.1](https://github.com/RandomPianist/gwent-classic-v3.1).
- Gwent, The Witcher and all related art and music are property of CD PROJEKT RED. This is a non-commercial fan project.

## License
Released under the license in [LICENSE](LICENSE), which includes the Commons Clause: the software may not be sold.
