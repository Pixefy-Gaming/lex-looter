"""Mock RGS Server - Bridge between web-sdk and math-sdk."""

import os
import re
import sys
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add math-sdk to path
MATH_SDK_PATH = os.path.join(os.path.dirname(__file__), '..', 'math-sdk')
GAME_ID = os.getenv('MATH_SDK_GAME_ID', 'lexlooter')
GAME_PATH = os.path.join(MATH_SDK_PATH, 'games', GAME_ID)
sys.path.insert(0, MATH_SDK_PATH)
sys.path.insert(0, GAME_PATH)

# Import math-sdk game engine
try:
    from game_config import GameConfig
    from gamestate import GameState
    print("✅ Successfully imported math-sdk GameState")
except ImportError as e:
    print(f"❌ Failed to import math-sdk: {e}")
    GameConfig = None
    GameState = None

app = Flask(__name__)
CORS(app)  # Enable CORS for web-sdk frontend

# In-memory session storage
sessions = {}
INITIAL_BALANCE = 1000000000  # $1000 with 6 decimal precision
API_AMOUNT_MULTIPLIER = 1_000_000
MIN_BET = 10_000  # $0.01
MAX_BET = 1_000_000_000  # $1000
STEP_BET = 10_000  # $0.01
SUPPORTED_BET_AMOUNTS = [
    0.01,
    0.02,
    0.05,
    0.10,
    0.20,
    0.40,
    0.60,
    0.80,
    1,
    2,
    5,
    10,
    25,
    50,
    75,
    100,
    200,
    500,
    800,
    1000,
]
SUPPORTED_BET_LEVELS = [int(round(amount * API_AMOUNT_MULTIPLIER)) for amount in SUPPORTED_BET_AMOUNTS]

INVALID_REQUEST_RESPONSE = {
    "error": "ERR_VAL",
    "message": "Invalid request.",
}

INVALID_SESSION_RESPONSE = {
    "error": "ERR_IS",
    "message": "Invalid session. Call /wallet/authenticate before wallet requests.",
}

MODE_ALIAS_OVERRIDES = {
    "default": "base",
    "no slayer": "no_slayer",
    "no-slayer": "no_slayer",
    "noslayer": "no_slayer",
    "start clone": "start_clone",
    "start-clone": "start_clone",
    "startclone": "start_clone",
    "lucky lex": "lucky_lex",
    "lucky-lex": "lucky_lex",
    "luckylex": "lucky_lex",
}


def normalize_mode_key(value):
    """Convert user-facing mode labels into a stable internal lookup key."""
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def get_authenticated_session(session_id):
    """Return an authenticated session or the Stake Engine invalid-session error."""
    if not session_id or session_id not in sessions:
        return None, (jsonify(INVALID_SESSION_RESPONSE), 400)
    return sessions[session_id], None


def invalid_request(message):
    return jsonify({**INVALID_REQUEST_RESPONSE, "message": message}), 400


def parse_bet_amount(raw_amount):
    try:
        amount = int(raw_amount)
    except (TypeError, ValueError):
        return None, "Bet amount must be an integer with six decimal places of precision."

    if amount < MIN_BET or amount > MAX_BET:
        return None, f"Bet amount must be between {MIN_BET} and {MAX_BET}."

    if amount % STEP_BET != 0:
        return None, f"Bet amount must be divisible by stepBet {STEP_BET}."

    return amount, None


class Session:
    """Game session with real math-sdk integration."""
    
    def __init__(self, session_id):
        self.session_id = session_id
        self.balance = INITIAL_BALANCE
        self.currency = "USD"
        self.language = "en"
        self.current_base_bet_amount = None
        self.current_bet_amount = None
        self.current_book = None
        self.current_book_raw = None
        self.round_active = False
        self.round_id = None
        self.win_amount = 0
        self.current_event_index = 0
        self.current_mode = 'BASE'
        self.game_state = None
        self.config = None
        
    def initialize_game(self):
        """Initialize math-sdk game instance."""
        if GameConfig and GameState and not self.config:
            try:
                self.config = GameConfig()
                self.game_state = GameState(self.config)
                print(f"✅ Initialized game for session {self.session_id}")
            except Exception as e:
                print(f"❌ Failed to initialize game: {e}")

    def get_available_betmodes(self):
        """Return the current math-sdk betmodes keyed by name."""
        if not self.config:
            self.initialize_game()
        if not self.config:
            return {}
        return {betmode.get_name(): betmode for betmode in self.config.bet_modes}

    def get_base_mode_name(self):
        """Return the primary mode used as the cost baseline."""
        available_betmodes = self.get_available_betmodes()
        if "base" in available_betmodes:
            return "base"
        return next(iter(available_betmodes), None)

    def resolve_mode_name(self, requested_mode):
        """Resolve a frontend mode label to an available math-sdk betmode."""
        available_betmodes = self.get_available_betmodes()
        if not available_betmodes:
            return None

        aliases = {}
        for mode_name in available_betmodes:
            normalized_name = normalize_mode_key(mode_name)
            aliases[normalized_name] = mode_name
            aliases[mode_name.lower()] = mode_name
            aliases[mode_name.upper()] = mode_name

        for alias, mode_name in MODE_ALIAS_OVERRIDES.items():
            if mode_name in available_betmodes:
                aliases[normalize_mode_key(alias)] = mode_name

        normalized_requested = normalize_mode_key(requested_mode)
        return aliases.get(normalized_requested, self.get_base_mode_name())

    def get_mode_cost_multiplier(self, mode_name):
        """Return the buy cost multiplier relative to the base mode cost."""
        available_betmodes = self.get_available_betmodes()
        base_mode_name = self.get_base_mode_name()
        if mode_name not in available_betmodes or base_mode_name not in available_betmodes:
            return 1.0

        base_cost = float(available_betmodes[base_mode_name].get_cost())
        if base_cost <= 0:
            return 1.0

        return float(available_betmodes[mode_name].get_cost()) / base_cost

    def get_mode_display_name(self, mode_name):
        """Return the RGS-facing display form of a mode name."""
        return str(mode_name).upper()

    def get_rgs_bet_modes_config(self):
        """Expose math-sdk betmodes in the authenticate payload."""
        available_betmodes = self.get_available_betmodes()
        bet_modes = {}
        for mode_name, betmode in available_betmodes.items():
            display_name = self.get_mode_display_name(mode_name)
            bet_modes[display_name] = {
                "mode": display_name,
                "costMultiplier": self.get_mode_cost_multiplier(mode_name),
                "feature": bool(betmode.get_feature() or betmode.get_buybonus()),
            }
        return bet_modes
    
    def run_game_round(self, sim_number=None, mode='base'):
        """Run actual game round using math-sdk."""
        if not self.game_state:
            self.initialize_game()
        
        if not self.game_state:
            return None
            
        try:
            import random as rnd
            if sim_number is None:
                sim_number = rnd.randint(1, 1000000)

            resolved_mode = self.resolve_mode_name(mode)
            if resolved_mode is None:
                raise RuntimeError("No betmodes available from math-sdk config")

            self.game_state.betmode = resolved_mode
            
            # Apply per-betmode wincap (mirrors run_sims.py behaviour)
            betmode_obj = self.game_state.get_current_betmode()
            self.game_state.config.wincap = betmode_obj.get_wincap()
            
            # Pick criteria based on distribution quotas
            distributions = betmode_obj.get_distributions()
            roll = rnd.random()
            cumulative = 0
            for dist in distributions:
                if dist._quota is None:
                    continue
                cumulative += dist._quota
                if roll < cumulative:
                    self.game_state.criteria = dist._criteria
                    break
            else:
                self.game_state.criteria = distributions[-1]._criteria
            
            # Run the actual game simulation
            self.game_state.run_spin(sim_number)
            
            # Get the book data
            book_data = self.game_state.book.to_json()
            
            return book_data
            
        except Exception as e:
            print(f"❌ Error running game round: {e}")
            import traceback
            traceback.print_exc()
            return None


@app.route('/wallet/authenticate', methods=['POST'])
def authenticate():
    """Authenticate endpoint - initialize or resume session."""
    data = request.json
    session_id = data.get('sessionID') or data.get('playerID')
    language = data.get('language', 'en')
    currency = data.get('currency', 'USD')
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in sessions:
        sessions[session_id] = Session(session_id)
        sessions[session_id].initialize_game()
    
    session = sessions[session_id]
    session.language = language
    session.currency = currency
    
    response = {
        "sessionID": session_id,
        "balance": {
            "amount": session.balance,
            "currency": session.currency
        },
        "config": {
            "gameID": GAME_ID,
            "minBet": MIN_BET,
            "maxBet": MAX_BET,
            "stepBet": STEP_BET,
            "defaultBetLevel": SUPPORTED_BET_LEVELS[0],
            "betLevels": SUPPORTED_BET_LEVELS,
            "betModes": session.get_rgs_bet_modes_config(),
            "jurisdiction": {
                "socialCasino": False,
                "disabledFullscreen": False,
                "disabledTurbo": False,
                "disabledSuperTurbo": False,
                "disabledAutoplay": False,
                "disabledSlamstop": False,
                "disabledSpacebar": False,
                "disabledBuyFeature": False,
                "displayNetPosition": False,
                "displayRTP": False,
                "displaySessionTimer": False,
                "minimumRoundDuration": 0,
            }
        }
    }
    
    # Resume active round if exists
    if session.round_active and session.current_book:
        response["round"] = {
            "roundID": session.round_id,
            "amount": session.current_base_bet_amount,
            "debitAmount": session.current_bet_amount,
            "payout": session.win_amount,
            "payoutMultiplier": session.current_book.get('payoutMultiplier', 0),
            "active": True,
            "mode": session.current_mode or "BASE",
            "event": str(session.current_event_index or 0),
            "state": session.current_book.get('events', []),  # web-sdk expects 'state'
        }
    
    print(f"✅ Authenticated: {session_id}, Balance: ${session.balance/1000000}")
    return jsonify(response)


@app.route('/wallet/play', methods=['POST'])
def play():
    """Place a bet and start a round - uses real math-sdk game engine."""
    data = request.json
    session_id = data.get('sessionID')
    amount, amount_error = parse_bet_amount(data.get('amount', SUPPORTED_BET_LEVELS[0]))
    if amount_error:
        return invalid_request(amount_error)

    mode = data.get('mode', 'BASE')

    session, invalid_session = get_authenticated_session(session_id)
    if invalid_session:
        return invalid_session

    resolved_mode = session.resolve_mode_name(mode)
    if resolved_mode is None:
        return invalid_request(f"Unsupported bet mode: {mode}")

    cost_multiplier = session.get_mode_cost_multiplier(resolved_mode)
    total_debit = int(round(amount * cost_multiplier, 0))

    # Check balance against TOTAL cost (base bet × cost multiplier)
    if session.balance < total_debit:
        return jsonify({"error": "ERR_IPB", "message": "Insufficient balance"}), 400

    # Deduct total cost
    session.balance -= total_debit
    session.current_base_bet_amount = amount
    session.current_bet_amount = total_debit
    session.round_id = str(uuid.uuid4())
    session.round_active = True
    session.current_mode = session.get_mode_display_name(resolved_mode)
    session.current_event_index = 0
    
    # Run actual game round using math-sdk
    book = session.run_game_round(mode=resolved_mode)
    
    if not book:
        # Restore balance if game failed
        session.balance += total_debit
        return jsonify({"error": "ERR_GEN", "message": "Game engine error"}), 500
    
    # Keep events as-is (web-sdk expects 'events' not 'state')
    session.current_book = book
    
    # Calculate win amount from actual game result
    # payoutMultiplier in book is in basis points (100 = 1x)
    payout_multiplier_raw = book.get('payoutMultiplier', 0)
    payout_multiplier_decimal = payout_multiplier_raw / 100.0
    win_amount = int(round(amount * payout_multiplier_decimal, 0))
    session.win_amount = win_amount

    events = book.get('events', [])
    round_end_event = next((event for event in reversed(events) if event.get('type') == 'roundEnd'), None)
    round_reason = round_end_event.get('reason', '') if round_end_event else ''
    
    # Match math-sdk mock_rgs response format
    # NOTE: 'state' is what the web-sdk expects (contains book events array)
    # 'active' indicates the round is ongoing
    # payoutMultiplier is returned in math/RGS integer format (100 = 1x).
    response = {
        "balance": {
            "amount": session.balance,
            "currency": session.currency
        },
        "round": {
            "roundID": session.round_id,
            "mode": session.current_mode,
            "amount": amount,
            "debitAmount": total_debit,
            "payoutMultiplier": payout_multiplier_raw,
            "payout": win_amount,
            "active": True,
            "state": book.get('events', []),  # web-sdk expects 'state' not 'events'
        }
    }
    
    all_events = book.get('events', [])
    event_types = [e.get('type') for e in all_events]
    print(
        f"🎰 Bet: ${amount/API_AMOUNT_MULTIPLIER:.2f} | Debit: ${total_debit/API_AMOUNT_MULTIPLIER:.2f} "
        f"| Payout: ${win_amount/API_AMOUNT_MULTIPLIER:.2f} | Mode: {session.current_mode}"
    )
    print(f"   End reason: {round_reason or 'unknown'} | Book payout raw: {payout_multiplier_raw}")
    print(f"📝 Events ({len(event_types)}): {event_types}")
    return jsonify(response)


@app.route('/wallet/end-round', methods=['POST'])
def end_round():
    """End the current round and add winnings from real game result."""
    data = request.json
    session_id = data.get('sessionID')
    
    session, invalid_session = get_authenticated_session(session_id)
    if invalid_session:
        return invalid_session
    
    if not session.round_active:
        return invalid_request("No active round.")
    
    # Add win amount to balance (calculated from actual game)
    session.balance += session.win_amount
    
    session.round_active = False
    session.current_base_bet_amount = None
    session.current_book = None
    session.round_id = None
    session.current_event_index = 0
    session.current_mode = 'BASE'
    
    response = {
        "balance": {
            "amount": session.balance,
            "currency": session.currency
        }
    }
    
    print(f"✅ Round ended | Final Balance: ${session.balance/1000000:.2f}")
    return jsonify(response)


@app.route('/wallet/balance', methods=['POST'])
def balance():
    """Get player's current balance."""
    data = request.json
    session_id = data.get('sessionID')
    
    session, invalid_session = get_authenticated_session(session_id)
    if invalid_session:
        return invalid_session
    
    response = {
        "balance": {
            "amount": session.balance,
            "currency": session.currency
        }
    }
    
    return jsonify(response)


@app.route('/bet/event', methods=['POST'])
def bet_event():
    """Trigger a book event (for features/bonuses) - returns real event from game."""
    data = request.json
    session_id = data.get('sessionID')
    event_index = int(data.get('event', 0))
    
    session, invalid_session = get_authenticated_session(session_id)
    if invalid_session:
        return invalid_session
    session.current_event_index = event_index + 1
    
    if not session.current_book:
        return invalid_request("No active book.")
    
    # Get events array from book
    all_events = session.current_book.get('events', [])
    
    if event_index < len(all_events):
        event = all_events[event_index]
        response = {
            "event": event,
            "eventIndex": event_index
        }
        event_type = event.get('type')
        print(f"📋 Event {event_index}: {event_type}")
        if event_type == 'winInfo':
            import json
            print(f"🔍 winInfo detail: {json.dumps(event, indent=2)}")
        return jsonify(response)
    
    return invalid_request("Invalid event index.")


@app.route('/api/teams/pixefy-gaming/approvals/<game_slug>', methods=['GET'])
def approvals(game_slug):
    """Approval check endpoint."""
    return jsonify({
        "status": "APPROVED",
        "team": "pixefy-gaming",
        "game": game_slug,
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "server": "mock-rgs",
        "game": GAME_ID,
        "sessions": len(sessions),
        "timestamp": datetime.now().isoformat()
    })


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎰 Mock RGS Server - Bridge to math-sdk")
    print("="*60)
    print(f"Server: http://localhost:3008")
    print(f"web-sdk URL: ?rgs_url=localhost:3008&sessionID=test-123")
    print(f"Math-SDK: {MATH_SDK_PATH}")
    print(f"Game Path: {GAME_PATH}")
    print(f"Game Engine: {'✅ Loaded' if GameState else '❌ Failed'}")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=3008, debug=True)
