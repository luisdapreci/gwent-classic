<div align="center">

<img src="img/app/icon-192.png" width="96" alt="Gwent Classic icon">

# Gwent Classic

**The Witcher 3 card game, rebuilt for the browser.**
<br>
A full story campaign, smart AI, online and pass-and-play matches, and the original soundtrack. Plain HTML, CSS and JavaScript with no build step.

<br>

[![Play now](https://img.shields.io/badge/%E2%96%B6%20Play%20now-witcher--gwent.vercel.app-c8a35a?style=for-the-badge&labelColor=1a1410)](https://witcher-gwent.vercel.app)

![Cards](https://img.shields.io/badge/cards-216-8b6f3e?style=flat-square&labelColor=1a1410)
![Leaders](https://img.shields.io/badge/leaders-22-8b6f3e?style=flat-square&labelColor=1a1410)
![Opponents](https://img.shields.io/badge/story%20opponents-42-8b6f3e?style=flat-square&labelColor=1a1410)
![Tracks](https://img.shields.io/badge/OST%20tracks-24-8b6f3e?style=flat-square&labelColor=1a1410)
![Languages](https://img.shields.io/badge/lang-EN%20%7C%20ES-8b6f3e?style=flat-square&labelColor=1a1410)
![PWA](https://img.shields.io/badge/PWA-installable-8b6f3e?style=flat-square&labelColor=1a1410)
![No build](https://img.shields.io/badge/build%20step-none-8b6f3e?style=flat-square&labelColor=1a1410)

<br>

<img src="img/guide/title.jpg" width="820" alt="Title screen">

<br>

<img src="img/icons/deck_shield_realms.png" height="56" alt="Northern Realms">&nbsp;&nbsp;
<img src="img/icons/deck_shield_nilfgaard.png" height="56" alt="Nilfgaard">&nbsp;&nbsp;
<img src="img/icons/deck_shield_monsters.png" height="56" alt="Monsters">&nbsp;&nbsp;
<img src="img/icons/deck_shield_scoiatael.png" height="56" alt="Scoia'tael">&nbsp;&nbsp;
<img src="img/icons/deck_shield_skellige.png" height="56" alt="Skellige">

</div>

---

## Contents

<table>
<tr>
<td valign="top">

**Play**
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick start](#-quick-start)
- [How to play](#-how-to-play)

</td>
<td valign="top">

**Modes**
- [Story mode](#-story-mode)
- [Vs AI](#-vs-ai)
- [Online](#-online)
- [Pass and play](#-pass-and-play)

</td>
<td valign="top">

**Reference**
- [Factions](#-factions)
- [Card abilities](#-card-abilities)
- [Deck building](#-deck-building)
- [Settings](#-settings)

</td>
<td valign="top">

**Project**
- [Architecture](#-architecture)
- [Development notes](#-development-notes)
- [Credits](#-credits)
- [License](#-license)

</td>
</tr>
</table>

---

## ✦ Features

<table>
<tr>
<td width="50%" valign="top">

### 🗺️ Story campaign
Follow Geralt across the Continent, from White Orchard to the Wild Hunt and on into *Hearts of Stone* and *Blood and Wine*. Narrated by Dandelion, with **42 opponents**, chapter bosses with their own rules, **3 tournaments**, a card collection, a shop, wagers and a guided tutorial.

</td>
<td width="50%" valign="top">

### 🃏 Every card
All **216 cards** and **22 leaders** from the base game, *Hearts of Stone*, *Blood and Wine* and the next-gen update, across five factions.

</td>
</tr>
<tr>
<td valign="top">

### 🤖 Four AI levels
Easy, Normal, Hard and Expert, each with its own deck pool. Hard plays for card advantage and plans the cheapest way to win a round.

</td>
<td valign="top">

### 🌐 Online and local
Peer-to-peer online matches with a room code or invite link, turn timers and deck rules, plus **pass-and-play** on one device with a privacy curtain between turns.

</td>
</tr>
<tr>
<td valign="top">

### 🎵 Official soundtrack
**24 tracks** from the TW3, *Hearts of Stone* and *Blood and Wine* soundtracks, loudness-normalized and crossfaded, with themes per chapter and per boss.

</td>
<td valign="top">

### 📱 Plays anywhere
Installable PWA with offline cache, 16:9 stage that scales to any screen, touch gestures, keyboard and screen-reader support, English and Spanish.

</td>
</tr>
</table>

---

## 🖼️ Screenshots

<table>
<tr>
<td align="center" width="50%"><img src="img/guide/board.jpg" alt="Match board"><br><sub><b>The board</b>: rows, weather, leaders and score</sub></td>
<td align="center" width="50%"><img src="img/guide/story.jpg" alt="Story map"><br><sub><b>Story map</b>: chapters, pins, fog and the journal</sub></td>
</tr>
<tr>
<td align="center"><img src="img/guide/deck.jpg" alt="Deck builder"><br><sub><b>Deck builder</b>: collection, deck and stats</sub></td>
<td align="center"><img src="img/guide/lobby.jpg" alt="Online lobby"><br><sub><b>Online lobby</b>: room codes, timers and deck rules</sub></td>
</tr>
<tr>
<td align="center"><img src="img/guide/redraw.jpg" alt="Redraw"><br><sub><b>Redraw</b>: swap up to 2 opening cards</sub></td>
<td align="center"><img src="img/guide/handoff.jpg" alt="Pass the device"><br><sub><b>Pass and play</b>: hand-off curtain</sub></td>
</tr>
</table>

---

## 🚀 Quick start

> [!TIP]
> The fastest way to play is the hosted version: **[witcher-gwent.vercel.app](https://witcher-gwent.vercel.app)**. On a phone, use **Install** on the title screen to add it as an app.

**Windows:** double-click **`Start Gwent.bat`**. It starts a local server at <http://127.0.0.1:8000/> and opens your browser. It uses Python (`py` or a real `python`, not the Microsoft Store shortcut) and falls back to Node.js (`npx http-server`). Close the server window to stop it.

**Any platform:**

```sh
python -m http.server 8000 --bind 127.0.0.1
# then open http://127.0.0.1:8000/
```

> [!NOTE]
> Opening `index.html` directly (`file://`) works, but some browsers then fail to load the music and larger sound effects. Use a local server.

Press <kbd>F11</kbd> for fullscreen. On phones the game goes fullscreen and landscape on the first tap.

---

## 📜 How to play

<img align="right" src="img/icons/icon_gem_on.png" width="48" alt="Gem">

**Win two of three rounds.** The higher total score when a round ends wins it. Each player has two gems and loses one per round lost.

| Step | What happens |
| :---: | --- |
| <img src="img/icons/coin.png" width="36" alt=""> | **Coin toss** decides who goes first (Scoia'tael may choose). Passive leaders are announced with a banner. |
| 🔄 | **Redraw** up to 2 cards from your opening hand of 10. |
| <img src="img/icons/notif_me_turn.png" width="44" alt=""> | **Your turn:** play one card, or click your **leader** to use its ability (once per match). |
| <img src="img/icons/notif_round_passed.png" width="44" alt=""> | **Pass:** *hold* the Pass button (a quick tap does nothing). Your opponent keeps playing until they pass too. |
| <img src="img/icons/notif_round_start.png" width="44" alt=""> | **Next round:** the board is cleared. You **don't draw** between rounds, so card advantage matters. |

Units go in **Close Combat** <img src="img/icons/card_row_close.png" height="18" alt="">, **Ranged** <img src="img/icons/card_row_ranged.png" height="18" alt=""> or **Siege** <img src="img/icons/card_row_siege.png" height="18" alt="">. Click a card, then a row. Rows, discard piles and leaders can be inspected at any time, even on your opponent's turn.

<details>
<summary><b>⌨️ Keyboard and accessibility</b></summary>

<br>

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | Move between cards, rows and buttons |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activate the focused element (Pass passes immediately) |
| <kbd>←</kbd> <kbd>→</kbd> | Browse card pickers |
| <kbd>Enter</kbd> | Select in a card picker |
| <kbd>Esc</kbd> | Close a picker or cancel a selected card |

Game messages are announced to screen readers, and visual effects turn off when the OS asks for reduced motion. The **?** button opens an illustrated How to Play guide.

</details>

---

## 🗺️ Story mode

A single-player campaign through *The Witcher 3*, told by **Dandelion**. Choose **Story** on the title screen. You start with a weak Northern Realms deck and an empty purse, and build a collection by beating the people (and monsters) Geralt met along the way. Your first match, against the White Orchard innkeeper, is a **guided tutorial** (replay it any time from **Options**).

```mermaid
flowchart LR
    P["🌳 Prologue<br/>White Orchard<br/><i>Vesemir</i>"] --> V1["👑 I · Vizima<br/><i>Emhyr</i>"]
    V1 --> V2["🌲 II · Velen<br/><i>The Crones</i>"]
    V2 --> N["🏙️ III · Novigrad<br/><i>Zoltan</i>"]
    N --> S["⚓ IV · Skellige<br/><i>Crach an Craite</i>"]
    S --> K["🏰 V · Kaer Morhen<br/><i>The Battle</i>"]
    K --> H["❄️ VI · Wild Hunt<br/><i>Eredin</i>"]
    H --> HoS["💀 Hearts of Stone"]
    H --> BaW["🍷 Blood and Wine"]
```

### Chapters

| | Chapter | Boss | Unlocks | Crowns per win |
| :---: | --- | --- | --- | :---: |
| 🌳 | **Prologue:** White Orchard | Vesemir | | 10 |
| 👑 | **I:** Vizima | Emhyr var Emreis | <img src="img/icons/deck_shield_nilfgaard.png" height="20" alt=""> Nilfgaard | 20 |
| 🌲 | **II:** Velen | The Crones | <img src="img/icons/deck_shield_monsters.png" height="20" alt=""> Monsters | 30 |
| 🏙️ | **III:** Novigrad & Oxenfurt | Zoltan Chivay | <img src="img/icons/deck_shield_scoiatael.png" height="20" alt=""> Scoia'tael, Passiflora tournament | 50 |
| ⚓ | **IV:** Skellige | Crach an Craite | <img src="img/icons/deck_shield_skellige.png" height="20" alt=""> Skellige, Kaer Trolde tournament | 70 |
| 🏰 | **V:** Kaer Morhen | Battle of Kaer Morhen | | 85 |
| ❄️ | **VI:** The Wild Hunt | Eredin Bréacc Glas | Credits, post-game chapters | 100 |
| 💀 | *Hearts of Stone* (post-game) | | A secret opponent | 100 |
| 🍷 | *Blood and Wine* (post-game) | | Beauclair tournament | 100 |

A boss appears once you've beaten the chapter's key opponents and enough of the others; beating it opens the next chapter. The Wild Hunt is linear: each general must fall before the next. Kaer Morhen's valley also hides three optional monster fights.

### The map

- **Pins** are opponents or places with several (number on the pin). Pulsing = ready, 👑 = boss, 🔒 = locked, ★ under a pin = stars earned.
- Unreached regions are covered in **fog**; a dotted route links the bosses you've opened.
- Zoom with the wheel, a pinch or **+**/**−**, and drag to pan. A sharper map loads when you zoom in on large screens.
- The side panel opens on the **Journal**: chapters, progress, stars, tavern rumors, open tournaments and **Replay Story**.
- The top bar shows your **crowns** and opens **Deck**, **Collection**, **Shop**, **Stats** and **Options**.

### Opponents, rules and stars

Each opponent shows their faction, AI level (Easy in White Orchard up to Expert for the final bosses), **special rules**, **objectives** and **reward**. Press **Challenge**; Dandelion tells how it went afterwards.

<details>
<summary><b>⚔️ Special rules</b></summary>

<br>

| Rule | Effect |
| --- | --- |
| Weather | A weather card is played at the start of some or every round |
| Ambush | Your opponent goes first |
| Extra draw | You (or both players) draw an extra card in round 1 |
| Informants | You discard a random card in round 1 |
| Leader blocked | Your leader is blocked for the whole match |
| Terms | Deck restrictions (e.g. no weather); **Challenge** stays disabled until your deck complies |
| Children of the Frost | The opponent's close combat row ignores Biting Frost |
| White Frost | Weather halves the strength of your heroes |
| Hero taken | One random hero is removed from your deck for the match |
| Hero limit | Only one hero per round |
| Scorch heroes | Scorch can destroy your heroes |
| Hero debt | Each hero you play makes you discard a random card |
| Hero feeds | Each hero you play gives the opponent's units +1 for the round |

</details>

**Stars:** ★ for winning plus ★★ for the opponent's two objectives:

<table>
<tr>
<td>Win 2–0</td><td>Win without using your leader</td><td>Win the final round by 20+</td>
</tr>
<tr>
<td>Finish with 3+ cards in hand</td><td>Win without playing weather</td><td>Win while going second</td>
</tr>
</table>

Earn all three and a **secret fourth star** appears: *win without playing a hero*. Collect all four stars on **every** opponent (side and secret ones included) to become a **Gwent Master**: every missing card is added to your collection, and a star badge appears next to your name in story, vs AI and online matches.

Losing costs nothing: adjust your deck and try again. Leaving a match early counts as a loss.

### Rewards and the collection

| | |
| --- | --- |
| 💰 **Crowns** | The chapter's rate per win. Bosses pay double the first time, rematches pay half, and each new star adds a quarter of the rate. |
| 🎴 **Cards** | Pick 1 of 3 after every win. First wins also give the opponent's fixed reward cards. Copies beyond a card's limit pay out half their shop price. |
| 🃏 **Deck** | The deck builder, limited to the cards and leaders you own; one deck per unlocked faction. |
| 📚 **Collection** | Every card by faction with owned/maximum copies. |
| 🛒 **Shop** | 8 cards from your factions plus neutral, special and weather cards; restocks every 3 matches. **20** plain units · **60** ability cards · **250** heroes. |
| 🎲 **Wagers** | On rematches and tournament rounds, stake 10, 25 or 50 crowns (win doubles) or a spare card (win to keep it and take one from the opponent's deck). |
| 📊 **Stats** | Wins, losses, streaks, crowns earned, tournaments won, stars and collection per faction. |

### Tournaments

| Tournament | Opens after | Entry | Per round | Champion |
| --- | --- | :---: | :---: | --- |
| 🌸 **Passiflora** (Novigrad) | Zoltan | 20 | 20 | +80 and a leader card |
| ⚓ **Kaer Trolde** (Skellige) | Crach | 50 | 50 | +200 and a leader card |
| 🍷 **Beauclair** (Toussaint) | Regis | 100 | 100 | +400 and a leader card |

Three single-elimination rounds against random entrants, each tougher than the last. The bracket is fixed when you enter, so a reload resumes the run. A draw replays the round; a loss ends the run. Once you own all of a tournament's leaders, the champion picks a hero instead.

### Saving

Progress saves automatically in `localStorage` (`gc-story`). **Options** exports the save as `gwent-story-save.json`, imports it on another device, or resets the campaign. Invalid saves are kept in `gc-story-backup` before a fresh one starts.

---

## 🤖 Vs AI

Choose **Local Play** on the title screen, keep **AI** under *Opponent*, and pick a difficulty.

| Level | Decks | Play style | Your deck cap |
| --- | --- | --- | --- |
| 🟢 **Easy** | Weak starter decks | Skips its redraw, often plays randomly | |
| 🟡 **Normal** | The classic premade decks | Weighs options with some randomness | |
| 🟠 **Hard** | Thin decks full of heroes, spies and medics | Takes free cards first, answers with the cheapest card that takes the lead, wins with the fewest cards | 180 strength, 4 heroes |
| 🔴 **Expert** | Hard decks | Hard AI | 130 strength, 3 heroes |

Pick your **avatar** by clicking your portrait on the board: 28 character portraits from the official goodie pack.

---

## 🌐 Online

1. Choose **Online** and enter a name.
2. The host picks a **turn timer** (none, 30, 60 or 90 s) and optional **deck rules** (Expert limits, No Heroes, No Neutrals, No Specials, No Weather), then presses **Create Room**.
3. Share the 5-character **room code**, or **Share Invite Link**.
4. The guest enters the code and presses **Join Room**. Both pick a deck and press **Ready**.

After the match: **Rematch** (both accept), **New Game** (back to the deck builder) or **Main Menu**. Dropped connections retry for 60 seconds, and reloading mid-match rejoins automatically.

<details>
<summary><b>🔧 How it works</b></summary>

<br>

```mermaid
sequenceDiagram
    participant H as Host browser
    participant P as PeerJS server
    participant G as Guest browser
    H->>P: register room code
    G->>P: look up room code
    P-->>G: host address
    G->>H: WebRTC data channel (direct, or via Cloudflare TURN)
    H->>G: shared random seed + decks
    loop every turn
        H->>G: moves only
        G->>H: moves only
        Note over H,G: both engines replay the same moves<br/>and compare a state checksum
    end
```

- Browsers connect directly with WebRTC via [PeerJS](https://peerjs.com/); its public server is only used to find each other.
- When a direct link isn't possible (strict NATs, mobile data), traffic goes through a **Cloudflare TURN** relay. `api/turn.js` (a Vercel function) hands out 6-hour credentials to the game's own site only.
- Both clients run the same game from a shared seed and exchange only their moves. If the checksums ever disagree, or a move breaks the rules, the match ends.

</details>

---

## 👥 Pass and play

<img align="right" src="img/guide/hotseat.jpg" width="360" alt="Pass and play setup">

Two players, one device.

1. **Local Play** → **Pass and Play** under *Opponent*.
2. Use **Editing: Player 1 / Player 2** to build each player's deck (saved separately).
3. Press **Start game**.

Player 1 plays the bottom half, Player 2 the top. A **Pass the device** curtain hides the board whenever control changes hands, so nobody sees the other's cards. Banners and the end screen name the player ("Player 2's turn").

<br clear="right">

---

## 🛡️ Factions

| | Faction | Perk |
| :---: | --- | --- |
| <img src="img/icons/deck_shield_realms.png" width="44" alt=""> | **Northern Realms** | Draw a card whenever you win a round. |
| <img src="img/icons/deck_shield_nilfgaard.png" width="44" alt=""> | **Nilfgaardian Empire** | Wins any round that ends in a draw. |
| <img src="img/icons/deck_shield_monsters.png" width="44" alt=""> | **Monsters** | Keeps a random unit on the board after each round. |
| <img src="img/icons/deck_shield_scoiatael.png" width="44" alt=""> | **Scoia'tael** | Decides who takes the first turn. |
| <img src="img/icons/deck_shield_skellige.png" width="44" alt=""> | **Skellige** | 2 random units from the graveyard return at the start of round 3. |

Each faction has several leaders. Most are used once per match by clicking the leader; a few are passive and work from the start. The White Flame blocks the opponent's leader.

---

## ✨ Card abilities

<table>
<tr>
<td align="center" width="64"><img src="img/icons/power_hero.png" width="44" alt=""></td>
<td><b>Hero</b><br><sub>Immune to weather, special cards and abilities.</sub></td>
<td align="center" width="64"><img src="img/icons/card_ability_agile.png" width="44" alt=""></td>
<td><b>Agile</b><br><sub>Close Combat or Ranged.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_medic.png" width="44" alt=""></td>
<td><b>Medic</b><br><sub>Revive a unit from your discard pile (not heroes).</sub></td>
<td align="center"><img src="img/icons/card_ability_morale.png" width="44" alt=""></td>
<td><b>Morale Boost</b><br><sub>+1 to every other unit in its row.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_muster.png" width="44" alt=""></td>
<td><b>Muster</b><br><sub>Summons all copies of the same card from your deck.</sub></td>
<td align="center"><img src="img/icons/card_ability_spy.png" width="44" alt=""></td>
<td><b>Spy</b><br><sub>Played on the opponent's side; you draw 2 cards.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_bond.png" width="44" alt=""></td>
<td><b>Tight Bond</b><br><sub>Strength multiplied by copies of the same card in its row.</sub></td>
<td align="center"><img src="img/icons/card_ability_scorch.png" width="44" alt=""></td>
<td><b>Scorch</b><br><sub>Destroys the strongest card(s) on the board, or in an enemy row.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_horn.png" width="44" alt=""></td>
<td><b>Commander's Horn</b><br><sub>Doubles the strength of a row (one per row).</sub></td>
<td align="center"><img src="img/icons/card_ability_decoy.png" width="44" alt=""></td>
<td><b>Decoy</b><br><sub>Swap with a unit to return it to your hand.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_berserker.png" width="44" alt=""></td>
<td><b>Berserker</b><br><sub>Transformed by Mardroeme into a stronger bear.</sub></td>
<td align="center"><img src="img/icons/card_ability_mardroeme.png" width="44" alt=""></td>
<td><b>Mardroeme</b><br><sub>Triggers Berserkers in its row.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_avenger.png" width="44" alt=""></td>
<td><b>Avenger</b><br><sub>Summons another card when removed from the board.</sub></td>
<td align="center"><img src="img/icons/card_ability_clear.png" width="44" alt=""></td>
<td><b>Clear Weather</b><br><sub>Removes all weather effects.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_frost.png" width="44" alt=""></td>
<td><b>Biting Frost</b><br><sub>Close Combat units drop to 1.</sub></td>
<td align="center"><img src="img/icons/card_ability_fog.png" width="44" alt=""></td>
<td><b>Impenetrable Fog</b><br><sub>Ranged units drop to 1.</sub></td>
</tr>
<tr>
<td align="center"><img src="img/icons/card_ability_rain.png" width="44" alt=""></td>
<td><b>Torrential Rain</b><br><sub>Siege units drop to 1.</sub></td>
<td align="center"><img src="img/icons/card_ability_storm.png" width="44" alt=""></td>
<td><b>Skellige Storm</b><br><sub>Fog and Rain together.</sub></td>
</tr>
</table>

---

## 🃏 Deck building

<img align="right" src="img/icons/deck_back_realms.jpg" width="110" alt="Card back">

Open the **Deck Builder** from the title screen.

- Pick a faction, then click cards in the collection (left) and deck (right) to move them.
- Click your leader to cycle through that faction's leaders.
- A deck needs **≥ 22 unit cards** and **≤ 10 special cards**; the stats column turns red when a limit is broken.
- Decks are saved per faction in `localStorage` (separately for Player 2). Story mode keeps its own decks and collection.

<details>
<summary><b>📄 Deck format</b></summary>

<br>

`index` is the card's position in `card_dict` (`cards.js`):

```json
{ "faction": "realms", "leader": 0, "cards": [[index, count], ...] }
```

Factions: `realms`, `nilfgaard`, `monsters`, `scoiatael`, `skellige`.

</details>

<br clear="right">

---

## ⚙️ Settings

The round buttons sit in the deck builder's center column and in the top-left corner of the board during a match. Everything is remembered between sessions.

| | Setting | Notes |
| :---: | --- | --- |
| <img src="svg/music.svg" width="22" alt=""> | **Music** | 24 official tracks, loudness-normalized to −18 LUFS and crossfaded. Kaer Morhen plays in menus; each story chapter and boss has its own theme; matches rotate *Gwent*, *Drink Up, There's More!* and *The Nightingale*. Tracks stream on first play. |
| <img src="svg/sfx.svg" width="22" alt=""> | **Sound effects** | Card placement, abilities, weather, results and menus. |
| <img src="svg/notification.svg" width="22" alt=""> | **Game messages** | Banners for coin toss, turns, passes, rounds and faction perks. |
| <img src="svg/effects.svg" width="22" alt=""> | **Visual effects** | Particle bursts, screen shake, sunlight, score pulses and card flips. Off automatically with reduced motion. |
| 🌍 | **EN / ES** | Title screen language switch (story dialogue included; card names stay in English). |

During a match the game keeps the screen awake on phones that support it.

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Data
        cards[cards.js<br/>card_dict]
        abilities[abilities.js<br/>ability_dict]
        factions[factions.js]
        decks[decks.js<br/>ai_decks]
        campaign[campaign.js<br/>chapters · opponents · dialogue]
    end
    subgraph Engine
        gwent[gwent.js<br/>Game · Board · Player · AI · UI · DeckMaker · music]
        fx[fx.js<br/>particles]
    end
    subgraph Modes
        story[story.js<br/>StoryMode · StoryUI]
        tutorial[tutorial.js]
        online[online.js<br/>lobby · lockstep]
    end
    i18n[i18n.js<br/>t · translatePage] --> gwent
    Data --> gwent
    gwent --> story
    gwent --> online
    story --> tutorial
    gwent --> fx
    online -. TURN creds .-> api[api/turn.js]
```

<details>
<summary><b>📁 Project structure</b></summary>

<br>

| Path | Contents |
| --- | --- |
| `index.html` | Markup: title screen, board, deck builder, guide, story screen, script/style includes |
| `i18n.js` | Spanish translations (`t()`, `translatePage()`), loaded first |
| `gwent.js` | Engine: board, rows, players, AI, pass and play, UI, deck builder, guide, settings, audio, music, avatars |
| `online.js` | Lobby, PeerJS connection, lockstep move exchange, reconnects, turn timer |
| `campaign.js` | Story data: starters, places, chapters, opponents, tournaments, dialogue (EN/ES) |
| `story.js` | `StoryMode` (save, collection, progression, rewards, shop, wagers, tournaments) and `StoryUI` (map, panel, dialogue, modals) |
| `tutorial.js` | `StoryTutorial`: the guided first story match |
| `portrait-frames.js` | Crop and zoom of card art for round story portraits |
| `cards.js` · `abilities.js` · `factions.js` · `decks.js` | Card database, abilities, faction perks, AI decks |
| `fx.js` | Visual effects (`fx.burst`, `fx.shake`, `fx.sunlight`, `fx.pulse`, `fx.flash`) |
| `common.js` | Shared helpers |
| `api/turn.js` | Vercel function minting Cloudflare TURN credentials (`CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`) |
| `lib/peerjs.min.js` | PeerJS 1.5.5 (MIT), lazy-loaded for online play |
| `sw.js` · `manifest.webmanifest` | Service worker (offline cache) and web app manifest |
| `css/` | `tokens`, `base`, `board`, `cards`, `overlays`, `deckbuilder`, `title`, `fx`, `guide`, `story` |
| `img/` | Board, card art (`sm/`, `lg/`), icons, avatars, app icons, guide screenshots, story map |
| `svg/` | UI button icons |
| `sfx/` | Sound effects and music (`sfx/music/`) |
| `tools/portrait-framer.html` | Visual editor for `portrait-frames.js` (not deployed) |
| `Start Gwent.bat` | Local server launcher for Windows |

</details>

---

## 🛠️ Development notes

> [!IMPORTANT]
> No build tooling: edit a file and reload. Serve over http when testing audio.

<details>
<summary><b>Conventions and gotchas</b></summary>

<br>

- **Sizing:** the stage is a letterboxed 16:9 box. `var(--u)` = 1% of stage width; use it instead of `vw`.
- **Board art:** row positions and score circles are baked into `img/board.jpg`. Restyle overlays, don't move them.
- **Card transforms:** `gwent.js` sets an inline `transform` while moving cards, so CSS animations on cards use standalone `translate` / `scale` / `rotate`.
- **Script order:** `i18n.js` first; `online.js`, `campaign.js`, `portrait-frames.js`, `story.js`, `tutorial.js` and `fx.js` after `gwent.js`. New shell files go in `sw.js`; bump its `VERSION` when replacing assets in place.
- **Async flows:** capture `game.session` before awaiting and bail if it changed, or a quit mid-turn leaks into the next game.
- **Online determinism:** game randomness uses the seeded `player.rng` (or `Online.rng` for the coin toss); random picks from containers sort by `card.uid` first. Player choices go through `Online.carousel` / `rowChoice` / `choice`.
- **Summons and resets:** abilities that put cards on the board from a `removed` callback must check `game.summonsAllowed()`.
- **Off-turn input:** rows, weather, graves and leaders stay inspectable while `main.noclick` is set; anything that plays a card must check `ui.isInteractive()`.
- **Story matches:** `Game.startGame` calls `StoryMode.applyModifiers` before setting up players; end screen, exit and rematch hand off to `StoryMode`.
- **Campaign data:** cards are `[card_dict index, count]`; pins and fog reveals are percentages of the map. Dialogue lines are `{who, en, es}` with `who` = `opp`, `geralt`, `ciri`, `narrator` (Dandelion) or `chronicle`.
- **Story saves:** `StoryMode.sanitize()` rebuilds saves from known fields only; add new fields there.
- **Music:** new tracks must be MPEG-1 Layer III (32/44.1/48 kHz) and normalized to −18 LUFS.

</details>

---

## 🙏 Credits

- Original project by [asundr](https://github.com/asundr/gwent-classic).
- Many sound effects from [RandomPianist's gwent-classic-v3.1](https://github.com/RandomPianist/gwent-classic-v3.1).
- Music, avatars and the story map from the official *The Witcher 3: Wild Hunt* soundtracks and goodie pack (composers include Marcin Przybyłowicz and Mikolai Stroinski).
- Gwent, The Witcher and all related art and music are property of **CD PROJEKT RED**. This is a non-commercial fan project.

## 📄 License

Released under the [LICENSE](LICENSE), which includes the **Commons Clause**: the software may not be sold.

<div align="center">

<br>

<img src="img/icons/notif_me_turn.png" width="120" alt="Wolf medallion">

<sub><i>"Wind's howling."</i></sub>

</div>
