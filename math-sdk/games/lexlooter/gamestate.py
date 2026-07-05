"""Handles the state and output for a single simulation round"""

from game_override import GameStateOverride
from game_events import (
    bounce_update_event,
    clone_expire_event,
    corner_update_event,
    object_resolve_event,
    object_spawn_event,
    round_end_event,
    round_start_event,
)
from src.events.events import set_total_event


class GameState(GameStateOverride):
    """Handle all game-logic and event updates for a given simulation number."""

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, simulation_seed)
        self.repeat = True
        while self.repeat:
            self.reset_book()

            state = self._create_round_state()
            round_start_event(
                self,
                mode_name=self.betmode,
                bet_cost=state["bet_cost"],
                mode_multiplier=state["mode_multiplier"],
                clone_count=len(state["clones"]),
                starts_with_slayer=state["start_with_slayer"],
            )
            corner_update_event(
                self,
                main_bounces=state["main_bounces"],
                corners=state["corners"],
            )

            if state["start_with_slayer"]:
                self._spawn_object(
                    state,
                    "slayer",
                    source="start",
                    min_delay=state["start_slayer_delay_min"],
                    max_delay=state["start_slayer_delay_max"],
                )

            self._play_round(state)

            self.win_manager.set_spin_win(state["payout"])
            self.win_manager.update_gametype_wins(self.gametype)

            if state["payout"] > 0:
                self.evaluate_wincap()

            round_end_event(
                self,
                reason=state["end_reason"],
                total_win=state["payout"],
                tumble_value=state["tumble_value"],
                main_bounces=state["main_bounces"],
                mode_multiplier=state["mode_multiplier"],
                **state["end_meta"],
            )
            set_total_event(self)

            self.evaluate_finalwin()
            self.check_repeat()

        self.imprint_wins()

    def run_freespin(self):
        pass

    def _create_round_state(self) -> dict:
        """Initialize the custom Lex Looter round state."""
        conditions = self.get_mode_conditions()
        clones = [
            {
                "id": f"clone_{index + 1}",
                "hitsRemaining": self.CLONE_LIFETIME,
            }
            for index in range(conditions["start_clone_count"])
        ]

        return {
            "turn": 0,
            "bet_cost": self.get_bet_cost(),
            "mode_multiplier": float(conditions["start_multiplier"]),
            "high_mult_corners": bool(conditions["high_mult_corners"]),
            "spawn_chance_per_turn": float(conditions["spawn_chance_per_turn"]),
            "start_with_slayer": bool(conditions["start_with_slayer"]),
            "start_slayer_delay_min": int(conditions["start_slayer_delay_min"]),
            "start_slayer_delay_max": int(conditions["start_slayer_delay_max"]),
            "main_alive": True,
            "main_bounces": 0,
            "clones": clones,
            "shield_count": 0,
            "next_clone_id": len(clones) + 1,
            "tumble_value": 0.0,
            "corners": self.roll_corners(0, bool(conditions["high_mult_corners"])),
            "active_objects": [],
            "next_object_id": 1,
            "finished": False,
            "payout": 0.0,
            "end_reason": "allBallsLost",
            "end_meta": {},
            "max_turns": self.MAX_MAIN_BOUNCES + self.CLONE_LIFETIME + 10,
        }

    def _play_round(self, state: dict) -> None:
        """Run the bounce-based Lex Looter simulation until a terminal condition occurs."""
        while not state["finished"] and state["turn"] < state["max_turns"]:
            state["turn"] += 1

            self._maybe_hit_corner(state)
            if state["finished"]:
                break

            self._process_main_bounce(state)
            if state["finished"]:
                break

            self._process_clone_bounces(state)
            if state["finished"]:
                break

            self._maybe_spawn_random_object(state)
            self._resolve_due_objects(state)
            if state["finished"]:
                break

            if not self._has_live_balls(state):
                self._finish_round(state, reason="allBallsLost", payout=0.0)
                break

            bounce_update_event(
                self,
                turn=state["turn"],
                main_bounces=state["main_bounces"],
                tumble_value=state["tumble_value"],
                main_alive=state["main_alive"],
                clone_count=len(state["clones"]),
                mode_multiplier=state["mode_multiplier"],
            )

        if state["finished"]:
            return

        if self._has_live_balls(state):
            self._finish_round(
                state,
                reason="safetyStop",
                payout=state["tumble_value"] * state["mode_multiplier"],
            )
            return

        self._finish_round(state, reason="allBallsLost", payout=0.0)

    def _process_main_bounce(self, state: dict) -> None:
        """Advance the main ball one bounce and re-roll corners."""
        if not state["main_alive"]:
            return

        state["main_bounces"] += 1
        state["tumble_value"] = self.round_amount(
            state["tumble_value"] + self.MAIN_BOUNCE_INCREMENT * state["bet_cost"]
        )
        state["corners"] = self.roll_corners(state["main_bounces"], state["high_mult_corners"])
        corner_update_event(
            self,
            main_bounces=state["main_bounces"],
            corners=state["corners"],
        )

        if state["main_bounces"] >= self.MAX_MAIN_BOUNCES:
            self._finish_round(
                state,
                reason="bounceLimit",
                payout=state["tumble_value"] * state["mode_multiplier"],
            )

    def _process_clone_bounces(self, state: dict) -> None:
        """Advance all active clones and expire them when they run out of hits."""
        if not state["clones"]:
            return

        surviving_clones = []
        for clone in state["clones"]:
            state["tumble_value"] = self.round_amount(
                state["tumble_value"] + self.CLONE_BOUNCE_INCREMENT * state["bet_cost"]
            )
            clone["hitsRemaining"] -= 1
            if clone["hitsRemaining"] <= 0:
                state["tumble_value"] = self.round_amount(
                    state["tumble_value"] + self.CLONE_EXPIRY_BONUS * state["bet_cost"]
                )
                clone_expire_event(
                    self,
                    ball_id=clone["id"],
                    turn=state["turn"],
                    added_amount=self.CLONE_EXPIRY_BONUS * state["bet_cost"],
                    tumble_value=state["tumble_value"],
                )
                continue
            surviving_clones.append(clone)

        state["clones"] = surviving_clones
        if not self._has_live_balls(state):
            self._finish_round(state, reason="allBallsLost", payout=0.0)

    def _maybe_spawn_random_object(self, state: dict) -> None:
        """Spawn at most one random object for the current turn."""
        if len(state["active_objects"]) >= self.MAX_ACTIVE_OBJECTS:
            return
        if self.random() >= state["spawn_chance_per_turn"]:
            return

        object_name = self.draw_spawn_object(state["main_bounces"])
        if object_name is None:
            return

        self._spawn_object(state, object_name, source="random")

    def _spawn_object(
        self,
        state: dict,
        object_name: str,
        *,
        source: str,
        min_delay: int = 1,
        max_delay: int = 4,
    ) -> None:
        """Create a future object resolution and emit its spawn event."""
        x_pos, y_pos = self.draw_spawn_position()
        object_state = {
            "id": f"{object_name}_{state['next_object_id']}",
            "object": object_name,
            "x": x_pos,
            "y": y_pos,
            "resolve_turn": state["turn"] + self.draw_object_resolution_delay(min_delay, max_delay),
        }
        state["next_object_id"] += 1
        state["active_objects"].append(object_state)

        object_spawn_event(
            self,
            object_id=object_state["id"],
            object_name=object_name,
            turn=state["turn"],
            x=x_pos,
            y=y_pos,
            source=source,
        )

    def _resolve_due_objects(self, state: dict) -> None:
        """Resolve any objects whose collision window has been reached."""
        due_objects = [
            obj
            for obj in state["active_objects"]
            if obj["resolve_turn"] <= state["turn"]
        ]
        for obj in due_objects:
            if state["finished"]:
                break
            self._resolve_object(state, obj)
            state["active_objects"] = [active for active in state["active_objects"] if active["id"] != obj["id"]]

    def _resolve_object(self, state: dict, object_state: dict) -> None:
        """Apply a single object effect to the round state."""
        object_name = object_state["object"]
        bet_cost = state["bet_cost"]

        if object_name == "coin":
            added_amount = self.COIN_BONUS * bet_cost
            state["tumble_value"] = self.round_amount(state["tumble_value"] + added_amount)
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="collect",
                amount=self.to_cents(added_amount),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "diamond":
            added_amount = self.DIAMOND_BONUS * bet_cost
            state["tumble_value"] = self.round_amount(state["tumble_value"] + added_amount)
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="collect",
                amount=self.to_cents(added_amount),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "blue_blob":
            previous_tumble = state["tumble_value"]
            state["tumble_value"] = self.round_amount(state["tumble_value"] * 0.5)
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="halve",
                delta=self.to_cents(state["tumble_value"] - previous_tumble),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "chest":
            chest_multiplier = self.draw_chest_multiplier()
            state["tumble_value"] = self.round_amount(state["tumble_value"] * chest_multiplier)
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="multiply",
                multiplier=chest_multiplier,
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "clone_orb":
            clone = self._add_clone(state)
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="spawnClone",
                ballId=clone["id"],
                hitsRemaining=clone["hitsRemaining"],
                cloneCount=len(state["clones"]),
            )
            return

        if object_name == "heart":
            state["shield_count"] += 1
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="shield",
                shieldCount=state["shield_count"],
            )
            return

        if object_name == "escape":
            payout = state["tumble_value"] * state["mode_multiplier"]
            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="cashout",
                totalWin=self.to_cents(payout),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            self._finish_round(
                state,
                reason="escape",
                payout=payout,
                objectId=object_state["id"],
            )
            return

        if object_name == "slayer":
            target_ball = self._choose_slayer_target(state)
            if target_ball is None:
                object_resolve_event(
                    self,
                    object_id=object_state["id"],
                    object_name=object_name,
                    turn=state["turn"],
                    result="noTarget",
                )
                return

            if state["shield_count"] > 0:
                state["shield_count"] -= 1
                object_resolve_event(
                    self,
                    object_id=object_state["id"],
                    object_name=object_name,
                    turn=state["turn"],
                    result="shieldBlock",
                    target=target_ball,
                    shieldCount=state["shield_count"],
                    remainingBalls=self._live_ball_count(state),
                )
                return

            if target_ball == "main":
                state["main_alive"] = False
            else:
                state["clones"] = [clone for clone in state["clones"] if clone["id"] != target_ball]

            object_resolve_event(
                self,
                object_id=object_state["id"],
                object_name=object_name,
                turn=state["turn"],
                result="destroy",
                target=target_ball,
                remainingBalls=self._live_ball_count(state),
            )
            if not self._has_live_balls(state):
                self._finish_round(
                    state,
                    reason="slayer",
                    payout=0.0,
                    objectId=object_state["id"],
                    target=target_ball,
                )
            return

        raise RuntimeError(f"Unsupported object type: {object_name}")

    def _add_clone(self, state: dict) -> dict:
        """Add a new clone ball and return its state."""
        clone = {
            "id": f"clone_{state['next_clone_id']}",
            "hitsRemaining": self.CLONE_LIFETIME,
        }
        state["next_clone_id"] += 1
        state["clones"].append(clone)
        return clone

    def _maybe_hit_corner(self, state: dict) -> None:
        """Resolve a winning corner hit before the next bounce step."""
        corner_hit = self.choose_corner_hit(state["corners"], self._live_ball_count(state))
        if corner_hit is None:
            return

        corner_name, corner_multiplier = corner_hit
        payout = state["tumble_value"] * state["mode_multiplier"] * corner_multiplier
        self._finish_round(
            state,
            reason="cornerHit",
            payout=payout,
            corner=corner_name,
            cornerMultiplier=corner_multiplier,
        )

    def _choose_slayer_target(self, state: dict) -> str | None:
        """Choose which live ball the slayer destroys."""
        live_balls = []
        if state["main_alive"]:
            live_balls.append("main")
        live_balls.extend(clone["id"] for clone in state["clones"])

        if not live_balls:
            return None
        return self.choice(live_balls)

    def _has_live_balls(self, state: dict) -> bool:
        """Return True when at least one ball is still alive."""
        return state["main_alive"] or bool(state["clones"])

    def _live_ball_count(self, state: dict) -> int:
        """Return the total number of live balls."""
        return int(state["main_alive"]) + len(state["clones"])

    def _finish_round(self, state: dict, *, reason: str, payout: float, **meta) -> None:
        """Freeze the round and store its terminal outcome."""
        state["finished"] = True
        state["payout"] = self.round_amount(max(payout, 0.0))
        state["end_reason"] = reason
        state["end_meta"] = meta
        state["active_objects"] = []

    @staticmethod
    def random() -> float:
        """Wrapper kept local for easier future test overrides."""
        from random import random

        return random()

    @staticmethod
    def choice(values: list[str]) -> str:
        """Wrapper kept local for easier future test overrides."""
        from random import choice

        return choice(values)
