chest = [
    {"multiplier": 0.1,  "weight": 500},
    {"multiplier": 0.25, "weight": 260},
    {"multiplier": 0.5,  "weight": 150},
    {"multiplier": 1.0,  "weight": 70},
    {"multiplier": 2.0,  "weight": 15},
    {"multiplier": 5.0,  "weight": 4},
    {"multiplier": 10.0, "weight": 1},
    {"multiplier": 25.0, "weight": 1},
]

# ---------------------------------------------------------------------------
# Spawn tables — Method 3 (bounce-gated) + Method 4 (per-mode)
#
# Each mode has 3 bounce phases. The game picks the active phase based on
# the current bounce count, then does a weighted draw from that phase.
# Weight 0 = never spawns.
# "nothing" = the spawn roll resolves as no object, used to control hit rate/RTP.
# "chest" remains weighted 0 because chests live only in the four board corners.
#
# Modes:
#   base        — Standard game
#   no_slayer   — Slayer never spawns (safer bonus)
#   start_clone — Slayer can spawn, starts with 1 clone ball
#   lucky_lex   — Slayer can spawn, starts with 1 clone + tumble multiplier x5
# ---------------------------------------------------------------------------

spawn_tables = {

    "base": {
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "nothing":   120,
            "coin":      450,
            "diamond":    45,
            "clone_orb":  35,
            "heart":      30,
            "blue_blob": 220,
            "escape":     25,
            "chest":       0,
            "slayer":     75,
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "nothing":    90,
            "coin":      300,
            "diamond":    35,
            "clone_orb":  25,
            "heart":      20,
            "blue_blob": 300,
            "escape":     10,
            "chest":       0,
            "slayer":    220,
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "nothing":    60,
            "coin":      130,
            "diamond":    20,
            "clone_orb":  10,
            "heart":       8,
            "blue_blob": 360,
            "escape":      2,
            "chest":       0,
            "slayer":    410,
        },
    },

    "no_slayer": {
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "nothing":   720,
            "coin":       70,
            "diamond":     5,
            "clone_orb":   6,
            "heart":       5,
            "blue_blob": 170,
            "escape":     24,
            "chest":     0,
            "slayer":    0,    # disabled for entire mode
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "nothing":   700,
            "coin":       60,
            "diamond":     5,
            "clone_orb":   7,
            "heart":       5,
            "blue_blob": 180,
            "escape":     20,
            "chest":       0,
            "slayer":    0,    # disabled for entire mode
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "nothing":   680,
            "coin":       50,
            "diamond":     4,
            "clone_orb":   6,
            "heart":       4,
            "blue_blob": 200,
            "escape":     16,
            "chest":       0,
            "slayer":    0,    # disabled for entire mode
        },
    },

    "start_clone": {
        # Starts with 1 clone ball. Slayer disabled for the full bonus.
        # Escape disabled (high-mult bonus mode).
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "nothing":   610,
            "coin":       45,
            "diamond":     4,
            "clone_orb":   6,
            "heart":       5,
            "blue_blob": 130,
            "escape":    0,    # disabled in bonus modes
            "chest":     0,
            "slayer":    0,
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "nothing":   570,
            "coin":       40,
            "diamond":     4,
            "clone_orb":   6,
            "heart":       5,
            "blue_blob": 140,
            "escape":    0,
            "chest":       0,
            "slayer":    0,
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "nothing":   530,
            "coin":       35,
            "diamond":     3,
            "clone_orb":   5,
            "heart":       4,
            "blue_blob": 160,
            "escape":    0,
            "chest":       0,
            "slayer":    0,
        },
    },

    "lucky_lex": {
        # Starts with 1 clone ball + tumble multiplier x5.
        # Slayer disabled. Escape disabled.
        "phase_1": {  # bounce 0–9
            "from_bounce": 0,
            "nothing":   560,
            "coin":       35,
            "diamond":     4,
            "clone_orb":   5,
            "heart":       4,
            "blue_blob": 140,
            "escape":    0,    # disabled in bonus modes
            "chest":       0,
            "slayer":    0,
        },
        "phase_2": {  # bounce 10–24
            "from_bounce": 10,
            "nothing":   520,
            "coin":       30,
            "diamond":     3,
            "clone_orb":   5,
            "heart":       4,
            "blue_blob": 160,
            "escape":    0,
            "chest":       0,
            "slayer":    0,
        },
        "phase_3": {  # bounce 25+
            "from_bounce": 25,
            "nothing":   480,
            "coin":       25,
            "diamond":     2,
            "clone_orb":   4,
            "heart":       3,
            "blue_blob": 180,
            "escape":    0,
            "chest":       0,
            "slayer":    0,
        },
    },

}
