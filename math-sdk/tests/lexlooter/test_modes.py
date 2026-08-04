"""Regression checks for Lex Looter mode-level starting state and limits."""

from pathlib import Path
import sys
import unittest


MATH_SDK_ROOT = Path(__file__).resolve().parents[2]
LEXLOOTER_ROOT = MATH_SDK_ROOT / "games" / "lexlooter"
sys.path.insert(0, str(LEXLOOTER_ROOT))
sys.path.insert(0, str(MATH_SDK_ROOT))

from game_config import GameConfig  # noqa: E402
from gamestate import GameState  # noqa: E402


class LexLooterModeTests(unittest.TestCase):
    """Keep feature hearts, object density, RTP, and win caps aligned."""

    EXPECTED_FEATURES = {
        "base": {"hearts": 0, "opening_objects": 4, "max_win": 5000.0},
        "extra_life": {"hearts": 1, "opening_objects": 12, "max_win": 5000.0},
        "start_clone": {"hearts": 2, "opening_objects": 8, "max_win": 5000.0},
        "lucky_lex": {"hearts": 3, "opening_objects": 10, "max_win": 5000.0},
    }

    def setUp(self):
        self.config = GameConfig()

    def test_mode_configuration(self):
        self.assertEqual(self.config.rtp, 0.965)
        self.assertEqual(self.config.wincap, 5000)

        for mode in self.config.bet_modes:
            expected = self.EXPECTED_FEATURES[mode.get_name()]
            conditions = mode.get_distribution_conditions("main")
            self.assertEqual(conditions["start_shield_count"], expected["hearts"])
            self.assertEqual(conditions["start_object_count"], expected["opening_objects"])
            self.assertLessEqual(
                conditions["start_object_count"],
                conditions["max_active_objects"],
            )
            self.assertEqual(mode.get_wincap(), expected["max_win"])
            self.assertEqual(mode.get_rtp(), 0.965)

            state = GameState(self.config)
            state.betmode = mode.get_name()
            state.criteria = "main"
            for bounce_count in (0, 10, 25):
                self.assertGreater(state.get_spawn_weights(bounce_count).get("slayer", 0), 0)

            if mode.get_name() == "lucky_lex":
                self.assertTrue(
                    all(
                        corner["range"] is not None and corner["range"][0] >= 5.0
                        for corner in conditions["corner_profile"]
                    )
                )

            spawn_tables = GameState(self.config).load_probability_tables()["spawn_tables"]
            base_phases = spawn_tables["base"]
            for phase_name, phase in spawn_tables[mode.get_name()].items():
                self.assertEqual(phase["slayer"], base_phases[phase_name]["slayer"])

    def test_round_start_emits_hearts_and_dense_opening_board(self):
        for mode in self.config.bet_modes:
            name = mode.get_name()
            expected = self.EXPECTED_FEATURES[name]
            state = GameState(self.config)
            state.betmode = name
            state.criteria = "main"
            state.config.wincap = mode.get_wincap()
            state.run_spin(1, simulation_seed=100)

            round_start = next(event for event in state.book.events if event["type"] == "roundStart")
            opening_objects = [
                event
                for event in state.book.events
                if event["type"] == "objectSpawn" and event["source"] == "start"
            ]
            self.assertEqual(round_start["shieldCount"], expected["hearts"])
            self.assertEqual(len(opening_objects), expected["opening_objects"])

    def test_round_end_payout_is_capped_by_mode(self):
        state = GameState(self.config)
        state.betmode = "extra_life"
        state.criteria = "main"
        round_state = state._create_round_state()

        state._finish_round(round_state, reason="test", payout=999_999)

        self.assertEqual(round_state["payout"], 5000.0)


if __name__ == "__main__":
    unittest.main()
