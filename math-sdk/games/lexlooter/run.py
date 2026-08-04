"""Main file for generating Lex Looter simulation books."""

from pathlib import Path
import os
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
from weight_balancer import balance_lookup_table


def balance_lookup_tables(gamestate: GameState) -> None:
    """Balance fresh simulations to every mode's configured RTP before publishing."""
    for betmode in gamestate.config.bet_modes:
        lookup_paths = gamestate.output_files.lookups[betmode.get_name()]["paths"]
        summary = balance_lookup_table(
            Path(lookup_paths["base_lookup"]),
            Path(lookup_paths["optimized_lookup"]),
            betmode,
        )
        print(
            f"Balanced {summary['mode']}: {summary['achieved_rtp'] * 100:.6f}% "
            f"(target {summary['target_rtp'] * 100:.2f}%)"
        )

if __name__ == "__main__":

    # Can be raised for a faster targeted publish rebuild.
    num_threads = int(os.environ.get("LEXLOOTER_SIM_THREADS", "1"))
    if num_threads < 1:
        raise ValueError("LEXLOOTER_SIM_THREADS must be at least 1")
    batching_size = 50000
    compression = True
    profiling = False

    all_modes = ("base", "extra_life", "start_clone", "lucky_lex")
    selected_modes = {
        mode.strip()
        for mode in os.environ.get("LEXLOOTER_SIM_MODES", ",".join(all_modes)).split(",")
        if mode.strip()
    }
    unknown_modes = selected_modes.difference(all_modes)
    if unknown_modes:
        raise ValueError(f"Unknown Lex Looter simulation modes: {sorted(unknown_modes)}")
    num_sim_args = {mode: int(1e5) if mode in selected_modes else 0 for mode in all_modes}

    run_conditions = {"run_sims": True}

    config = GameConfig()
    gamestate = GameState(config)

    if run_conditions["run_sims"]:
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )
    balance_lookup_tables(gamestate)
    generate_configs(gamestate)
