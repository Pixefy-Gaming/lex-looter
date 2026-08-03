<script lang="ts">
	import { stateBet } from 'state-shared';
	import { bookEventAmountToNormalisedAmount, numberToCurrencyString } from 'utils-shared';
	import { getContext } from '../game/context';
	import { getLexRoundDisplayWin } from '../game/lexWin';
	import type { LexRoundEndReason } from '../game/typesBookEvent';

	type ReplayRound = {
		mode?: string;
		payoutMultiplier?: number;
		costMultiplier?: number;
		payout?: number;
		totalWin?: number;
		winAmount?: number;
		state?: Record<string, unknown>[];
	};

	type Props = {
		onstart: () => void;
		starting?: boolean;
		again?: boolean;
	};

	let { onstart, starting = false, again = false }: Props = $props();
	const { stateLayoutDerived } = getContext();

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const modeLabel = (mode: string | undefined) => (mode || 'base').replace(/_/g, ' ').toLowerCase();
	const normalizeMultiplier = (value: number) => (value > 50 ? value / 100 : value);
	const firstFiniteNumber = (...values: unknown[]) =>
		values.map(Number).find((value) => Number.isFinite(value));
	const replayBookAmount = (events: Record<string, unknown>[] | undefined) => {
		if (!Array.isArray(events)) return 0;

		const roundEnd = [...events]
			.reverse()
			.find((event) => event?.type === 'roundEnd' && Number.isFinite(Number(event.totalWin)));
		if (roundEnd) {
			return getLexRoundDisplayWin({
				reason:
					typeof roundEnd.reason === 'string'
						? (roundEnd.reason as LexRoundEndReason)
						: undefined,
				totalWin: Number(roundEnd.totalWin),
				tumbleValue: Number.isFinite(Number(roundEnd.tumbleValue))
					? Number(roundEnd.tumbleValue)
					: Number(roundEnd.totalWin),
			});
		}

		return events.reduce((largestAmount, event) => {
			const amount = firstFiniteNumber(event?.totalWin, event?.amount);
			return amount === undefined ? largestAmount : Math.max(largestAmount, amount);
		}, 0);
	};
	const replayRound = $derived(
		((stateBet.replayBet ?? stateBet.betToResume) as ReplayRound | null) ?? null,
	);
	const activeMode = $derived(replayRound?.mode || stateBet.activeBetModeKey || 'BASE');
	const costMultiplier = $derived(replayRound?.costMultiplier || 1);
	const betAmount = $derived(stateBet.wageredBetAmount || stateBet.betAmount);
	const realCost = $derived(betAmount * costMultiplier);
	const bookAmount = $derived(replayBookAmount(replayRound?.state));
	const payout = $derived(
		bookAmount > 0
			? bookEventAmountToNormalisedAmount(bookAmount)
			: betAmount * normalizeMultiplier(replayRound?.payoutMultiplier || 0),
	);
	const payoutMultiplier = $derived(
		betAmount > 0 ? payout / betAmount : normalizeMultiplier(replayRound?.payoutMultiplier || 0),
	);
	const buttonLabel = $derived(starting ? 'Starting' : again ? 'Play Again' : 'Start Replay');
	const replayTitle = $derived(again ? 'Replay Complete' : 'Replay');
	const formatMultiplier = (value: number) => `${Number(value.toFixed(6))}×`;
</script>

<div class="replay-intro-overlay" class:finished={again}></div>
<div class="replay-intro-wrapper {layoutType}">
	<section
		class="replay-intro-card"
		aria-label="Replay details"
		aria-modal="true"
		aria-labelledby="replay-intro-title"
		role="dialog"
	>
		<div class="replay-intro-title" id="replay-intro-title">{replayTitle}</div>
		<div class="replay-intro-heading">BET REPLAY</div>

		<div class="replay-intro-panel">
			<div class="replay-intro-row">
				<span class="replay-intro-label">MODE</span>
				<span class="replay-intro-value">{modeLabel(activeMode)}</span>
			</div>
			<div class="replay-intro-divider"></div>
			<div class="replay-intro-row">
				<span class="replay-intro-label">BASE BET</span>
				<span class="replay-intro-value">{numberToCurrencyString(betAmount)}</span>
			</div>
			<div class="replay-intro-row">
				<span class="replay-intro-label">COST MULTIPLIER</span>
				<span class="replay-intro-value">{formatMultiplier(costMultiplier)}</span>
			</div>
			<div class="replay-intro-row highlight">
				<span class="replay-intro-label">TOTAL BET COST</span>
				<span class="replay-intro-value">{numberToCurrencyString(realCost)}</span>
			</div>
			<div class="replay-intro-divider"></div>
			<div class="replay-intro-row">
				<span class="replay-intro-label">PAYOUT MULTIPLIER</span>
				<span class="replay-intro-value">{formatMultiplier(payoutMultiplier)}</span>
			</div>
			<div class="replay-intro-row highlight">
				<span class="replay-intro-label">TOTAL WIN</span>
				<span class="replay-intro-value">{numberToCurrencyString(payout, { exactWin: true })}</span>
			</div>
		</div>

		<button class="replay-start-btn" onclick={onstart} disabled={starting}>
			<span aria-hidden="true">▶</span>
			{buttonLabel}
		</button>
		<div class="replay-intro-note">
			This is a replay of a previous bet round. No bets will be placed.
		</div>
	</section>
</div>

<style>
	.replay-intro-overlay {
		position: fixed;
		inset: 0;
		z-index: 2999;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		pointer-events: none;
	}

	.replay-intro-overlay.finished {
		background: rgba(0, 0, 0, 0.62);
		backdrop-filter: blur(3px) saturate(0.75);
		-webkit-backdrop-filter: blur(3px) saturate(0.75);
	}

	.replay-intro-wrapper {
		--lex-green: #00ff50;
		--lex-purple: #9900ff;
		--lex-green-soft: rgba(0, 255, 80, 0.14);
		--lex-green-muted: rgba(0, 255, 80, 0.72);
		position: fixed;
		inset: 0;
		z-index: 3000;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100dvw;
		height: 100dvh;
		padding: clamp(12px, 3vmin, 28px);
		box-sizing: border-box;
		pointer-events: none;
	}

	.replay-intro-wrapper.portrait {
		padding: clamp(14px, 4vw, 32px);
	}

	.replay-intro-card {
		width: min(500px, 100%);
		max-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 14px 20px 16px;
		box-sizing: border-box;
		border: 1px solid rgba(0, 255, 80, 0.55);
		border-radius: 8px;
		background:
			linear-gradient(180deg, rgba(0, 255, 80, 0.06), transparent 38%),
			rgba(5, 10, 12, 0.94);
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.8),
			0 0 0 2px rgba(153, 0, 255, 0.55),
			0 0 30px rgba(0, 255, 80, 0.16);
		color: #ffffff;
		font-family: 'Poppins', sans-serif;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		pointer-events: auto;
		scrollbar-width: none;
	}

	.replay-intro-title,
	.replay-intro-label,
	.replay-start-btn {
		text-transform: uppercase;
	}

	.replay-intro-title {
		color: var(--lex-green);
		font-size: 12px;
		font-weight: 900;
		letter-spacing: 1.5px;
		text-align: center;
	}

	.replay-intro-heading {
		color: #fff;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.replay-intro-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		padding: 12px;
		box-sizing: border-box;
		border-radius: 8px;
		background: rgba(3, 7, 14, 0.52);
	}

	.replay-intro-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 2px 0;
		font-size: 11px;
	}

	.replay-intro-row.highlight {
		margin: 0 -2px;
		padding: 8px 10px;
		border-radius: 7px;
		background:
			linear-gradient(90deg, rgba(0, 255, 80, 0.14), rgba(153, 0, 255, 0.1)),
			rgba(255, 255, 255, 0.03);
	}

	.replay-intro-divider {
		height: 1px;
		margin: 2px 0;
		background: rgba(255, 255, 255, 0.18);
	}

	.replay-intro-label {
		flex: 0 0 auto;
		color: rgba(255, 255, 255, 0.65);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		white-space: nowrap;
	}

	.replay-intro-value {
		min-width: 0;
		color: #ffffff;
		font-size: 11px;
		font-weight: 700;
		overflow-wrap: anywhere;
		text-align: right;
	}

	.replay-intro-row.highlight .replay-intro-value {
		color: var(--lex-green);
		font-size: 13px;
	}

	.replay-start-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		margin-top: 2px;
		padding: 10px 20px;
		border: 1px solid rgba(0, 255, 80, 0.7);
		border-radius: 8px;
		background: var(--lex-green);
		color: #031009;
		cursor: pointer;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 1px;
		transition:
			background 0.2s,
			transform 0.1s;
	}

	.replay-start-btn:hover {
		background: #42ff78;
		transform: scale(1.03);
	}

	.replay-start-btn:active {
		transform: scale(0.98);
	}

	.replay-start-btn:disabled {
		cursor: default;
		opacity: 0.72;
		transform: none;
	}

	.replay-intro-note {
		color: rgba(255, 255, 255, 0.45);
		font-size: 9px;
		line-height: 1.3;
		text-align: center;
	}

	@media (max-height: 600px) and (orientation: landscape) {
		.replay-intro-wrapper {
			padding: 12px;
		}

		.replay-intro-card {
			width: min(500px, 100%);
			gap: 6px;
			padding: 10px 16px 12px;
		}

		.replay-intro-title {
			font-size: 10px;
		}

		.replay-intro-heading {
			font-size: 17px;
		}

		.replay-intro-panel {
			gap: 5px;
			padding: 8px 10px;
		}

		.replay-intro-row,
		.replay-intro-label,
		.replay-intro-value {
			font-size: 10px;
		}

		.replay-intro-row.highlight {
			padding: 5px 8px;
		}

		.replay-intro-row.highlight .replay-intro-value {
			font-size: 12px;
		}

		.replay-start-btn {
			padding: 8px 16px;
			font-size: 10px;
		}

		.replay-intro-note {
			font-size: 8px;
		}
	}

	@media (max-height: 350px) and (orientation: landscape) {
		.replay-intro-wrapper {
			padding: 6px;
		}

		.replay-intro-card {
			width: min(360px, 100%);
			gap: 3px;
			padding: 6px 12px 7px;
		}

		.replay-intro-title,
		.replay-intro-heading,
		.replay-intro-row {
			font-size: 9px;
		}

		.replay-intro-panel {
			gap: 2px;
			padding: 5px 8px;
		}

		.replay-intro-row.highlight {
			padding: 2px 5px;
		}

		.replay-intro-row.highlight .replay-intro-value {
			font-size: 11px;
		}

		.replay-start-btn {
			padding: 6px 15px;
			font-size: 10px;
		}
	}

	@media (max-width: 520px) and (orientation: portrait) {
		.replay-intro-card {
			width: min(500px, 100%);
			padding: 14px 18px 16px;
		}

		.replay-intro-heading {
			font-size: 18px;
		}
	}

	@media (max-width: 420px) and (orientation: portrait) {
		.replay-intro-card {
			padding: 12px 14px 14px;
		}
	}

	@media (max-width: 360px) {
		.replay-intro-label {
			font-size: 10px;
		}

		.replay-intro-value {
			font-size: 10px;
		}
	}
</style>
