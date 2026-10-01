# Gwent Classic

The Gwent card game from *The Witcher 3: Wild Hunt*, rebuilt for the browser. It has every card from the base game, *Hearts of Stone*, *Blood and Wine* and the next-gen update, an AI opponent, a deck builder, and a refreshed UI with a title screen, visual effects and music that changes between menus and matches.

No install, no build step. It's plain HTML, CSS and JavaScript.

## Contents
- [Quick start](#quick-start)
- [How to play](#how-to-play)
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

> Opening `index.html` directly (`file://`) runs the game, but YouTube music won't play and some browsers fail to load the larger sound effects. Use a local server for the full experience.

Press **F11** for fullscreen. The board keeps a 16:9 aspect ratio and scales to any window size.

## How to play
Win **two of three rounds**. The player with the higher total score when a round ends wins it. Each player has two gems, and a gem is lost for every round lost.

1. **Start of match:** a coin toss decides who goes first (Scoia'tael players may choose). Each player then has the option to **redraw up to 2 cards** from their starting hand of 10.
2. **Turns:** on your turn, play one card or use your **leader ability** (once per match) by clicking your leader.
3. **Passing:** pass when you're done for the round. Your opponent keeps playing until they pass too.
4. **End of round:** once both players have passed, scores are compared, the board is cleared to the discard piles, and the next round begins. You **do not draw** between rounds, so card advantage matters.

Units go in one of three rows: **Close Combat**, **Ranged** or **Siege**. Click a card in your hand to select it, then click a row to play it. Click a card or row on the board to inspect it.

**Keyboard:** <kbd>Tab</kbd> moves between cards, rows and buttons; <kbd>Enter</kbd> or <kbd>Space</kbd> activates the focused one. In card pickers, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> browse, <kbd>Enter</kbd> selects and <kbd>Esc</kbd> closes. <kbd>Esc</kbd> also cancels a selected card. Game messages are announced to screen readers.

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
- **Opponent's deck:** upload a deck for the AI to use instead of a random premade one. It must be a legal deck (22+ units, at most 10 specials). You can view or clear it from the same panel.

Decks are saved per faction in your browser's `localStorage`, along with the last faction you used.

Deck file format (`index` refers to the position of the card in `card_dict` in `cards.js`):

```json
{ "faction": "realms", "leader": 0, "cards": [[index, count], ...] }
```

Valid factions are `realms`, `nilfgaard`, `monsters`, `scoiatael` and `skellige`.

## Settings
The four toggle buttons are in the center column of the deck builder and in the top-left of the board during a match (next to the exit button). All settings are remembered between sessions.

| Setting | Notes |
| --- | --- |
| Music | Streamed from YouTube. The Kaer Morhen theme plays in the menus and the Gwent soundtrack plays in matches, with a crossfade between them. If the browser blocks autoplay, music starts on your first click or key press. |
| Sound effects | Card placement, abilities, weather, round and match results, menu sounds. |
| Game messages | In-game notifications such as round start, pass and faction perks. |
| Visual effects | Particle bursts, screen shake, sunlight, score pulses and card flips. Also disabled automatically when the OS asks for reduced motion. |

## Project structure
| Path | Contents |
| --- | --- |
| `index.html` | Page markup, title screen and script/style includes |
| `gwent.js` | Game engine: board, rows, players, AI, UI, deck builder, settings, audio, music |
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
- **Script order:** `fx.js` loads after `gwent.js`, and the YouTube IFrame API loads last.
- **Testing audio and music:** serve over http. `file://` blocks YouTube embeds and can fail to load larger sound files.

## Credits
- Original project by [asundr](https://github.com/asundr/gwent-classic).
- Many sound effects come from [RandomPianist's gwent-classic-v3.1](https://github.com/RandomPianist/gwent-classic-v3.1).
- Gwent, The Witcher and all related art and music are property of CD PROJEKT RED. This is a non-commercial fan project.

## License
Released under the license in [LICENSE](LICENSE), which includes the Commons Clause: the software may not be sold.
