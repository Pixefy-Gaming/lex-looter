# Lex Looter — Game Documentation

### Corner Crash | Bonus Pro Edition

---

## 1. Game Overview

**Lex Looter** is a bouncing-ball arena game. The player sends **Lex** — a pixelated adventurer — bouncing around an enclosed rectangular field. With every wall bounce, Lex accumulates a growing **tumble value**. The goal is to bank that value either by landing in a corner that shows a live multiplier, escaping via a ladder, or surviving until the bounce limit is reached.

---

## 2. Characters & Objects

| Asset                         | Name              | Role                                                                                                                       |
| ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `character (main).png`        | **Lex**           | The main ball. Bounces around the arena and accumulates tumble value.                                                      |
| `character (clone).png`       | **Clone**         | A duplicate of Lex spawned during the Start Clone Bonus or by collecting the Clone Orb. Has a limited lifespan of 15 hits. |
| `clone main character x1.png` | **Clone Orb**     | A green magic orb that spawns a Clone when collected.                                                                      |
| `escape (cashout).png`        | **Escape Ladder** | A wooden ladder. Collecting it immediately cashes out the current tumble value and ends the round.                         |
| `-50 balance.png`             | **Blue Blob**     | A cursed slime. Hitting it halves the current tumble value (−50%).                                                         |
| `slayer.png`                  | **Slayer**        | An armoured goblin warrior. Hitting it destroys the ball. If no balls remain, the round ends with a $0.00 payout.          |

---

## 3. Arena Layout

```
┌──────────────────────────────────────────┐
│ [TL corner]                  [TR corner] │
│                                          │
│      ·  Lex bounces freely here  ·       │
│        Objects spawn in this zone        │
│                                          │
│ [BL corner]                  [BR corner] │
└──────────────────────────────────────────┘
```

- The field is **800 × 500 px**.
- The four **corners** are 50 × 50 px zones. Each corner independently displays either `NONE` or a live multiplier (e.g. `3.4x`).
- Corner multipliers **re-randomise on every wall bounce** (see §6 for distribution details).
- A warm-up period of **5 bounces** keeps all corners at `NONE` to allow the tumble value to build.

---

## 4. The Tumble Value

The **tumble value** is the running prize pot accumulated during a round. It starts at **$0.00** and grows as follows:

| Event                           | Change to Tumble Value                       |
| ------------------------------- | -------------------------------------------- |
| Lex bounces off a wall          | **+$0.12**                                   |
| Clone bounces off a wall        | **+$0.08**                                   |
| Clone expires (15 hits reached) | **+$0.50** bonus on top of accumulated value |
| Blue Blob collected             | **× 0.50** (halved)                          |

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

| Object            | Spawn Conditions                                  | Effect on Collection                |
| ----------------- | ------------------------------------------------- | ----------------------------------- |
| **Slayer**        | Standard Mode and Start Clone Bonus               | Destroys the ball that touched it   |
| **Blue Blob**     | All modes                                         | Halves tumble value                 |
| **Escape Ladder** | Standard Mode only (disabled in both bonus modes) | Cashes out tumble value immediately |
| **Clone Orb**     | All modes                                         | Spawns a new Clone ball             |

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

| Element        | Location                 | Description                                                        |
| -------------- | ------------------------ | ------------------------------------------------------------------ |
| Balance        | Header — left            | Player's current wallet balance.                                   |
| Mode Label     | Header — right           | Displays `STANDARD MODE`, `NO BOOM BONUS`, or `START CLONE BONUS`. |
| Tumble Value   | Top-centre of arena      | Live running prize pot for the current round.                      |
| Bounce Counter | Below tumble value       | Format: `X / 40 STEALTH`. Only counts Lex's (main ball) bounces.   |
| Corner Labels  | Each corner of the arena | Shows `NONE` or a live multiplier (e.g. `7.2x`).                   |

---

## 10. Win Popup

At the end of every round a modal overlay displays:

- **YOU WON** (or **GAME OVER** for a $0.00 result)
- The effective multiplier: `payout ÷ bet`
- The cash payout amount
- A **CONTINUE** button that resets the arena for the next round

---

## 11. Controls

| Button               | Cost    | Action                                      |
| -------------------- | ------- | ------------------------------------------- |
| `BET $1.00`          | $1.00   | Starts a Standard Mode round                |
| `NO BOOM ($100)`     | $100.00 | Activates No Boom Bonus and auto-starts     |
| `START CLONE ($170)` | $170.00 | Activates Start Clone Bonus and auto-starts |

> The Bet button is **disabled during an active round** and re-enabled after CONTINUE is pressed.

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
