<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { stateConfig, stateUrlDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import type { LexRoundEndReason } from '../game/typesBookEvent';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';

	const context = getContext();

	const RESULT_POPUP_MIN_BOOK_EVENT_AMOUNT = 10 * 100;
	const SPECIAL_RESULT_MIN_BOOK_EVENT_AMOUNT = 1 * 100;
	const SPECIAL_REASON_LABELS: Partial<Record<LexRoundEndReason, string>> = {
		escape: 'ESCAPED',
		bounceLimit: 'HIT LIMIT',
	};
	const animatedAmount = tweened(0, { easing: cubicOut });

	const getResultTitle = (amount: number, resultReason: LexRoundEndReason | undefined, social: boolean) => {
		const multiplier = amount / 100;
		const resultWord = social ? 'RESULT' : 'WIN';
		if (multiplier >= 100) return `EPIC ${resultWord}`;
		if (multiplier >= 50) return `MEGA ${resultWord}`;
		if (multiplier >= 25) return `SUPER ${resultWord}`;
		if (multiplier >= 10) return `BIG ${resultWord}`;
		return resultReason ? (SPECIAL_REASON_LABELS[resultReason] ?? `BIG ${resultWord}`) : `BIG ${resultWord}`;
	};

	const getCountUpDuration = (amount: number) => {
		const multiplier = amount / 100;
		let level: WinLevel = 3;
		if (multiplier >= 100) level = 9;
		else if (multiplier >= 50) level = 8;
		else if (multiplier >= 25) level = 7;
		else if (multiplier >= 10) level = 6;
		else if (multiplier >= 5) level = 5;
		else if (multiplier >= 3) level = 4;

		return winLevelMap[level].presentDuration;
	};

	let visible = $state(false);
	let shownRoundSerial = $state(0);
	let popupReason = $state<LexRoundEndReason>();
	let popupTargetAmount = $state(0);
	let popupHasWin = $state(false);
	let countUpDone = $state(false);
	let resolveCountUp: (() => void) | null = null;

	const lex = $derived(context.stateGame.lex);
	const reason = $derived(lex.roundEndReason);
	const isSpecialReason = $derived(!!reason && !!SPECIAL_REASON_LABELS[reason]);
	const resultBookEventAmount = $derived(
		isSpecialReason ? Math.max(lex.totalWin, lex.tumbleValue) : lex.totalWin,
	);
	const hasWin = $derived(resultBookEventAmount > 0);
	const isSocial = $derived(stateConfig.jurisdiction?.socialCasino || stateUrlDerived.social());
	const popupAmount = $derived(bookEventAmountToCurrencyString($animatedAmount));
	const popupTitle = $derived(getResultTitle($animatedAmount, popupReason, isSocial));
	const shouldShowResult = $derived(
		!!reason &&
			(resultBookEventAmount >= RESULT_POPUP_MIN_BOOK_EVENT_AMOUNT ||
				(isSpecialReason && resultBookEventAmount > SPECIAL_RESULT_MIN_BOOK_EVENT_AMOUNT)),
	);

	$effect(() => {
		if (!lex.roundEnded) {
			visible = false;
			countUpDone = false;
			resolveCountUp = null;
			animatedAmount.set(0, { duration: 0 });
			return;
		}

		if (visible && lex.roundSerial === shownRoundSerial) return;
		if (!shouldShowResult) return;
		if (!context.stateXstateDerived.isIdle()) return;
		if (lex.roundSerial === shownRoundSerial) return;

		popupReason = reason;
		popupTargetAmount = resultBookEventAmount;
		popupHasWin = hasWin;
		countUpDone = false;
		resolveCountUp = null;
		animatedAmount.set(0, { duration: 0 });
		visible = true;
		shownRoundSerial = lex.roundSerial;

		new Promise<void>((resolve) => {
			resolveCountUp = resolve;
			animatedAmount
				.set(resultBookEventAmount, { duration: getCountUpDuration(resultBookEventAmount) })
				.then(resolve);
		}).then(() => {
			resolveCountUp = null;
			countUpDone = true;
		});
	});

	const close = () => {
		if (!countUpDone) {
			animatedAmount.set(popupTargetAmount, { duration: 0 });
			resolveCountUp?.();
			return;
		}

		visible = false;
	};
</script>

{#if visible}
	<div
		class="round-result-overlay"
		role="button"
		tabindex="0"
		aria-label="Continue after round result"
		onclick={close}
		onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && close()}
	>
		<section class:win-result={popupHasWin} class="round-result-content" aria-labelledby="round-result-title">
			<h2 id="round-result-title" class="round-result-title">{popupTitle}</h2>
			<div class="round-result-amount">{popupAmount}</div>
			<div class="round-result-hint">PRESS ANYWHERE TO CONTINUE</div>
		</section>
	</div>
{/if}

<style>
	.round-result-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		padding: 20px;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(2px);
		cursor: pointer;
		pointer-events: auto;
		user-select: none;
	}

	.round-result-content {
		width: min(760px, 100%);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 20px;
		color: #ffffff;
		text-align: center;
		animation: result-pop 560ms cubic-bezier(0.18, 0.98, 0.34, 1) both;
	}

	.round-result-content.win-result {
		filter: drop-shadow(0 0 22px rgba(0, 255, 140, 0.22));
	}

	.round-result-title,
	.round-result-amount,
	.round-result-hint {
		font-family: var(--lex-looter-ui-font);
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.round-result-title {
		margin: 0;
		color: #ffffff;
		font-size: clamp(56px, 10vw, 126px);
		font-weight: 400;
		line-height: 0.9;
		filter:
			drop-shadow(8px 8px 0 #000000)
			drop-shadow(3px 0 0 #9900ff)
			drop-shadow(-3px 0 0 #9900ff)
			drop-shadow(0 3px 0 #9900ff)
			drop-shadow(0 -3px 0 #9900ff);
	}

	.round-result-amount {
		max-width: 100%;
		overflow-wrap: anywhere;
		background: linear-gradient(180deg, #00ff8c 0%, #00ff2e 100%);
		background-clip: text;
		color: transparent;
		font-size: clamp(82px, 16vw, 180px);
		font-weight: 400;
		line-height: 0.86;
		filter:
			drop-shadow(10px 10px 0 #000000)
			drop-shadow(3px 0 0 #9900ff)
			drop-shadow(-3px 0 0 #9900ff)
			drop-shadow(0 3px 0 #9900ff)
			drop-shadow(0 -3px 0 #9900ff);
		-webkit-background-clip: text;
	}

	.round-result-hint {
		margin-top: 14px;
		color: rgba(255, 255, 255, 0.58);
		font-size: clamp(14px, 2vw, 20px);
		text-shadow: 0 2px 0 #000000;
		animation: hint-pulse 2.2s ease-in-out infinite;
	}

	@media (max-width: 560px) {
		.round-result-content {
			padding: 18px 8px;
			gap: 10px;
		}
	}

	@keyframes result-pop {
		0% {
			opacity: 0;
			transform: scale(0.78);
		}

		68% {
			opacity: 1;
			transform: scale(1.04);
		}

		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes hint-pulse {
		0%,
		100% {
			opacity: 0.45;
		}

		50% {
			opacity: 0.86;
		}
	}
</style>
