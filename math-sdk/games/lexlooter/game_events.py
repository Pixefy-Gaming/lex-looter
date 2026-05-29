"""Custom book events for the Lex Looter math game."""

from copy import deepcopy


def add_game_event(gamestate, event_type: str, **payload) -> None:
	"""Append a custom Lex Looter event to the current book."""
	event = {
		"index": len(gamestate.book.events),
		"type": event_type,
	}
	event.update(deepcopy(payload))
	gamestate.book.add_event(event)


def round_start_event(
	gamestate,
	*,
	mode_name: str,
	bet_cost: float,
	mode_multiplier: float,
	clone_count: int,
	starts_with_slayer: bool,
) -> None:
	add_game_event(
		gamestate,
		"roundStart",
		mode=mode_name,
		betCost=gamestate.to_cents(bet_cost),
		modeMultiplier=mode_multiplier,
		cloneCount=clone_count,
		startsWithSlayer=starts_with_slayer,
	)


def corner_update_event(gamestate, *, main_bounces: int, corners: dict) -> None:
	add_game_event(
		gamestate,
		"cornerUpdate",
		mainBounces=main_bounces,
		corners=corners,
	)


def bounce_update_event(
	gamestate,
	*,
	turn: int,
	main_bounces: int,
	tumble_value: float,
	main_alive: bool,
	clone_count: int,
	mode_multiplier: float,
) -> None:
	add_game_event(
		gamestate,
		"bounceUpdate",
		turn=turn,
		mainBounces=main_bounces,
		tumbleValue=gamestate.to_cents(tumble_value),
		mainAlive=main_alive,
		cloneCount=clone_count,
		modeMultiplier=mode_multiplier,
	)


def object_spawn_event(
	gamestate,
	*,
	object_id: str,
	object_name: str,
	turn: int,
	x: float,
	y: float,
	source: str,
) -> None:
	add_game_event(
		gamestate,
		"objectSpawn",
		objectId=object_id,
		object=object_name,
		turn=turn,
		x=x,
		y=y,
		source=source,
	)


def object_resolve_event(
	gamestate,
	*,
	object_id: str,
	object_name: str,
	turn: int,
	result: str,
	**payload,
) -> None:
	add_game_event(
		gamestate,
		"objectResolve",
		objectId=object_id,
		object=object_name,
		turn=turn,
		result=result,
		**payload,
	)


def clone_expire_event(
	gamestate,
	*,
	ball_id: str,
	turn: int,
	added_amount: float,
	tumble_value: float,
) -> None:
	add_game_event(
		gamestate,
		"cloneExpire",
		ballId=ball_id,
		turn=turn,
		addedAmount=gamestate.to_cents(added_amount),
		tumbleValue=gamestate.to_cents(tumble_value),
	)


def round_end_event(
	gamestate,
	*,
	reason: str,
	total_win: float,
	tumble_value: float,
	main_bounces: int,
	mode_multiplier: float,
	**payload,
) -> None:
	add_game_event(
		gamestate,
		"roundEnd",
		reason=reason,
		totalWin=gamestate.to_cents(total_win),
		tumbleValue=gamestate.to_cents(tumble_value),
		mainBounces=main_bounces,
		modeMultiplier=mode_multiplier,
		**payload,
	)
