"""Balance simulated Lex Looter lookup tables to their configured RTP targets."""

from __future__ import annotations

from fractions import Fraction
from math import exp, fsum
from pathlib import Path


TOTAL_WEIGHT_SCALE = 1 << 60


def _target_cents(betmode) -> Fraction:
    """Return the exact expected payout, in lookup-table cents, for one round."""
    return Fraction(str(betmode.get_cost())) * Fraction(str(betmode.get_rtp())) * 100


def _weighted_mean(payouts: list[int], score: float) -> float:
    """Calculate a stable exponentially tilted payout mean."""
    log_weights = [score * payout for payout in payouts]
    maximum = max(log_weights)
    relative_weights = [exp(max(log_weight - maximum, -745.0)) for log_weight in log_weights]
    return fsum(payout * weight for payout, weight in zip(payouts, relative_weights)) / fsum(relative_weights)


def _find_score(payouts: list[int], target: float) -> float:
    """Find an exponential tilt that makes the simulated mean reach target."""
    uniform_mean = fsum(payouts) / len(payouts)
    if abs(uniform_mean - target) < 1e-12:
        return 0.0

    if uniform_mean < target:
        low, high = 0.0, 1e-7
        while _weighted_mean(payouts, high) < target:
            high *= 2
    else:
        low, high = -1e-7, 0.0
        while _weighted_mean(payouts, low) > target:
            low *= 2

    for _ in range(100):
        middle = (low + high) / 2
        mean = _weighted_mean(payouts, middle)
        if mean < target:
            low = middle
        else:
            high = middle
    return (low + high) / 2


def _refine_weights(weights: list[int], payouts: list[int], target: Fraction) -> None:
    """Correct integer-rounding drift without removing any simulated outcome."""
    target_numerator = target.numerator
    target_denominator = target.denominator

    for _ in range(4):
        total_weight = sum(weights)
        weighted_payout = sum(weight * payout for weight, payout in zip(weights, payouts))
        error = weighted_payout * target_denominator - total_weight * target_numerator
        if error == 0:
            return

        best: tuple[int, int, int] | None = None
        for index, payout in enumerate(payouts):
            coefficient = payout * target_denominator - target_numerator
            if coefficient == 0 or (error > 0) == (coefficient > 0):
                continue
            quotient, remainder = divmod(abs(error), abs(coefficient))
            for added_weight in (quotient, quotient + 1):
                if added_weight <= 0:
                    continue
                candidate_error = abs(error + added_weight * coefficient)
                candidate = (candidate_error, index, added_weight)
                if best is None or candidate < best:
                    best = candidate

        if best is None:
            return
        _, index, added_weight = best
        weights[index] += added_weight


def balance_lookup_table(source: Path, destination: Path, betmode) -> dict:
    """Write a weighted lookup table with the exact configured RTP target."""
    rows: list[tuple[str, int]] = []
    with source.open(encoding="utf-8") as input_file:
        for line in input_file:
            book_id, _, payout = line.strip().split(",")
            rows.append((book_id, int(float(payout))))

    if not rows:
        raise RuntimeError(f"Cannot balance empty lookup table: {source}")

    payouts = [payout for _, payout in rows]
    target = _target_cents(betmode)
    score = _find_score(payouts, float(target))
    log_weights = [score * payout for payout in payouts]
    maximum = max(log_weights)
    relative_weights = [exp(max(log_weight - maximum, -745.0)) for log_weight in log_weights]
    scale = TOTAL_WEIGHT_SCALE / fsum(relative_weights)
    weights = [max(1, int(round(relative_weight * scale))) for relative_weight in relative_weights]
    _refine_weights(weights, payouts, target)

    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as output_file:
        for (book_id, payout), weight in zip(rows, weights):
            output_file.write(f"{book_id},{weight},{payout}\n")

    total_weight = sum(weights)
    weighted_payout = sum(weight * payout for weight, payout in zip(weights, payouts))
    target_rtp = float(target / (Fraction(str(betmode.get_cost())) * 100))
    achieved_rtp = weighted_payout / total_weight / (float(betmode.get_cost()) * 100)
    return {
        "mode": betmode.get_name(),
        "books": len(rows),
        "target_rtp": target_rtp,
        "achieved_rtp": achieved_rtp,
        "target_payout_cents": float(target),
        "achieved_payout_cents": weighted_payout / total_weight,
        "tilt_score": score,
    }
