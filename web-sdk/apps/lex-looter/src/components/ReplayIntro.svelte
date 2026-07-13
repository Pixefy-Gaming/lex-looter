<script lang="ts">
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared';

	type ReplayRound = {
		mode?: string;
		payoutMultiplier?: number;
		costMultiplier?: number;
		payout?: number;
	};

	type Props = {
		onstart: () => void;
		starting?: boolean;
		again?: boolean;
	};

	let { onstart, starting = false, again = false }: Props = $props();

	const modeLabel = (mode: string | undefined) => (mode || 'BASE').replace(/_/g, ' ').toUpperCase();
	const replayRound = $derived((stateBet.betToResume as ReplayRound | null) ?? null);
	const activeMode = $derived(replayRound?.mode || stateBet.activeBetModeKey || 'BASE');
	const costMultiplier = $derived(replayRound?.costMultiplier || 1);
	const payoutMultiplier = $derived(replayRound?.payoutMultiplier || 0);
	const betAmount = $derived(stateBet.wageredBetAmount || stateBet.betAmount);
	const realCost = $derived(betAmount * costMultiplier);
	const payout = $derived(betAmount * payoutMultiplier);
	const title = $derived(again ? 'Replay Complete' : 'Replay Ready');
	const buttonLabel = $derived(starting ? 'Starting' : again ? 'Play Again' : 'Start Replay');
</script>

<div class="replay-intro-overlay">
	<section class="replay-intro-card" aria-label="Replay details">
		<div class="replay-intro-kicker">LEX LOOTER</div>
		<div class="replay-intro-title">{title}</div>

		<div class="replay-intro-rows">
			<div class="replay-intro-row">
				<span class="replay-intro-label">Mode</span>
				<span class="replay-intro-value">{modeLabel(activeMode)}</span>
			</div>
			<div class="replay-intro-row">
				<span class="replay-intro-label">Bet</span>
				<span class="replay-intro-value">{numberToCurrencyString(betAmount)}</span>
			</div>
			{#if costMultiplier > 1}
				<div class="replay-intro-row">
					<span class="replay-intro-label">Cost</span>
					<span class="replay-intro-value">
						{numberToCurrencyString(realCost)}
						<span class="replay-cost-mult">({costMultiplier}x)</span>
					</span>
				</div>
			{/if}
			<div class="replay-intro-row">
				<span class="replay-intro-label">Multiplier</span>
				<span class="replay-intro-value">{payoutMultiplier.toLocaleString()}x</span>
			</div>
			<div class="replay-intro-row highlight">
				<span class="replay-intro-label">Win</span>
				<span class="replay-intro-value">{numberToCurrencyString(payout, { exactWin: true })}</span>
			</div>
		</div>

		<button class="replay-start-btn" onclick={onstart} disabled={starting}>
			{buttonLabel}
		</button>
	</section>
</div>

<style>
	.replay-intro-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(2px);
	}

	.replay-intro-card {
		width: min(410px, 100%);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 28px 30px 30px;
		border: 1px solid rgba(255, 214, 84, 0.62);
		border-radius: 8px;
		background: linear-gradient(160deg, rgba(22, 18, 34, 0.98), rgba(47, 31, 74, 0.96));
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.55),
			0 0 36px rgba(255, 214, 84, 0.16);
		color: #ffffff;
	}

	.replay-intro-kicker,
	.replay-intro-title,
	.replay-intro-label,
	.replay-start-btn {
		font-family: 'proxima-nova', Arial, sans-serif;
		text-transform: uppercase;
	}

	.replay-intro-kicker {
		color: rgba(255, 214, 84, 0.78);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 2px;
		text-align: center;
	}

	.replay-intro-title {
		color: #ffd654;
		font-size: 30px;
		font-weight: 800;
		line-height: 1;
		text-align: center;
		text-shadow: 0 0 18px rgba(255, 214, 84, 0.32);
	}

	.replay-intro-rows {
		display: flex;
		flex-direction: column;
		gap: 9px;
		width: 100%;
	}

	.replay-intro-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		min-height: 34px;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.14);
	}

	.replay-intro-row.highlight {
		margin-top: 2px;
		padding: 10px 12px;
		border: 1px solid rgba(255, 214, 84, 0.28);
		border-radius: 8px;
		background: rgba(255, 214, 84, 0.12);
	}

	.replay-intro-label {
		color: rgba(255, 255, 255, 0.62);
		font-size: 11px;
		font-weight: 800;
		white-space: nowrap;
	}

	.replay-intro-value {
		color: #ffffff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-size: 16px;
		font-weight: 800;
		text-align: right;
		word-break: break-word;
	}

	.replay-cost-mult {
		color: rgba(255, 255, 255, 0.58);
		font-size: 12px;
		margin-left: 4px;
	}

	.replay-start-btn {
		min-height: 52px;
		border: 0;
		border-radius: 8px;
		background: #ffd654;
		color: #251931;
		cursor: pointer;
		font-size: 15px;
		font-weight: 900;
	}

	.replay-start-btn:disabled {
		cursor: default;
		opacity: 0.58;
	}

	@media (max-width: 420px) {
		.replay-intro-card {
			padding: 24px 22px 26px;
		}

		.replay-intro-title {
			font-size: 26px;
		}
	}
</style>
