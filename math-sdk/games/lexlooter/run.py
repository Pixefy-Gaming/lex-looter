"""Main file for generating Lex Looter simulation books."""

from pathlib import Path
import shutil
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


def sync_lookup_tables(gamestate: GameState) -> None:
    """Mirror fresh lookup tables into the publish filenames used by generate_configs."""
    for betmode in gamestate.config.bet_modes:
        lookup_paths = gamestate.output_files.lookups[betmode.get_name()]["paths"]
        shutil.copyfile(lookup_paths["base_lookup"], lookup_paths["optimized_lookup"])

if __name__ == "__main__":

    num_threads = 1
    batching_size = 50000
    compression = True
    profiling = False

    num_sim_args = {
        "base": int(1e5),
        "no_slayer": int(1e5),
        "start_clone": int(1e5),
        "lucky_lex": int(1e5),
    }

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
    sync_lookup_tables(gamestate)
    generate_configs(gamestate)
