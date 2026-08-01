"""Mock RGS readiness checks for Lex Looter."""

import server


def setup_function():
    server.sessions.clear()
    server.replays.clear()


def post_json(client, path, payload):
    response = client.post(path, json=payload)
    return response.status_code, response.get_json()


def test_authenticate_returns_dynamic_config_and_social_currency():
    with server.app.test_client() as client:
        status, data = post_json(
            client,
            "/wallet/authenticate",
            {"sessionID": "social", "language": "en", "currency": "XSC", "social": True},
        )

    assert status == 200
    assert data["balance"]["currency"] == "XSC"
    assert data["config"]["jurisdiction"]["socialCasino"] is True
    assert data["config"]["betLevels"] == server.SUPPORTED_BET_LEVELS
    assert set(data["config"]["betModes"]) == {"BASE", "NO_SLAYER", "START_CLONE", "LUCKY_LEX"}
    assert data["config"]["betModes"]["START_CLONE"]["costMultiplier"] == 50.0


def test_active_round_restores_amount_and_mode_on_authenticate():
    with server.app.test_client() as client:
        post_json(client, "/wallet/authenticate", {"sessionID": "resume", "language": "en"})
        status, play_data = post_json(
            client,
            "/wallet/play",
            {"sessionID": "resume", "amount": 20_000, "mode": "NO_SLAYER"},
        )
        assert status == 200

        status, auth_data = post_json(
            client,
            "/wallet/authenticate",
            {"sessionID": "resume", "language": "en"},
        )

    assert status == 200
    assert auth_data["round"]["amount"] == 20_000
    assert auth_data["round"]["mode"] == "NO_SLAYER"
    assert auth_data["round"]["roundID"] == play_data["round"]["roundID"]


def test_replay_endpoint_returns_stored_round_with_display_multiplier():
    with server.app.test_client() as client:
        post_json(client, "/wallet/authenticate", {"sessionID": "replay-source", "language": "en"})
        status, play_data = post_json(
            client,
            "/wallet/play",
            {"sessionID": "replay-source", "amount": 10_000, "mode": "LUCKY_LEX"},
        )
        assert status == 200
        round_id = play_data["round"]["roundID"]

        response = client.get(
            f"/bet/replay/lexlooter/v1/LUCKY_LEX/{round_id}?currency=XGC&language=en&amount=10000"
        )
        replay_data = response.get_json()

    assert response.status_code == 200
    assert replay_data["event"] == round_id
    assert replay_data["amount"] == 10_000
    assert replay_data["costMultiplier"] == 100.0
    assert replay_data["mode"] == "LUCKY_LEX"
    assert isinstance(replay_data["state"], list)
    assert replay_data["payoutMultiplier"] == play_data["round"]["payoutMultiplier"] / 100.0


def test_insufficient_balance_rejects_without_creating_round():
    with server.app.test_client() as client:
        post_json(client, "/wallet/authenticate", {"sessionID": "poor", "language": "en"})
        status, data = post_json(
            client,
            "/wallet/play",
            {"sessionID": "poor", "amount": server.MAX_BET, "mode": "LUCKY_LEX"},
        )

    assert status == 400
    assert data["error"] == "ERR_IPB"
    assert server.sessions["poor"].round_active is False
    assert server.sessions["poor"].current_book is None
