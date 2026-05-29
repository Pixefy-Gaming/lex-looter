"""Reusable weighted draws and utility helpers for Lex Looter."""

from functools import lru_cache
from pathlib import Path
import random
import runpy

from src.calculations.statistics import get_random_outcome
from src.executables.executables import Executables


class GameCalculations(Executables):
    MAX_MAIN_BOUNCES = 40
    CLONE_LIFETIME = 15
    MAX_ACTIVE_OBJECTS = 3

    MAIN_BOUNCE_INCREMENT = 0.12
    CLONE_BOUNCE_INCREMENT = 0.08
    CLONE_EXPIRY_BONUS = 0.50
    COIN_BONUS = 0.50
    DIAMOND_BONUS = 5.0

    CORNER_KEYS = ("tl", "tr", "bl", "br")

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
        return int(round(amount * 100, 0))

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
        return str(get_random_outcome(distribution))

    def draw_spawn_position(self) -> tuple[float, float]:
        """Return a normalized x/y position inside the playfield."""
        return (
            round(random.uniform(0.15, 0.85), 4),
            round(random.uniform(0.18, 0.82), 4),
        )

    def draw_object_resolution_delay(self, min_turns: int = 1, max_turns: int = 4) -> int:
        """Delay object resolution to keep spawn and collect events visually separate."""
        return random.randint(min_turns, max_turns)

    def draw_corner_multiplier(self, high_mult_corners: bool) -> float | None:
        """Return a weighted corner multiplier or None for an empty corner."""
        roll = random.random()
        if high_mult_corners:
            if roll < 0.70:
                return None
            if roll < 0.90:
                return round(random.uniform(2.0, 4.0), 1)
            return round(random.uniform(5.0, 20.0), 1)

        if roll < 0.75:
            return None
        if roll < 0.92:
            return round(random.uniform(0.1, 1.0), 1)
        return round(random.uniform(2.0, 12.0), 1)

    def roll_corners(self, main_bounces: int, high_mult_corners: bool) -> dict:
        """Roll the full corner set, keeping the warm-up period empty."""
        if main_bounces < 5:
            return {corner: None for corner in self.CORNER_KEYS}

        return {
            corner: self.draw_corner_multiplier(high_mult_corners)
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
