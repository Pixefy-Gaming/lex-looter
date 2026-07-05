chest = [
    {"multiplier": 0.1,     "weight": 300},
    {"multiplier": 0.5,     "weight": 240},
    {"multiplier": 1.0,     "weight": 180},
    {"multiplier": 2.0,     "weight": 120},
    {"multiplier": 5.0,     "weight": 80},
    {"multiplier": 10.0,    "weight": 40},
    {"multiplier": 25.0,    "weight": 20},
    {"multiplier": 50.0,    "weight": 10},
    {"multiplier": 100.0,   "weight": 5},
    {"multiplier": 250.0,   "weight": 3},
    {"multiplier": 500.0,   "weight": 1},
    {"multiplier": 1000.0,  "weight": 1},
    {"multiplier": 5000.0,  "weight": 1},
    {"multiplier": 10000.0, "weight": 1},
]

# ---------------------------------------------------------------------------
# Spawn tables — Method 3 (bounce-gated) + Method 4 (per-mode)
#
# Each mode has 3 bounce phases. The game picks the active phase based on
# the current bounce count, then does a weighted draw from that phase.
# Weight 0 = never spawns.
#
# Modes:
#   base        — Standard game
#   no_slayer   — Slayer never spawns (safer bonus)
#   start_clone — Slayer can spawn, starts with 1 clone ball
#   lucky_lex   — Slayer can spawn, starts with 1 clone + tumble multiplier x5
# ---------------------------------------------------------------------------

spawn_tables = {

    "base": {
        "phase_1": {  # bounce 0–9  (early — safe, build tumble value)
            "from_bounce": 0,
            "coin":      200,
            "diamond":   150,
            "clone_orb":  35,
            "heart":      30,
            "blue_blob": 100,
            "escape":    80,
            "chest":     0,    # not yet
            "slayer":    0,    # not yet
        },
        "phase_2": {  # bounce 10–24  (mid — chest introduced)
            "from_bounce": 10,
            "coin":      180,
            "diamond":   130,
            "clone_orb":  45,
            "heart":      40,
            "blue_blob": 100,
            "escape":    70,
            "chest":     60,
            "slayer":    0,    # still not yet
        },
        "phase_3": {  # bounce 25+  (late — slayer unlocked, high risk/reward)
            "from_bounce": 25,
            "coin":      150,
            "diamond":   100,
            "clone_orb":  40,
            "heart":      55,
            "blue_blob": 100,
            "escape":    60,
            "chest":     80,
            "slayer":    40,
        },
    },

    "no_slayer": {
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "coin":      220,
            "diamond":   180,
            "clone_orb":  35,
            "heart":      20,
            "blue_blob": 100,
            "escape":    100,
            "chest":     0,
            "slayer":    0,    # disabled for entire mode
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "coin":      200,
            "diamond":   160,
            "clone_orb":  45,
            "heart":      25,
            "blue_blob": 100,
            "escape":    80,
            "chest":     80,
            "slayer":    0,    # disabled for entire mode
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "coin":      180,
            "diamond":   140,
            "clone_orb":  40,
            "heart":      30,
            "blue_blob": 100,
            "escape":    60,
            "chest":     120,
            "slayer":    0,    # disabled for entire mode
        },
    },

    "start_clone": {
        # Starts with 1 clone ball. Slayer is active.
        # Escape disabled (high-mult bonus mode).
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "coin":      200,
            "diamond":   150,
            "clone_orb":  50,
            "heart":      45,
            "blue_blob": 100,
            "escape":    0,    # disabled in bonus modes
            "chest":     0,
            "slayer":    30,   # slayer active from the start
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "coin":      180,
            "diamond":   130,
            "clone_orb":  55,
            "heart":      55,
            "blue_blob": 100,
            "escape":    0,
            "chest":     60,
            "slayer":    50,
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "coin":      150,
            "diamond":   100,
            "clone_orb":  45,
            "heart":      65,
            "blue_blob": 80,
            "escape":    0,
            "chest":     100,
            "slayer":    70,
        },
    },

    "lucky_lex": {
        # Starts with 1 clone ball + tumble multiplier x5.
        # Slayer active. Escape disabled.
        # Higher chest weight to match the elevated starting value.
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "coin":      180,
            "diamond":   180,
            "clone_orb":  55,
            "heart":      45,
            "blue_blob": 80,
            "escape":    0,    # disabled in bonus modes
            "chest":     30,   # chest available earlier due to high tumble start
            "slayer":    40,
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "coin":      160,
            "diamond":   160,
            "clone_orb":  55,
            "heart":      55,
            "blue_blob": 80,
            "escape":    0,
            "chest":     80,
            "slayer":    60,
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "coin":      140,
            "diamond":   130,
            "clone_orb":  45,
            "heart":      65,
            "blue_blob": 60,
            "escape":    0,
            "chest":     120,
            "slayer":    80,
        },
    },

}
