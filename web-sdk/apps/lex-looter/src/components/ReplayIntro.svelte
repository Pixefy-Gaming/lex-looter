<script lang="ts">
	import { stateBet, stateConfig, stateUrlDerived } from 'state-shared';
	import { bookEventAmountToNormalisedAmount, numberToCurrencyString } from 'utils-shared';
	import { getContext } from '../game/context';

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
	const modeLabel = (mode: string | undefined) => (mode || 'BASE').replace(/_/g, ' ').toUpperCase();
	const normalizeMultiplier = (value: number) => (value > 50 ? value / 100 : value);
	const firstFiniteNumber = (...values: unknown[]) =>
		values.map(Number).find((value) => Number.isFinite(value));
	const replayBookAmount = (events: Record<string, unknown>[] | undefined) => {
		if (!Array.isArray(events)) return 0;

		const roundEnd = [...events]
			.reverse()
			.find((event) => event?.type === 'roundEnd' && Number.isFinite(Number(event.totalWin)));
		if (roundEnd) return Number(roundEnd.totalWin);

		return events.reduce((largestAmount, event) => {
			const amount = firstFiniteNumber(event?.totalWin, event?.amount);
			return amount === undefined ? largestAmount : Math.max(largestAmount, amount);
		}, 0);
	};
	const isSocial = $derived(stateConfig.jurisdiction?.socialCasino || stateUrlDerived.social());
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
	const title = $derived(again ? 'Replay Complete' : 'Replay Ready');
	const buttonLabel = $derived(starting ? 'Starting' : again ? 'Play Again' : 'Start Replay');
	const costLabel = $derived(isSocial ? 'Play Cost' : 'Bet');
	const resultLabel = $derived(isSocial ? 'Result' : 'Win');
</script>

<div class="replay-intro-overlay" class:finished={again}></div>
<div class="replay-intro-wrapper {layoutType}">
	<section class="replay-intro-card" aria-label="Replay details">
		<div class="replay-logo" aria-label="Lex Looter"></div>
		<div class="replay-intro-title">{title}</div>

		<div class="replay-intro-rows">
			<div class="replay-intro-row">
				<span class="replay-intro-label">Mode</span>
				<span class="replay-intro-value">{modeLabel(activeMode)}</span>
			</div>
			<div class="replay-intro-row">
				<span class="replay-intro-label">{costLabel}</span>
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
				<span class="replay-intro-label">{resultLabel}</span>
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
		--lex-green: #00ff50;
		--lex-green-soft: rgba(0, 255, 80, 0.2);
		--lex-purple: #9900ff;
		--lex-panel: rgba(0, 0, 0, 0.92);
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.74);
		backdrop-filter: blur(5px) saturate(0.75);
		-webkit-backdrop-filter: blur(5px) saturate(0.75);
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
		position: fixed;
		inset: 0;
		z-index: 10000;
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
		position: relative;
		width: min(430px, 100%);
		max-height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 22px 30px 30px;
		overflow: hidden;
		border: 2px solid var(--lex-green);
		border-radius: 10px;
		background:
			linear-gradient(180deg, rgba(0, 255, 80, 0.08), transparent 32%),
			linear-gradient(160deg, rgba(2, 6, 5, 0.98), rgba(18, 10, 30, 0.98));
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.7),
			0 0 0 3px rgba(153, 0, 255, 0.65),
			0 0 34px rgba(0, 255, 80, 0.22);
		color: #ffffff;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		pointer-events: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 255, 80, 0.55) rgba(0, 0, 0, 0.25);
	}

	.replay-intro-card::before {
		position: absolute;
		inset: 8px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		content: '';
		pointer-events: none;
	}

	.replay-logo {
		width: 210px;
		height: 144px;
		margin: -8px 0 -4px;
		background-image: url('/assets/lex/loading-logo/logo-lex.png');
		background-position: -845px -429px;
		background-repeat: no-repeat;
		background-size: 2063px 720px;
		filter:
			drop-shadow(4px 4px 0 #000)
			drop-shadow(0 0 12px rgba(0, 255, 80, 0.36));
		user-select: none;
	}

	.replay-intro-title,
	.replay-intro-label,
	.replay-start-btn {
		font-family: var(--lex-looter-ui-font);
		text-transform: uppercase;
	}

	.replay-intro-title {
		color: var(--lex-green);
		font-size: 34px;
		font-weight: 900;
		line-height: 1;
		text-align: center;
		text-shadow:
			3px 3px 0 #000,
			-2px 0 0 var(--lex-purple),
			2px 0 0 var(--lex-purple),
			0 2px 0 var(--lex-purple),
			0 0 18px rgba(0, 255, 80, 0.28);
	}

	.replay-intro-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-top: 6px;
	}

	.replay-intro-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		min-height: 38px;
		padding: 7px 0;
		border-bottom: 1px solid rgba(0, 255, 80, 0.16);
	}

	.replay-intro-row.highlight {
		margin-top: 4px;
		padding: 12px 14px;
		border: 1px solid rgba(0, 255, 80, 0.62);
		border-radius: 8px;
		background:
			linear-gradient(90deg, rgba(0, 255, 80, 0.16), rgba(153, 0, 255, 0.12)),
			rgba(0, 0, 0, 0.42);
		box-shadow: inset 0 0 18px rgba(0, 255, 80, 0.08);
	}

	.replay-intro-label {
		color: rgba(0, 255, 80, 0.82);
		font-size: 12px;
		font-weight: 900;
		white-space: nowrap;
		text-shadow: 2px 2px 0 #000;
	}

	.replay-intro-value {
		color: #ffffff;
		font-family: var(--lex-looter-ui-font);
		font-size: 18px;
		font-weight: 900;
		text-align: right;
		text-shadow: 2px 2px 0 #000;
		word-break: break-word;
	}

	.replay-cost-mult {
		color: rgba(0, 255, 80, 0.72);
		font-size: 12px;
		margin-left: 4px;
	}

	.replay-start-btn {
		min-height: 52px;
		width: 100%;
		border: 2px solid #000;
		border-radius: 8px;
		background: var(--lex-green);
		color: #031009;
		cursor: pointer;
		font-size: 17px;
		font-weight: 900;
		box-shadow:
			0 5px 0 #063015,
			0 0 20px rgba(0, 255, 80, 0.25);
		text-shadow: none;
		transition:
			transform 0.12s ease,
			filter 0.12s ease;
	}

	.replay-start-btn:hover {
		filter: brightness(1.08);
		transform: translateY(-1px);
	}

	.replay-start-btn:active {
		box-shadow:
			0 2px 0 #063015,
			0 0 14px rgba(0, 255, 80, 0.2);
		transform: translateY(3px);
	}

	.replay-start-btn:disabled {
		cursor: default;
		opacity: 0.58;
		transform: none;
	}

	@media (max-height: 600px) and (orientation: landscape) {
		.replay-intro-wrapper {
			padding: 12px;
		}

		.replay-intro-card {
			width: min(410px, 100%);
			gap: 7px;
			padding: 10px 22px 14px;
		}

		.replay-logo {
			width: 150px;
			height: 103px;
			margin: -8px 0 -8px;
			background-position: -604px -308px;
			background-size: 1474px 514px;
		}

		.replay-intro-title {
			font-size: 24px;
		}

		.replay-intro-rows {
			gap: 4px;
			margin-top: 2px;
		}

		.replay-intro-row {
			min-height: 28px;
			padding: 4px 0;
		}

		.replay-intro-row.highlight {
			margin-top: 2px;
			padding: 8px 10px;
		}

		.replay-intro-label,
		.replay-cost-mult {
			font-size: 10px;
		}

		.replay-intro-value {
			font-size: 14px;
		}

		.replay-start-btn {
			min-height: 42px;
			font-size: 13px;
			box-shadow:
				0 4px 0 #063015,
				0 0 16px rgba(0, 255, 80, 0.22);
		}
	}

	@media (max-height: 350px) and (orientation: landscape) {
		.replay-intro-wrapper {
			padding: 6px;
		}

		.replay-intro-card {
			width: min(360px, 100%);
			gap: 4px;
			padding: 7px 16px 9px;
			border-width: 1px;
		}

		.replay-logo {
			width: 104px;
			height: 72px;
			margin: -8px 0 -10px;
			background-position: -419px -214px;
			background-size: 1022px 357px;
		}

		.replay-intro-title {
			font-size: 18px;
		}

		.replay-intro-rows {
			gap: 2px;
			margin-top: 0;
		}

		.replay-intro-row {
			min-height: 22px;
			padding: 2px 0;
		}

		.replay-intro-row.highlight {
			padding: 4px 7px;
		}

		.replay-intro-label,
		.replay-cost-mult {
			font-size: 8px;
			text-shadow: 1px 1px 0 #000;
		}

		.replay-intro-value {
			font-size: 11px;
			text-shadow: 1px 1px 0 #000;
		}

		.replay-start-btn {
			min-height: 32px;
			font-size: 10px;
			box-shadow:
				0 2px 0 #063015,
				0 0 12px rgba(0, 255, 80, 0.18);
		}
	}

	@media (max-width: 520px) and (orientation: portrait) {
		.replay-intro-card {
			width: min(390px, 100%);
			gap: 10px;
			padding: 18px 20px 22px;
		}

		.replay-logo {
			width: 180px;
			height: 124px;
			margin: -8px 0 -8px;
			background-position: -724px -370px;
			background-size: 1768px 617px;
		}

		.replay-intro-title {
			font-size: 28px;
		}

		.replay-intro-row {
			gap: 12px;
			min-height: 34px;
		}

		.replay-intro-value {
			font-size: 16px;
		}
	}

	@media (max-width: 420px) and (orientation: portrait) {
		.replay-intro-card {
			padding: 20px 22px 26px;
		}

		.replay-logo {
			width: 180px;
			height: 124px;
			background-position: -724px -370px;
			background-size: 1768px 617px;
		}

		.replay-intro-title {
			font-size: 29px;
		}
	}

	@media (max-width: 360px) {
		.replay-intro-card {
			padding: 16px 16px 20px;
		}

		.replay-logo {
			width: 150px;
			height: 103px;
			background-position: -604px -308px;
			background-size: 1474px 514px;
		}

		.replay-intro-title {
			font-size: 24px;
		}

		.replay-intro-label {
			font-size: 10px;
		}

		.replay-intro-value {
			font-size: 14px;
		}

		.replay-start-btn {
			min-height: 46px;
			font-size: 14px;
		}
	}
</style>
