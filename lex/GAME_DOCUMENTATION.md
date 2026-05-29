# Lex Looter — Game Documentation

### Corner Crash | Bonus Pro Edition

---

## 1. Game Overview

**Lex Looter** is a bouncing-ball arena game. The player sends **Lex** — a pixelated adventurer — bouncing around an enclosed rectangular field. With every wall bounce, Lex accumulates a growing **tumble value**. The goal is to bank that value either by landing in a corner that shows a live multiplier, escaping via a ladder, or surviving until the bounce limit is reached.

---

## 2. Characters & Objects

| Asset                         | Name              | Role                                                                                                                                       |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `character (main).png`        | **Lex**           | The main ball. A bald adventurer with a glowing green eye and white outfit. Bounces around the arena and accumulates tumble value.         |
| `character (clone).png`       | **Clone**         | A green humanoid duplicate of Lex, spawned during the Start Clone Bonus or by collecting the Clone Orb. Has a limited lifespan of 15 hits. |
| `clone main character x1.png` | **Clone Orb**     | A green shamrock/clover. Collecting it spawns a Clone ball.                                                                                |
| `escape (cashout).png`        | **Escape Ladder** | A wooden ladder descending into darkness. Collecting it immediately cashes out the current tumble value and ends the round.                |
| `-50 balance.png`             | **Blue Blob**     | A cursed glowing slime. Hitting it removes 50% of the current tumble value.                                                                |
| `slayer.png`                  | **Slayer**        | A red samurai warrior wielding a katana. Hitting it destroys the ball. If no balls remain, the round ends with a $0.00 payout.             |
| _(gold coin)_                 | **Gold Coin**     | A shining pixel-art coin. Collecting it adds **+$0.50 of the current bet** to the tumble value.                                            |
| _(green gem)_                 | **Green Gem**     | A large green diamond/gemstone. Collecting it multiplies the current bet by **×5** and adds it to the tumble value.                        |
| _(red heart)_                 | **Red Heart**     | A pixel-art heart. Collecting it grants a one-time shield against the next Slayer hit.                                                     |
| `chest.png`                   | **Mystery Chest** | A treasure chest that spawns randomly. Collecting it applies a random multiplier (**x0.1 – x10,000**) to the current tumble value.         |

---

## 3. Arena Layout

```
┌─────────────────────────────────────────────────┐
│ [chest x2 — TL]               [chest x2 — TR]  │
│                                                 │
│      ·  Lex bounces freely here  ·              │
│        Objects spawn in this zone               │
│                                                 │
│ [chest x0.2 — BL]             [chest x2 — BR]  │
└─────────────────────────────────────────────────┘
```

- The arena is set inside a **Japanese dojo** (tatami-tiled floor, shoji screen walls, tiled rooftop border).
- The field is **800 × 500 px**.
- The four **corners** are represented as **treasure chests** embedded in the arena walls. Each chest displays a multiplier badge — green for favourable values (e.g. `x2`), pink/red for low values (e.g. `x0.2`).
- Corner multipliers **re-randomise on every wall bounce** (see §6 for distribution details).
- A warm-up period of **5 bounces** keeps all corners inactive to allow the tumble value to build.
- The **Lex Looter logo** is displayed prominently at the top-centre of the arena, flanked by the tumble value and bounce counter.

---

## 4. The Tumble Value

The **tumble value** is the running prize pot accumulated during a round. It starts at **$0.00** and grows as follows:

| Event                           | Change to Tumble Value                       |
| ------------------------------- | -------------------------------------------- |
| Lex bounces off a wall          | **+$0.12**                                   |
| Clone bounces off a wall        | **+$0.08**                                   |
| Clone expires (15 hits reached) | **+$0.50** bonus on top of accumulated value |
| Blue Blob collected             | **−50%** of tumble value                     |

The tumble value is displayed live at the top-centre of the arena alongside the bounce counter.

---

## 5. Winning & Ending a Round

A round ends in one of four ways:

### 5a. Corner Hit (Multiplier Active)

When Lex enters a corner zone that shows a live multiplier, the round ends immediately with a win:

$$\text{Payout} = \text{Tumble Value} \times \text{Corner Multiplier}$$

### 5b. Escape Ladder Collected

Lex picks up the Escape Ladder object. The current tumble value is paid out in full (effective multiplier = tumble value ÷ bet).

### 5c. Bounce Limit Reached (40 Bounces — "STEALTH")

If Lex reaches **40 wall bounces** without a corner hit or ladder collection, the round ends and the accumulated tumble value is paid out automatically.  
_The bounce counter displays as `X / 40 STEALTH`._

### 5d. Slayer Destroys All Balls

If a Slayer eliminates every active ball and no balls remain, the round ends with a **$0.00 payout**.

> **Note:** The Clone ball expiring on its own does **not** end the game — the main Lex ball continues. The game only ends when the Slayer kills Lex (or the clone in clone-only scenarios).

---

## 6. Corner Multiplier Distributions

Corners re-randomise every bounce. Distributions differ between Standard Mode and Bonus Modes.

### Standard Mode

| Outcome         | Probability | Value Range  | Colour |
| --------------- | ----------- | ------------ | ------ |
| NONE            | 75%         | —            | —      |
| Low multiplier  | 17%         | 0.1x – 1.0x  | Red    |
| High multiplier | 8%          | 2.0x – 12.0x | Green  |

### Bonus Modes (No Boom & Start Clone)

| Outcome         | Probability | Value Range  | Colour |
| --------------- | ----------- | ------------ | ------ |
| NONE            | 70%         | —            | —      |
| Mid multiplier  | 20%         | 2.0x – 4.0x  | Green  |
| High multiplier | 10%         | 5.0x – 20.0x | Gold   |

---

## 7. Spawnable Objects

Up to **3 objects** can exist on the field at any one time. Each game loop tick has a ~1.2% chance of spawning a new object. Objects are placed randomly in the central region of the arena (avoiding the outermost 100 px border). The ball must come within **35 px** of an object's centre to collect it.

| Object            | Spawn Conditions                                  | Effect on Collection                                                     |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| **Slayer**        | Standard Mode and Start Clone Bonus               | Destroys the ball that touched it                                        |
| **Blue Blob**     | All modes                                         | −50% of tumble value                                                     |
| **Escape Ladder** | Standard Mode only (disabled in both bonus modes) | Cashes out tumble value immediately                                      |
| **Clone Orb**     | All modes                                         | Spawns a new Clone ball                                                  |
| Gold Coin         | All modes                                         | Adds +$0.50 of the current bet to tumble value                           |
| Green Gem         | All modes                                         | Adds ×5 of the current bet to tumble value                               |
| **Red Heart**     | All modes                                         | Grants a one-time shield against the next Slayer hit                     |
| **Mystery Chest** | All modes                                         | Applies a random multiplier (x0.1 – x10,000) to the current tumble value |

> The Escape Ladder is intentionally **disabled in both paid bonus modes** since those modes offer enhanced multiplier distributions, making an early cashout less desirable from a design perspective.

---

## 8. Game Modes

### 8a. Standard Mode — `BET $1.00`

- **Cost:** $1.00 per round (deducted on start).
- One Lex ball spawns at the centre.
- All four object types can spawn.
- Corner multipliers follow the Standard distribution (§6).
- Bounce limit: 40.

---

### 8b. No Boom Bonus — `NO BOOM ($100)`

- **Cost:** $100 (flat buy-in, deducted immediately).
- Activates **Bonus Mode** corner distributions (higher multipliers).
- The **Slayer object is suppressed** — it will never spawn during this round.
- The **Escape Ladder is also suppressed** — no early cashout via ladder.
- The Blue Blob and Clone Orb can still spawn.
- One Lex ball spawns; gameplay otherwise identical to Standard Mode.

---

### 8c. Start Clone Bonus — `START CLONE ($170)`

- **Cost:** $170 (flat buy-in, deducted immediately).
- Activates **Bonus Mode** corner distributions (higher multipliers).
- Both **Lex (main)** and a **Clone** ball spawn simultaneously at the start.
- The Clone has 15 hits before expiring (+$0.50 bonus when it does).
- Slayer **can** spawn (unlike No Boom).
- The **Escape Ladder is suppressed** — no early cashout via ladder.
- The round continues until all balls are eliminated or Lex hits a live corner.

---

## 9. HUD Reference

| Element        | Location                        | Description                                                                          |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| Tumble Value   | Top-centre, above arena         | Large dollar display showing the live running prize pot (e.g. `$0.15`).              |
| Bounce Counter | Below tumble value, inside pill | Format: `X/40 Stealth`. Green pill badge. Only counts Lex's (main ball) bounces.     |
| Game Logo      | Top-left of arena               | **LEX LOOTER** logo with Lex and Clone character heads flanking it.                  |
| Corner Chests  | Each corner of the arena        | Treasure chests showing a multiplier badge — green (favourable) or pink (low value). |
| PLAY Button    | Bottom-centre, below arena      | Green button to start a round. Disabled during an active round.                      |
| Bet Controls   | Bottom bar — centre             | `-` / `+` buttons with the current bet amount displayed (e.g. `BET $1.00`).          |
| Balance        | Bottom bar — right              | Displays `BALANCE $XX.XX`.                                                           |
| Binance Button | Bottom bar — far left           | Green Binance logo button (platform integration).                                    |
| Auto Button    | Bottom bar — left of bet        | Circular refresh icon; toggles auto-play mode.                                       |
| Turbo Button   | Bottom bar — right of bet       | Lightning bolt icon; toggles turbo/fast-forward mode.                                |

---

## 10. Win Popup

At the end of every round a modal overlay displays:

- **YOU WON** (or **GAME OVER** for a $0.00 result)
- The effective multiplier: `payout ÷ bet`
- The cash payout amount
- A **CONTINUE** button that resets the arena for the next round

---

## 11. Controls

| Control              | Type          | Action                                                       |
| -------------------- | ------------- | ------------------------------------------------------------ |
| **PLAY**             | Green button  | Starts a Standard Mode round at the current bet amount       |
| **`−` / `+`**        | Bet controls  | Decreases / increases the bet amount                         |
| **Auto**             | Toggle button | Enables auto-play; rounds run continuously until toggled off |
| **Turbo**            | Toggle button | Speeds up ball movement for faster rounds                    |
| **Binance**          | Icon button   | Opens platform/wallet integration (Binance)                  |
| `NO BOOM ($100)`     | Bonus buy     | Activates No Boom Bonus and auto-starts a round              |
| `START CLONE ($170)` | Bonus buy     | Activates Start Clone Bonus and auto-starts with two balls   |

> The **PLAY** button is disabled during an active round and re-enabled when the round ends.

---

## 12. Audio Cues

| Sound     | Trigger                                               |
| --------- | ----------------------------------------------------- |
| `bounce`  | Lex or Clone hits a wall; Blue Blob collected         |
| `win`     | Corner hit with a multiplier; Escape Ladder collected |
| `boom`    | Slayer destroys a ball                                |
| `collect` | Clone Orb collected (spawns Clone)                    |

---

## 13. Responsive Scaling

The game canvas scales uniformly to fit smaller screens. The scale factor is computed as:

$$\text{scale} = \min\left(1,\ \frac{\text{viewport width} - 20}{800}\right)$$

The arena always renders at the native 800 × 500 internal resolution; only the visual presentation is scaled.
