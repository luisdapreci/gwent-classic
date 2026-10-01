# Gwent – Code Review

Review date: 2026-10-01. Scope: game logic, rules, AI, UI/UX, accessibility, performance, assets, tooling.
All findings were verified against the source. Line numbers refer to the commit `75a4aee`.

---

## 1. High-severity bugs

### 1.1 Deck import is broken whenever a warning exists
- [gwent.js](gwent.js#L2989) – parameter is named `siilent` but the body reads `silent`. Under `"use strict"` this throws a `ReferenceError`, which is caught by `uploadDeck` and shown as the misleading *"Uploaded deck is not formatted correctly!"*.
- [gwent.js](gwent.js#L3026) – `if (confirm("...Continue importing deck?")) return null;` is inverted: clicking **OK** aborts the import.
- [gwent.js](gwent.js#L3011) – `card_dict[c.index]` where `c` is an array; should be `card_dict[c[0]]`.
- `card_dict[deck.leader]` and `deck.cards.filter(...)` are accessed before validation; a bad `leader` index or a non-array `cards` crashes.
- Uploaded opponent decks are not checked for the 22-unit / 10-special rules.

**Fix:** rename the parameter, invert the confirm, fix the index, validate `leader` and `cards` shape up front.

### 1.2 `game.isPlaying()` is inverted
- [gwent.js](gwent.js#L1486-L1489) returns `this.state === GameState.END_SCREEN`.
- Used by Avenger tokens ([abilities.js](abilities.js#L245), [abilities.js](abilities.js#L258)) to remove the summoned token from the grave. Currently tokens stay in the grave mid-game and can be revived by Medic.

**Fix:** `return this.state === GameState.PLAYING;`

### 1.3 Grave click listeners and leader elements accumulate across games
- Each game creates new `Player` objects. The `Grave` constructor ([gwent.js](gwent.js#L824)) adds another click listener to the same static `#grave-me` / `#grave-op` element. After N games, clicking a grave queues N carousels.
- The `Player` constructor appends a new leader card element into `#leader-* > div` without removing the previous one.

**Fix:** reuse `Player` objects (reset with a new deck) or clear the containers / register listeners once.

### 1.4 Northern Realms draw crashes on an empty deck
- [factions.js](factions.js#L8) – `player.deck.draw(player.hand)` has no empty-deck check and is not awaited. `Deck.removeCard` throws on empty decks.

**Fix:** `if (player.deck.cards.length) await player.deck.draw(player.hand);`

### 1.5 Initial 10-card draw only works by accident
- [gwent.js](gwent.js#L1510) – the 10 draws run concurrently; every call reads `deck.cards[0]` synchronously, so the same card is animated 10 times. The other nine cards end up drawn from the bottom of the deck only because `indexOf` returns `-1` and `splice(-1, 1)` removes the last element.

**Fix:** draw sequentially, or snapshot `deck.cards.slice(0, 10)` and draw those specific cards.

---

## 2. Medium-severity issues

| Issue | Location | Fix |
|---|---|---|
| Player decoy calls `board.toHand(card, row)` without `await` – races with the decoy placement | [gwent.js](gwent.js#L2125) | `await` it (or `Promise.all` both moves) |
| AI decoy uses `setTimeout(() => board.toHand(...), 1000)` instead of awaiting | [gwent.js](gwent.js#L247) | Await the move after placement |
| Berserker weighting: `filter(c => "Transformed Young Vildkaarl")` is always truthy, counts every card | [gwent.js](gwent.js#L376) | `filter(c => c.name === "Transformed Young Vildkaarl")` |
| `SavedObject.set()` never updates `this.obj`; after `clear()`, `get()` returns `{}` until reload | [gwent.js](gwent.js#L3232) | Assign `this.obj = newObj` |
| `JSON.parse` of localStorage with no try/catch – corrupted storage prevents the game from loading | [gwent.js](gwent.js#L3215) | Wrap in try/catch, fall back to default |
| `EventManager.roundEnded` uses event id `'round-started'` (same as `roundStarted`) | [gwent.js](gwent.js#L3376) | Use `'round-ended'` |
| Every `Carousel` instance adds new `mouseout` listeners to the shared carousel elements | [gwent.js](gwent.js#L2432) | Register once in the static init block |
| `clearSelectable()` uses `for (card in this.cards)` – undeclared variable throws in strict mode (currently unused) | [gwent.js](gwent.js#L804) | `for (const card of this.cards)` or delete |
| Eredin Destroyer: AI draw not awaited; human discard action not awaited inside the carousel | [abilities.js](abilities.js#L375), [abilities.js](abilities.js#L379) | Add `await` |
| Crach an Craite: first grave reshuffle `Promise.all` not awaited | [abilities.js](abilities.js#L505) | Await both |
| `Start Gwent.bat` uses `goto :end` but has no `:end` label; no message if neither Python nor npx exists; `where python` may hit the Microsoft Store stub | [Start Gwent.bat](Start%20Gwent.bat) | Add `:end` label + fallback message; prefer `py` launcher |

---

## 3. Rules deviations (vs. Witcher 3 Gwent)

- **Muster** also pulls matching cards from the hand ([abilities.js](abilities.js#L129)); in W3 it pulls from the deck only.
- **King Bran** half-weather uses `Math.floor(total/2)` ([gwent.js](gwent.js#L1171)), so a 1-strength unit becomes 0. Use `Math.ceil` or `Math.max(1, ...)`.
- **Monsters** keeps a unit after the final round too, leaving it visible on the end screen.

---

## 4. AI opponent

Board convention for reference: `board.row[0..2]` are the AI's rows (siege, ranged, close), `board.row[3..5]` are the player's (close, ranged, siege). The AI's row indexing is correct.

Improvements ranked by impact:

1. **Pass logic** (`weightPass`) ignores round number, card advantage and whether the opponent has passed. It never voluntarily passes on its last life. Factor in hand-size difference and round count (e.g. pass early in round 1 when ahead on cards).
2. **Spies** get a flat `+15`; weight them higher when behind on cards or early in the game.
3. **Commander's Horn** weight is halved (`Math.max(...rows)/2`) without a clear reason.
4. **Redraw** only discards duplicate muster/weather and ability-less units; weak ability cards are never mulliganed.
5. **Carousel-driven choices** (random-respawn medic, some leader abilities) pick a random card on the AI's turn via `queueCarousel` instead of using `ControllerAI.medic()`-style scoring.

---

## 5. UX and accessibility

- No keyboard support: all interactive elements are `<div>`s without `tabindex`, `role`, `aria-*`, and there are no `:focus-visible` styles.
- `#notification-bar` should be an `aria-live` region; `#popup` should be `role="dialog"` with focus trapping.
- Native `alert()` / `confirm()` are used for deck validation instead of the in-game `Popup`.
- Inline handlers `onclick="Carousel.curr.shift(...)"` in [index.html](index.html#L175-L179) throw if `Carousel.curr` is null; use optional chaining or move to JS listeners.
- Tooltips (`data-title`) are hover-only.

Feature ideas:
- Game log / move history panel.
- Remaining-cards indicator per deck/grave breakdown.
- AI difficulty setting.
- Card zoom on right-click / long-press during play.

---

## 6. Performance and assets

| Folder | Files | Size | Largest |
|---|---|---|---|
| `img/lg` | 221 | 19.6 MB | 142 KB |
| `img/sm` | 216 | 8.4 MB | 97 KB |
| `img/icons` | 93 | 4.4 MB | 297 KB |
| `sfx` | 35 | 1.0 MB | 79 KB |

- The deck builder renders the card bank with **large** images (`largeURL` in `makePreview`), downloading several MB per faction. Use `img/sm` for the grid and load large art only in the preview.
- Convert card art to WebP/AVIF; compress oversized icons.
- SFX are not preloaded (`preload` not set), causing first-play latency.
- `translateTo` interleaves many `offsetLeft/Top` reads with style writes; batch reads before writes if many cards animate at once.

---

## 7. Code hygiene

- [style.css](style.css) (1354 lines) is not referenced by `index.html` – delete.
- `img/icons/card_weather_clearpng.png` is unused and misnamed.
- `AudioCycle` class is unused.
- `Row.calcCardScore` checks `card.name === "decoy"` (lowercase) – never matches.
- `Array.prototype.remove` in [common.js](common.js#L3) is enumerable and pollutes `for...in`; define via `Object.defineProperty` or use a helper.
- Many async calls are fire-and-forget (`game.endTurn()`, `passRound`, `startRound`), so rejections are silently lost. Add a global `unhandledrejection` logger at minimum.
- `Hand.addCard` with an explicit index leaves the cards array unsorted while the DOM is sorted ([gwent.js](gwent.js#L973)); index `0` is treated as "no index".
- `endRound` / `clearRound` wrap already-awaited values in `Promise.all([await a, await b])`, which runs them sequentially.
- Leftover TODOs: crown color (`enableLeader`), Skellige mardroeme AI, "propper game state" flag.

---

## 8. Suggested order of work

1. Deck import fixes (1.1)
2. `isPlaying()` (1.2)
3. Listener/element accumulation (1.3)
4. Empty-deck draw guard (1.4)
5. Sequential initial draw (1.5)
6. Medium table items
7. AI pass/spy weighting
8. Deck-builder image sizes
9. Accessibility pass

---

## 9. Resolution status

Fixed:
- **1.1 – 1.5** all fixed. Deck import now validates up front, merges duplicate entries, accepts numeric strings, and uses in-game popups. Imported player decks are saved. Opponent decks must be legal and match their leader's faction.
- **Section 2** all fixed. The launcher now prefers the `py` launcher, skips the Store alias, prints install hints and has an `:end` label.
- **Section 3:** Muster pulls from the deck only; King Bran rounds up; Monsters skips the final round.
- **Section 4 items 1–4:** pass logic uses card advantage and the opponent's pass state; spy weighting values the draws; horn weight is no longer halved; redraw falls back to weak non-key units.
- **Section 5:** focus-visible styles, keyboard activation (Enter/Space), carousel arrows/Enter/Esc, Esc cancels previews, popup is a focus-trapped `role="dialog"`, a `role="status"` live region announces game messages, tooltips show on focus, inline handlers removed, `alert`/`confirm` replaced, popup text is set via `textContent`.
- **Section 6:** deck builder art is lazy-loaded per scroll container; all SFX are preloaded; `translate()` reads layout before writing.
- **Section 7:** all items fixed; `style.css` and the misnamed icon removed.
- **Also found while testing:** `--card-back` URLs resolved against `css/`, causing a 404 on every frame of a card flip; now absolute. Focus left on board controls leaked a tooltip into the deck builder; focus is cleared on return.

Not changed:
- **4.5:** AI random picks via `queueCarousel` only happen for Emhyr Invader's random respawn, which is the intended rule.
- **Image format conversion / icon compression:** needs an image pipeline (no image tooling in the repo); left for a separate change.
- **Feature ideas** (game log, AI difficulty, zoom, remaining-card indicator) are new features, not fixes.
