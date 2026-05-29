#!/usr/bin/env python3
"""Quick test of mock-rgs endpoints."""

import requests
import json

BASE_URL = "http://localhost:3008"
SESSION_ID = "test-123"
MODES = ["base", "no_slayer", "start_clone", "lucky_lex"]

def test_authenticate():
    """Test authenticate endpoint."""
    print("\n🔐 Testing /wallet/authenticate...")
    response = requests.post(f"{BASE_URL}/wallet/authenticate", json={
        "sessionID": SESSION_ID,
        "language": "en"
    })
    data = response.json()
    print(f"✅ Balance: ${data['balance']['amount']/1000000:.2f}")
    print(f"   Session: {data['sessionID']}")
    return data

def test_play():
    """Test play endpoint with the current Lex Looter modes."""
    results = []
    for mode in MODES:
        print(f"\n🎰 Testing /wallet/play... mode={mode}")
        response = requests.post(f"{BASE_URL}/wallet/play", json={
            "sessionID": SESSION_ID,
            "amount": 1000000,
            "mode": mode,
        })
        data = response.json()
        round_data = data.get('round', {})
        state = round_data.get('state', [])
        round_end = next((event for event in reversed(state) if event.get('type') == 'roundEnd'), {})
        print(f"✅ Mode: {round_data.get('mode')}")
        print(f"   Base Bet: ${round_data.get('amount', 0)/1000000:.2f}")
        print(f"   Debit: ${round_data.get('debitAmount', 0)/1000000:.2f}")
        print(f"   Payout Multiplier Raw: {round_data.get('payoutMultiplier', 0)}")
        print(f"   Win: ${round_data.get('payout', 0)/1000000:.2f}")
        print(f"   Balance: ${data['balance']['amount']/1000000:.2f}")
        print(f"   Events: {len(state)}")
        print(f"   End Reason: {round_end.get('reason', 'unknown')}")
        results.append(data)

        test_end_round()

    return results

def test_end_round():
    """Test end-round endpoint."""
    print("\n✅ Testing /wallet/end-round...")
    response = requests.post(f"{BASE_URL}/wallet/end-round", json={
        "sessionID": SESSION_ID
    })
    data = response.json()
    print(f"✅ Final Balance: ${data['balance']['amount']/1000000:.2f}")
    return data

def test_health():
    """Test health check."""
    print("\n❤️  Testing /health...")
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    print(f"✅ Status: {data['status']}")
    print(f"   Active Sessions: {data['sessions']}")
    return data

if __name__ == "__main__":
    print("="*60)
    print("🧪 Mock RGS Server Test Suite")
    print("="*60)
    
    try:
        test_health()
        test_authenticate()
        test_play()
        
        print("\n" + "="*60)
        print("✅ All tests passed!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print("Make sure the server is running: ./start.sh")
