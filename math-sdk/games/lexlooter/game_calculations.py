"""Reusable weighted draws and utility helpers for Lex Looter."""

from functools import lru_cache
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
import random
import runpy

from src.calculations.statistics import get_random_outcome
from src.executables.executables import Executables
from notation import (
    BOARD_COLS,
    BOARD_ROWS,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    CORNER_NOTATION,
    board_payload,
    cell_to_notation,
    notation_to_cell,
    notation_to_normalized,
)


class GameCalculations(Executables):
    MAX_MAIN_BOUNCES = 40
    CLONE_LIFETIME = 10
    MAX_ACTIVE_OBJECTS = 3
    OBJECT_HIT_RADIUS_CELLS = 1

    CLONE_BOUNCE_INCREMENT = 0.08
    CLONE_EXPIRY_BONUS = 0.50
    COIN_BONUS = 0.50
    DIAMOND_BONUS = 5.0

    CORNER_KEYS = ("tl", "tr", "bl", "br")
    BOARD_COLS = BOARD_COLS
    BOARD_ROWS = BOARD_ROWS
    CANVAS_WIDTH = CANVAS_WIDTH
    CANVAS_HEIGHT = CANVAS_HEIGHT
    CORNER_NOTATION = CORNER_NOTATION

    def board_payload(self) -> dict:
        """Return the notation board definition used by emitted books."""
        return board_payload()

    @staticmethod
    @lru_cache(maxsize=1)
    def load_probability_tables() -> dict:
        """Load user-authored probability tables from the local game folder."""
        probability_dir = Path(__file__).resolve().parent / "game-object-probability"
        spawn_data = runpy.run_path(str(probability_dir / "spawn-object.py"))

        chest_rows = spawn_data.get("chest")
        chest_path = probability_dir / "chest.py"
        if chest_rows is None and chest_path.exists():
            chest_data = runpy.run_path(str(chest_path))
            chest_rows = chest_data.get("chest")

        spawn_tables = spawn_data.get("spawn_tables")
        if chest_rows is None:
            raise RuntimeError("Missing 'chest' probability table for Lex Looter")
        if spawn_tables is None:
            raise RuntimeError("Missing 'spawn_tables' probability table for Lex Looter")

        return {
            "chest": chest_rows,
            "spawn_tables": spawn_tables,
        }

    def get_mode_conditions(self) -> dict:
        """Return the active bet mode conditions."""
        return self.get_current_distribution_conditions()

    def get_bet_cost(self) -> float:
        """Return the active bet-mode cost as the unit amount for fixed bonuses."""
        return float(self.get_current_betmode().get_cost())

    def to_cents(self, amount: float) -> int:
        """Convert a float amount to cents for book events."""
        return int((Decimal(str(amount)) * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    def round_amount(self, amount: float) -> float:
        """Keep internal floating point drift under control."""
        return round(amount, 4)

    def draw_chest_multiplier(self) -> float:
        """Draw a chest multiplier from the weighted user table."""
        distribution = {
            float(row["multiplier"]): float(row["weight"])
            for row in self.load_probability_tables()["chest"]
            if float(row.get("weight", 0)) > 0
        }
        return float(get_random_outcome(distribution))

    def get_spawn_weights(self, main_bounces: int) -> dict:
        """Return the active spawn weights for the current mode and bounce phase."""
        spawn_mode = self.get_mode_conditions()["spawn_mode"]
        mode_tables = self.load_probability_tables()["spawn_tables"][spawn_mode]
        phases = sorted(mode_tables.values(), key=lambda phase: phase["from_bounce"])

        active_phase = phases[0]
        for phase in phases:
            if main_bounces >= phase["from_bounce"]:
                active_phase = phase

        return {
            key: weight
            for key, weight in active_phase.items()
            if key != "from_bounce" and float(weight) > 0
        }

    def draw_spawn_object(self, main_bounces: int) -> str | None:
        """Draw a spawnable object for the active mode and bounce window."""
        distribution = self.get_spawn_weights(main_bounces)
        if not distribution:
            return None
        outcome = get_random_outcome(distribution)
        if outcome in (None, "none", "nothing"):
            return None
        return str(outcome)

    def draw_spawn_position(self) -> tuple[float, float]:
        """Return a normalized x/y position inside the playfield."""
        return (
            round(random.uniform(0.15, 0.85), 4),
            round(random.uniform(0.18, 0.82), 4),
        )

    def draw_spawn_cell(self) -> dict:
        """Return a notation-backed spawn cell inside the playfield."""
        col = random.randint(6, self.BOARD_COLS - 7)
        row = random.randint(4, self.BOARD_ROWS - 5)
        return {
            "col": col,
            "row": row,
            "notation": cell_to_notation(col, row),
        }

    def notation_to_normalized(self, notation: str) -> tuple[float, float]:
        """Convert board notation to normalized canvas coordinates."""
        return notation_to_normalized(notation)

    def initial_lex_state(self) -> dict:
        """Create the main Lex state in board cells."""
        col = self.BOARD_COLS // 2
        row = self.BOARD_ROWS // 2
        dx = self.choice([-1, 1])
        dy = self.choice([-1, 1])
        return {
            "col": col,
            "row": row,
            "dx": dx,
            "dy": dy,
            "notation": cell_to_notation(col, row),
        }

    def advance_lex_path(self, lex: dict) -> dict:
        """Move Lex one cell, reflecting vectors at board walls."""
        from_notation = lex["notation"]
        next_col = lex["col"] + lex["dx"]
        next_row = lex["row"] + lex["dy"]
        bounced = False

        if next_col < 0 or next_col >= self.BOARD_COLS:
            lex["dx"] *= -1
            next_col = lex["col"] + lex["dx"]
            bounced = True
        if next_row < 0 or next_row >= self.BOARD_ROWS:
            lex["dy"] *= -1
            next_row = lex["row"] + lex["dy"]
            bounced = True

        lex["col"] = next_col
        lex["row"] = next_row
        lex["notation"] = cell_to_notation(next_col, next_row)
        return {
            "from": from_notation,
            "to": lex["notation"],
            "path": [from_notation, lex["notation"]],
            "bounced": bounced,
        }

    def corner_for_notation(self, notation: str) -> str | None:
        """Return the corner key when notation reaches a 2-column by 1-row corner chest zone."""
        cell = notation_to_cell(notation)
        col = cell["col"]
        row = cell["row"]
        zone_cols = 2
        zone_rows = 1
        if col < zone_cols and row >= self.BOARD_ROWS - zone_rows:
            return "tl"
        if col >= self.BOARD_COLS - zone_cols and row >= self.BOARD_ROWS - zone_rows:
            return "tr"
        if col < zone_cols and row < zone_rows:
            return "bl"
        if col >= self.BOARD_COLS - zone_cols and row < zone_rows:
            return "br"
        return None

    def notation_distance(self, a: str, b: str) -> int:
        """Chebyshev cell distance between two notation positions."""
        cell_a = notation_to_cell(a)
        cell_b = notation_to_cell(b)
        return max(abs(cell_a["col"] - cell_b["col"]), abs(cell_a["row"] - cell_b["row"]))

    def draw_object_resolution_delay(self, min_turns: int = 1, max_turns: int = 4) -> int:
        """Delay object resolution to keep spawn and collect events visually separate."""
        return random.randint(min_turns, max_turns)

    def draw_corner_multiplier(self, corner_profile: list[dict]) -> float | None:
        """Return a weighted corner multiplier or None for an empty corner."""
        roll = random.random()
        cumulative_weight = 0.0
        for option in corner_profile:
            cumulative_weight += float(option["weight"])
            if roll > cumulative_weight:
                continue

            multiplier_range = option["range"]
            if multiplier_range is None:
                return None
            return round(random.uniform(*multiplier_range), 1)

        return None

    def roll_corners(self, main_bounces: int, corner_profile: list[dict]) -> dict:
        """Roll the full corner set, keeping the warm-up period empty."""
        if main_bounces < 5:
            return {corner: None for corner in self.CORNER_KEYS}

        return {
            corner: self.draw_corner_multiplier(corner_profile)
            for corner in self.CORNER_KEYS
        }

    def choose_corner_hit(self, corners: dict, live_ball_count: int) -> tuple[str, float] | None:
        """Give active corners a chance to end the round with a payout."""
        active_corners = [(corner, mult) for corner, mult in corners.items() if mult is not None]
        if not active_corners or live_ball_count <= 0:
            return None

        hit_chance = min(0.03 * len(active_corners) * live_ball_count, 0.25)
        if random.random() >= hit_chance:
            return None

        return random.choice(active_corners)
