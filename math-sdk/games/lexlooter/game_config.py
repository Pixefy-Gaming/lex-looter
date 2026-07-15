"""Lex Looter configuration for a custom event-based game."""

from src.config.config import BetMode, Config
from src.config.distributions import Distribution


class GameConfig(Config):
    """Configure Lex Looter bet modes and round-level simulation settings."""

    def __init__(self):
        super().__init__()
        self.game_id = "lexlooter"
        self.provider_number = 0
        self.provider_name = "Pixefy Gaming"
        self.working_name = "lexlooter"
        self.game_name = "Lex Looter"
        self.wincap = 8888
        self.win_type = "other"
        self.rtp = 0.965
        self.construct_paths()

        self.num_reels = 0
        self.num_rows = []
        self.paytable = {}
        self.include_padding = False
        self.special_symbols = {None: []}

        self.freespin_triggers = {self.basegame_type: {}, self.freegame_type: {}}
        self.anticipation_triggers = {self.basegame_type: 0, self.freegame_type: 0}

        self.bet_modes = [
            self._build_bet_mode(
                name="base",
                cost=1.0,
                is_buybonus=False,
                spawn_mode="base",
                main_bounce_increment=0.12,
                corner_profile=[
                    {"weight": 0.75, "range": None},
                    {"weight": 0.17, "range": (0.1, 1.0)},
                    {"weight": 0.08, "range": (2.0, 8.0)},
                ],
                start_with_slayer=False,
                start_clone_count=0,
                start_multiplier=1.0,
                spawn_chance_per_turn=0.28,
                start_slayer_delay_min=1,
                start_slayer_delay_max=1,
            ),
            self._build_bet_mode(
                name="no_slayer",
                cost=3.0,
                is_buybonus=True,
                spawn_mode="no_slayer",
                main_bounce_increment=0.10,
                corner_profile=[
                    {"weight": 0.70, "range": None},
                    {"weight": 0.20, "range": (1.0, 3.0)},
                    {"weight": 0.10, "range": (4.0, 10.0)},
                ],
                start_with_slayer=False,
                start_clone_count=0,
                start_multiplier=1.0,
                spawn_chance_per_turn=0.30,
                start_slayer_delay_min=20,
                start_slayer_delay_max=30,
            ),
            self._build_bet_mode(
                name="start_clone",
                cost=50.0,
                is_buybonus=True,
                spawn_mode="start_clone",
                main_bounce_increment=0.08,
                corner_profile=[
                    {"weight": 0.70, "range": None},
                    {"weight": 0.20, "range": (1.5, 3.5)},
                    {"weight": 0.10, "range": (4.0, 12.0)},
                ],
                start_with_slayer=False,
                start_clone_count=1,
                start_multiplier=1.0,
                spawn_chance_per_turn=0.30,
                start_slayer_delay_min=4,
                start_slayer_delay_max=8,
            ),
            self._build_bet_mode(
                name="lucky_lex",
                cost=100.0,
                is_buybonus=True,
                spawn_mode="lucky_lex",
                main_bounce_increment=0.06,
                corner_profile=[
                    {"weight": 0.75, "range": None},
                    {"weight": 0.20, "range": (1.5, 2.5)},
                    {"weight": 0.05, "range": (3.0, 6.0)},
                ],
                start_with_slayer=False,
                start_clone_count=1,
                start_multiplier=5.0,
                spawn_chance_per_turn=0.34,
                start_slayer_delay_min=3,
                start_slayer_delay_max=6,
            ),
        ]

    def _build_bet_mode(
        self,
        name: str,
        cost: float,
        is_buybonus: bool,
        spawn_mode: str,
        main_bounce_increment: float,
        corner_profile: list[dict],
        start_with_slayer: bool,
        start_clone_count: int,
        start_multiplier: float,
        spawn_chance_per_turn: float,
        start_slayer_delay_min: int,
        start_slayer_delay_max: int,
    ) -> BetMode:
        return BetMode(
            name=name,
            cost=cost,
            rtp=self.rtp,
            max_win=self.wincap,
            auto_close_disabled=False,
            is_feature=is_buybonus,
            is_buybonus=is_buybonus,
            distributions=[
                Distribution(
                    criteria="main",
                    quota=1.0,
                    conditions={
                        "reel_weights": {},
                        "force_wincap": False,
                        "force_freegame": False,
                        "spawn_mode": spawn_mode,
                        "main_bounce_increment": main_bounce_increment,
                        "corner_profile": corner_profile,
                        "start_with_slayer": start_with_slayer,
                        "start_clone_count": start_clone_count,
                        "start_multiplier": start_multiplier,
                        "spawn_chance_per_turn": spawn_chance_per_turn,
                        "start_slayer_delay_min": start_slayer_delay_min,
                        "start_slayer_delay_max": start_slayer_delay_max,
                    },
                )
            ],
        )
