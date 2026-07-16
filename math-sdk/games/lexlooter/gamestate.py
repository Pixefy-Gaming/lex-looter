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
from notation import notation_to_cell
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
                clones=self._clone_snapshots(state["clones"]),
                starts_with_slayer=state["start_with_slayer"],
                board=self.board_payload(),
                lex_start=state["lex"]["notation"],
                lex_vector={"dx": state["lex"]["dx"], "dy": state["lex"]["dy"]},
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
                lexAt=state["lex"]["notation"],
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
        lex = self.initial_lex_state()
        clones = [
            self._create_clone_state(
                clone_id=f"clone_{index + 1}",
                source_lex=lex,
                hits_remaining=self.CLONE_LIFETIME,
                vector_index=index,
            )
            for index in range(conditions["start_clone_count"])
        ]

        return {
            "turn": 0,
            "bet_cost": self.get_bet_cost(),
            "mode_multiplier": float(conditions["start_multiplier"]),
            "main_bounce_increment": float(conditions["main_bounce_increment"]),
            "corner_profile": conditions["corner_profile"],
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
            "corners": self.roll_corners(0, conditions["corner_profile"]),
            "lex": lex,
            "last_step": None,
            "last_clone_steps": [],
            "clone_expirations": [],
            "active_objects": [],
            "next_object_id": 1,
            "finished": False,
            "payout": 0.0,
            "end_reason": "allBallsLost",
            "end_meta": {},
            "max_turns": self.MAX_MAIN_BOUNCES * max(self.BOARD_COLS, self.BOARD_ROWS)
            + self.CLONE_LIFETIME
            + 10,
        }

    def _play_round(self, state: dict) -> None:
        """Run the bounce-based Lex Looter simulation until a terminal condition occurs."""
        while not state["finished"] and state["turn"] < state["max_turns"]:
            state["turn"] += 1

            self._process_main_step(state)
            if not state["finished"]:
                self._process_clone_bounces(state)
            else:
                state["last_clone_steps"] = self._clone_snapshots(state["clones"])
            bounce_update_event(
                self,
                turn=state["turn"],
                from_notation=state["last_step"]["from"],
                to_notation=state["last_step"]["to"],
                path=state["last_step"]["path"],
                clone_updates=state["last_clone_steps"],
                main_bounces=state["main_bounces"],
                tumble_value=state["tumble_value"],
            )
            self._emit_clone_expirations(state)
            if state["finished"]:
                break

            self._maybe_hit_corner(state)
            if state["finished"]:
                break

            self._maybe_spawn_random_object(state)
            self._resolve_due_objects(state)
            if state["finished"]:
                break

            if not self._has_live_balls(state):
                self._finish_round(state, reason="allBallsLost", payout=0.0)
                break

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

    def _process_main_step(self, state: dict) -> None:
        """Advance the main Lex cell and re-roll corners on wall reflection."""
        if not state["main_alive"]:
            state["last_step"] = {
                "from": state["lex"]["notation"],
                "to": state["lex"]["notation"],
                "path": [state["lex"]["notation"]],
                "bounced": False,
            }
            return

        state["last_step"] = self.advance_lex_path(state["lex"])
        if not state["last_step"]["bounced"]:
            return

        state["main_bounces"] += 1
        state["tumble_value"] = self.round_amount(
            state["tumble_value"] + state["main_bounce_increment"] * state["bet_cost"]
        )
        state["corners"] = self.roll_corners(state["main_bounces"], state["corner_profile"])
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
        """Advance all active clones and expire them after their own wall bounces."""
        state["last_clone_steps"] = []
        state["clone_expirations"] = []
        if not state["clones"]:
            return

        surviving_clones = []
        for clone in state["clones"]:
            clone_step = self.advance_lex_path(clone)
            clone_update = self._clone_snapshot(clone, clone_step)

            if clone_step["bounced"]:
                state["tumble_value"] = self.round_amount(
                    state["tumble_value"] + self.CLONE_BOUNCE_INCREMENT * state["bet_cost"]
                )
                clone["hitsRemaining"] -= 1
                clone_update["hitsRemaining"] = clone["hitsRemaining"]
                clone_update["bounced"] = True

            if clone["hitsRemaining"] <= 0:
                state["tumble_value"] = self.round_amount(
                    state["tumble_value"] + self.CLONE_EXPIRY_BONUS * state["bet_cost"]
                )
                clone_update["alive"] = False
                state["last_clone_steps"].append(clone_update)
                state["clone_expirations"].append({
                    "ball_id": clone["id"],
                    "turn": state["turn"],
                    "added_amount": self.CLONE_EXPIRY_BONUS * state["bet_cost"],
                    "tumble_value": state["tumble_value"],
                    "notation": clone["notation"],
                })
                continue

            state["last_clone_steps"].append(clone_update)
            surviving_clones.append(clone)

        state["clones"] = surviving_clones
        if not self._has_live_balls(state):
            self._finish_round(state, reason="allBallsLost", payout=0.0)

    def _emit_clone_expirations(self, state: dict) -> None:
        """Emit clone expiration events after movement snapshots reach the book."""
        for expiration in state.get("clone_expirations", []):
            clone_expire_event(self, **expiration)
        state["clone_expirations"] = []

    def _maybe_spawn_random_object(self, state: dict) -> None:
        """Spawn at most one random object for the current turn."""
        if len(state["active_objects"]) >= self.MAX_ACTIVE_OBJECTS:
            return
        if state["main_alive"] and not state["last_step"].get("bounced"):
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
        spawn_cell = self._draw_non_overlapping_spawn_cell(state)
        x_pos, y_pos = self.notation_to_normalized(spawn_cell["notation"])
        object_state = {
            "id": f"{object_name}_{state['next_object_id']}",
            "object": object_name,
            "col": spawn_cell["col"],
            "row": spawn_cell["row"],
            "notation": spawn_cell["notation"],
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
            notation=object_state["notation"],
            source=source,
        )

    def _draw_non_overlapping_spawn_cell(self, state: dict) -> dict:
        """Draw an object cell separated from Lex, corners, and active objects."""
        path_candidates = self._future_path_spawn_candidates(state)
        if path_candidates:
            return self.choice(path_candidates)

        reserved_notations = set(self.CORNER_NOTATION.values())
        min_cell_distance = 3
        for _ in range(30):
            spawn_cell = self.draw_spawn_cell()
            notation = spawn_cell["notation"]
            if notation in reserved_notations:
                continue
            if self.notation_distance(notation, state["lex"]["notation"]) < min_cell_distance:
                continue
            has_overlap = any(
                self.notation_distance(notation, obj["notation"]) < min_cell_distance
                for obj in state["active_objects"]
            )
            if not has_overlap:
                return spawn_cell

        return self.draw_spawn_cell()

    def _future_path_spawn_candidates(self, state: dict) -> list[dict]:
        """Prefer object cells a live ball can actually reach soon."""
        reserved_notations = set(self.CORNER_NOTATION.values())
        min_cell_distance = 3
        candidates = []
        future_balls = [state["lex"], *state["clones"]]
        for source_ball in future_balls:
            ball = dict(source_ball)
            for step_index in range(1, 90):
                step = self.advance_lex_path(ball)
                notation = step["to"]
                if step_index < 8 or notation in reserved_notations:
                    continue
                if any(
                    self.notation_distance(notation, obj["notation"]) < min_cell_distance
                    for obj in state["active_objects"]
                ):
                    continue
                candidates.append({
                    "col": ball["col"],
                    "row": ball["row"],
                    "notation": notation,
                })

        return candidates

    def _resolve_due_objects(self, state: dict) -> None:
        """Resolve any objects whose collision window has been reached."""
        due_collisions = []
        for obj in state["active_objects"]:
            if obj["resolve_turn"] > state["turn"]:
                continue
            collector = self._find_object_collector(state, obj)
            if collector is not None:
                due_collisions.append((obj, collector))

        for obj, collector in due_collisions:
            if state["finished"]:
                break
            if obj not in state["active_objects"]:
                continue
            self._resolve_object(state, obj, collector)
            state["active_objects"] = [active for active in state["active_objects"] if active["id"] != obj["id"]]

    def _find_object_collector(self, state: dict, object_state: dict) -> dict | None:
        """Return the first live ball close enough to collect a notation object."""
        collectors = []
        if state["main_alive"]:
            collectors.append({"id": "main", **state["lex"]})
        collectors.extend(state["clones"])

        for collector in collectors:
            if (
                self.notation_distance(collector["notation"], object_state["notation"])
                <= self.OBJECT_HIT_RADIUS_CELLS
            ):
                return collector
        return None

    def _object_resolve_event(
        self,
        state: dict,
        object_state: dict,
        collector: dict,
        *,
        result: str,
        **payload,
    ) -> None:
        """Emit an object resolution with the authoritative Lex/object notation."""
        object_resolve_event(
            self,
            object_id=object_state["id"],
            object_name=object_state["object"],
            turn=state["turn"],
            result=result,
            lexAt=state["lex"]["notation"],
            objectAt=object_state["notation"],
            collectorId=collector["id"],
            collectorAt=collector["notation"],
            **payload,
        )

    def _resolve_object(self, state: dict, object_state: dict, collector: dict) -> None:
        """Apply a single object effect to the round state."""
        object_name = object_state["object"]
        bet_cost = state["bet_cost"]

        if object_name == "coin":
            added_amount = self.COIN_BONUS * bet_cost
            state["tumble_value"] = self.round_amount(state["tumble_value"] + added_amount)
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="collect",
                amount=self.to_cents(added_amount),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "diamond":
            added_amount = self.DIAMOND_BONUS * bet_cost
            state["tumble_value"] = self.round_amount(state["tumble_value"] + added_amount)
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="collect",
                amount=self.to_cents(added_amount),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "blue_blob":
            previous_tumble = state["tumble_value"]
            state["tumble_value"] = self.round_amount(state["tumble_value"] * 0.5)
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="halve",
                delta=self.to_cents(state["tumble_value"] - previous_tumble),
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "chest":
            chest_multiplier = self.draw_chest_multiplier()
            state["tumble_value"] = self.round_amount(state["tumble_value"] * chest_multiplier)
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="multiply",
                multiplier=chest_multiplier,
                tumbleValue=self.to_cents(state["tumble_value"]),
            )
            return

        if object_name == "clone_orb":
            clone = self._add_clone(state, object_state, collector)
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="spawnClone",
                ballId=clone["id"],
                hitsRemaining=clone["hitsRemaining"],
                cloneCount=len(state["clones"]),
                cloneStart=clone["notation"],
                cloneVector={"dx": clone["dx"], "dy": clone["dy"]},
            )
            return

        if object_name == "heart":
            state["shield_count"] += 1
            self._object_resolve_event(
                state,
                object_state,
                collector,
                result="shield",
                shieldCount=state["shield_count"],
            )
            return

        if object_name == "escape":
            payout = state["tumble_value"] * state["mode_multiplier"]
            self._object_resolve_event(
                state,
                object_state,
                collector,
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
            target_ball = self._choose_slayer_target(state, collector)
            if target_ball is None:
                self._object_resolve_event(
                    state,
                    object_state,
                    collector,
                    result="noTarget",
                )
                return

            if target_ball == "main" and state["shield_count"] > 0:
                state["shield_count"] -= 1
                self._object_resolve_event(
                    state,
                    object_state,
                    collector,
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

            self._object_resolve_event(
                state,
                object_state,
                collector,
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

    def _add_clone(self, state: dict, object_state: dict, collector: dict) -> dict:
        """Add a new clone ball and return its state."""
        clone = self._create_clone_state(
            clone_id=f"clone_{state['next_clone_id']}",
            source_lex=collector,
            hits_remaining=self.CLONE_LIFETIME,
            spawn_notation=object_state["notation"],
            vector_index=state["next_clone_id"],
        )
        state["next_clone_id"] += 1
        state["clones"].append(clone)
        return clone

    def _create_clone_state(
        self,
        *,
        clone_id: str,
        source_lex: dict,
        hits_remaining: int,
        vector_index: int = 0,
        spawn_notation: str | None = None,
    ) -> dict:
        """Create a clone with its own board position and vector."""
        spawn_cell = notation_to_cell(spawn_notation or source_lex["notation"])
        vector_options = [
            {"dx": -source_lex["dy"], "dy": source_lex["dx"]},
            {"dx": source_lex["dy"], "dy": -source_lex["dx"]},
            {"dx": -source_lex["dx"], "dy": source_lex["dy"]},
            {"dx": source_lex["dx"], "dy": -source_lex["dy"]},
        ]
        vector = vector_options[vector_index % len(vector_options)]
        return {
            "id": clone_id,
            "col": spawn_cell["col"],
            "row": spawn_cell["row"],
            "dx": vector["dx"],
            "dy": vector["dy"],
            "notation": spawn_notation or source_lex["notation"],
            "hitsRemaining": hits_remaining,
        }

    def _clone_snapshot(self, clone: dict, step: dict | None = None) -> dict:
        """Return the clone state in book-event form."""
        snapshot = {
            "id": clone["id"],
            "notation": clone["notation"],
            "from": step["from"] if step else clone["notation"],
            "to": step["to"] if step else clone["notation"],
            "alive": True,
        }
        if step and len(step["path"]) > 2:
            snapshot["path"] = step["path"]
        if step is None or step["bounced"]:
            snapshot["vector"] = {"dx": clone["dx"], "dy": clone["dy"]}
            snapshot["hitsRemaining"] = clone["hitsRemaining"]
        if step and step["bounced"]:
            snapshot["bounced"] = True
        return snapshot

    def _clone_snapshots(self, clones: list[dict]) -> list[dict]:
        """Return all live clone states in book-event form."""
        return [self._clone_snapshot(clone) for clone in clones]

    def _maybe_hit_corner(self, state: dict) -> None:
        """Resolve a winning corner only when Lex reaches its notation."""
        corner_name = self.corner_for_notation(state["lex"]["notation"])
        if corner_name is None:
            return
        corner_multiplier = state["corners"].get(corner_name)
        if corner_multiplier is None or self._live_ball_count(state) <= 0:
            return

        payout = state["tumble_value"] * state["mode_multiplier"] * corner_multiplier
        self._finish_round(
            state,
            reason="cornerHit",
            payout=payout,
            corner=corner_name,
            cornerMultiplier=corner_multiplier,
            cornerAt=state["lex"]["notation"],
        )

    def _choose_slayer_target(self, state: dict, collector: dict | None = None) -> str | None:
        """Choose which live ball the slayer destroys."""
        if collector is not None:
            collector_id = collector.get("id")
            if collector_id == "main" and state["main_alive"]:
                return "main"
            if any(clone["id"] == collector_id for clone in state["clones"]):
                return collector_id

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
        state["payout"] = round(max(payout, 0.0), 1)
        state["end_reason"] = reason
        state["end_meta"] = meta
        state["active_objects"] = []

    @staticmethod
    def random() -> float:
        """Wrapper kept local for easier future test overrides."""
        from random import random

        return random()

    @staticmethod
    def choice(values: list):
        """Wrapper kept local for easier future test overrides."""
        from random import choice

        return choice(values)
