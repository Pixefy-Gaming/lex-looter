<script lang="ts">
	import {
		stateBet,
		stateConfig,
		stateModal,
		stateMetaDerived,
		type BetModeData,
	} from 'state-shared';
	import { getContextLayout } from 'utils-layout';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { zIndex } from 'constants-shared/zIndex';

	import { stateBonus } from '../stateBonus.svelte';
	import type { EmitterEventModal } from '../types';

	const { stateLayoutDerived } = getContextLayout();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const GAME_ASSET_URL = './assets/lex/game-asset.png';
	const GAME_ASSET_SIZE = { width: 1885, height: 1354 };
	const BONUS_ICON_FRAMES: Record<string, { x: number; y: number; width: number; height: number }> =
		{
			'ante.png': { x: 445, y: 410, width: 434, height: 450 },
			startClone: { x: 1281, y: 0, width: 486, height: 385 },
			'startClone.png': { x: 1281, y: 0, width: 486, height: 385 },
			luckylex: { x: 1348, y: 410, width: 537, height: 400 },
			'luckylex.png': { x: 1348, y: 410, width: 537, height: 400 },
		};

	const bonusModes = $derived(
		stateMetaDerived
			.betModeMetaList()
			.filter((item) => item.type === 'activate' || item.type === 'buy'),
	);
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const stackedLayout = $derived(layoutType === 'portrait' || layoutType === 'tablet');
	const betOptionIndex = $derived(
		stateConfig.betAmountOptions.findIndex((amount) => amount === stateBet.betAmount),
	);
	let confirmingMode = $state<BetModeData | null>(null);
	let modalOverlay = $state<HTMLDivElement | null>(null);

	const closeModal = () => {
		confirmingMode = null;
		stateModal.modal = null;
	};

	const activateBonus = (betModeData: BetModeData) => {
		stateBonus.selectedBetModeKey = betModeData.mode;
		confirmingMode = betModeData;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const cancelConfirm = () => {
		confirmingMode = null;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const confirmBonus = (betModeData: BetModeData) => {
		stateBonus.selectedBetModeKey = betModeData.mode;
		stateBet.activeBetModeKey = betModeData.mode;
		closeModal();
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const setBetByStep = (step: -1 | 1) => {
		const nextIndex = betOptionIndex + step;
		const nextAmount = stateConfig.betAmountOptions[nextIndex];
		if (nextAmount === undefined) return;
		stateBet.betAmount = nextAmount;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	$effect(() => {
		if (stateModal.modal?.name !== 'buyBonus') return;

		requestAnimationFrame(() => {
			modalOverlay?.scrollTo({ top: 0, left: 0 });
		});
	});
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<div
		bind:this={modalOverlay}
		class="modal-overlay {layoutType}"
		class:stacked={stackedLayout}
		style={`z-index: ${zIndex.modal};`}
		onclick={closeModal}
		role="button"
		tabindex="0"
		onkeydown={(event) => event.key === 'Escape' && closeModal()}
	>
		<div
			class="modal-wrapper"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			role="presentation"
		>
			<button class="close-btn" onclick={closeModal} aria-label="Close modal">×</button>

			<div class="cards-container" class:stacked={stackedLayout}>
				{#each bonusModes as betModeData}
					{@const frame = BONUS_ICON_FRAMES[betModeData.assets.icon]}
					{@const isActive = stateBet.activeBetModeKey === betModeData.mode}
					{@const price = stateBet.betAmount * betModeData.costMultiplier}
					<div class="card" class:active={isActive}>
						<div class="visual-frame">
							{#if frame}
								<svg
									class="top-visual"
									viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
									preserveAspectRatio="xMidYMid meet"
									style={`--asset-ratio: ${frame.width} / ${frame.height};`}
								>
									<image
										href={GAME_ASSET_URL}
										width={GAME_ASSET_SIZE.width}
										height={GAME_ASSET_SIZE.height}
									/>
								</svg>
							{/if}
						</div>

						<div class="card-copy">
							<h2>{betModeData.text.title}</h2>
							{#if betModeData.text.description}
								<p>{betModeData.text.description}</p>
							{/if}
						</div>

						<div class="price-container">
							<span class="price-text">{numberToCurrencyString(price)}</span>
							<span class="cost-formula">
								{numberToCurrencyString(stateBet.betAmount)} × x{betModeData.costMultiplier}
							</span>
						</div>

						{#if confirmingMode?.mode === betModeData.mode}
							<div class="confirm-panel">
								<div class="confirm-row">
									<button class="confirm-back-btn" onclick={cancelConfirm}>Back</button>
									<button class="confirm-ok-btn" onclick={() => confirmBonus(betModeData)}>
										Confirm
									</button>
								</div>
							</div>
						{:else}
							<button
								class="action-btn"
								class:active={isActive}
								onclick={() => activateBonus(betModeData)}
								disabled={isActive ||
									stateBet.betAmount <= 0 ||
									stateBet.balanceAmount < stateBet.betAmount * betModeData.costMultiplier}
							>
								{isActive ? 'ACTIVE' : betModeData.text.button}
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<div class="bet-scroll-spacer" aria-hidden="true"></div>
		</div>
	</div>

	<div
		class="bet-adjust-bar"
		class:stacked={stackedLayout}
		style={`z-index: ${zIndex.modal + 1};`}
		role="presentation"
	>
		<button
			class="bet-btn"
			onclick={() => setBetByStep(-1)}
			disabled={betOptionIndex <= 0}
			aria-label="Decrease bet"
		>
			<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
				<path d="M19 13H5v-2h14v2z" />
			</svg>
		</button>

		<div class="bet-display">
			<span class="bet-label">BET</span>
			<span class="bet-value">{numberToCurrencyString(stateBet.betAmount)}</span>
		</div>

		<button
			class="bet-btn"
			onclick={() => setBetByStep(1)}
			disabled={betOptionIndex >= stateConfig.betAmountOptions.length - 1}
			aria-label="Increase bet"
		>
			<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
		</button>
	</div>
{/if}

<style lang="scss">
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(12px, 3vh, 32px);
		box-sizing: border-box;
		color: white;
		font-family: var(--lex-looter-ui-font, sans-serif);
		cursor: pointer;
		overflow: hidden;
	}

	.modal-overlay.stacked {
		align-items: flex-start;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.modal-wrapper {
		position: relative;
		width: 100%;
		max-height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(14px, 3vh, 30px);
		cursor: default;
	}

	.modal-overlay.stacked .modal-wrapper {
		display: block;
		max-height: none;
	}

	.close-btn {
		position: fixed;
		top: clamp(8px, 1.5vw, 18px);
		right: clamp(8px, 1.5vw, 18px);
		z-index: 1;
		width: clamp(38px, 5vw, 54px);
		height: clamp(38px, 5vw, 54px);
		border: 2px solid rgba(255, 255, 255, 0.25);
		background: rgba(0, 0, 0, 0.6);
		border-radius: 50%;
		color: white;
		font-size: clamp(22px, 3vw, 34px);
		font-weight: 900;
		line-height: 0;
		cursor: pointer;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.85);
		transform: scale(1.08);
	}

	.cards-container {
		display: flex;
		flex-direction: row;
		gap: clamp(12px, 2vw, 34px);
		justify-content: center;
		align-items: stretch;
		width: min(100%, 1400px);
		overflow-x: auto;
		overflow-y: hidden;
		padding: clamp(8px, 1.5vh, 20px) clamp(8px, 2vw, 36px);
		box-sizing: border-box;
		scrollbar-width: none;
		min-height: 0;
	}

	.cards-container::-webkit-scrollbar {
		display: none;
	}

	.bet-scroll-spacer {
		display: none;
	}

	.cards-container.stacked {
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		overflow: visible;
		width: 100%;
		padding: 0 0 96px;
	}

	.card {
		width: clamp(175px, 18vw, 285px);
		min-height: min(360px, 72vh);
		max-width: 295px;
		flex: 1 1 0;
		background: #070d0c;
		border: 2px solid #1b2421;
		border-radius: clamp(10px, 1.5vw, 18px);
		padding: clamp(18px, 2.6vh, 28px) clamp(16px, 1.8vw, 24px);
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
		color: #ffffff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		box-sizing: border-box;
		overflow: hidden;
	}

	.cards-container.stacked .card {
		width: clamp(235px, 74vw, 315px);
		min-height: 390px;
	}

	.card.active {
		background: #070d0c;
		border-color: #00ff50;
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.35),
			0 0 0 4px rgba(0, 255, 80, 0.28);
	}

	.visual-frame {
		width: 100%;
		height: clamp(105px, 11vw, 150px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.top-visual {
		width: auto;
		max-width: min(100%, 220px);
		height: 100%;
		aspect-ratio: var(--asset-ratio);
		display: block;
	}

	.card-copy {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		min-height: 96px;
		width: 100%;
	}

	h2 {
		margin: 0;
		color: #ffffff;
		font-family: var(--lex-looter-ui-font, sans-serif);
		font-size: clamp(24px, 2.2vw, 34px);
		font-weight: 900;
		line-height: 1;
		text-align: center;
		text-transform: uppercase;
	}

	p {
		margin: 0;
		color: #ffffff;
		font-size: clamp(11px, 1vw, 13px);
		font-weight: 900;
		line-height: 1.25;
		text-align: center;
		text-transform: uppercase;
		text-wrap: balance;
	}

	.price-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		width: 100%;
	}

	.price-text {
		font-family: var(--lex-looter-ui-font, sans-serif);
		font-size: clamp(30px, 3vw, 44px);
		font-weight: 900;
		color: #ffffff;
		line-height: 1;
		max-width: 100%;
		overflow-wrap: anywhere;
		text-align: center;
	}

	.cost-formula {
		color: #ffffff;
		font-size: 12px;
		font-weight: 800;
		opacity: 0.75;
		white-space: nowrap;
	}

	.action-btn {
		width: 100%;
		padding: 9px 16px;
		background: #00ff50;
		color: #000000;
		border: 2px solid #008f2d;
		border-radius: 99px;
		font-family: var(--lex-looter-ui-font, sans-serif);
		font-size: clamp(15px, 1.5vw, 20px);
		font-weight: 900;
		cursor: pointer;
		box-shadow: 0 6px 0 0 #008f2d;
		text-transform: uppercase;
		transition:
			transform 0.1s,
			box-shadow 0.1s,
			filter 0.1s;
	}

	.action-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.action-btn:active:not(:disabled) {
		transform: translateY(4px);
		box-shadow: 0 2px 0 0 #008f2d;
	}

	.action-btn.active {
		background: #52b556;
		border-color: #2f6d32;
		box-shadow: 0 6px 0 0 #2f6d32;
	}

	.action-btn:disabled {
		background: #999999;
		border-color: #666666;
		box-shadow: 0 4px 0 0 #666666;
		cursor: not-allowed;
		opacity: 0.8;
		transform: translateY(2px);
	}

	.confirm-panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		animation: slide-up 0.2s ease-out;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.confirm-row {
		display: flex;
		width: 100%;
		gap: 10px;
	}

	.confirm-back-btn,
	.confirm-ok-btn {
		flex: 1;
		padding: clamp(8px, 1.4vw, 10px);
		border-radius: 99px;
		font-family: var(--lex-looter-ui-font, sans-serif);
		font-size: clamp(12px, 1.2vw, 16px);
		font-weight: 900;
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.15s,
			filter 0.15s;
		text-transform: uppercase;
		outline: none;
	}

	.confirm-back-btn {
		background: transparent;
		border: 2px solid rgba(255, 255, 255, 0.35);
		color: #ffffff;
		box-shadow: 0 4px 0 rgba(255, 255, 255, 0.16);
	}

	.confirm-ok-btn {
		background: #00ff50;
		border: 2px solid #008f2d;
		color: #000000;
		box-shadow: 0 6px 0 #008f2d;
	}

	.confirm-back-btn:hover,
	.confirm-ok-btn:hover {
		filter: brightness(1.1);
	}

	.confirm-back-btn:active {
		transform: translateY(2px);
		box-shadow: 0 2px 0 rgba(255, 255, 255, 0.16);
	}

	.confirm-ok-btn:active {
		transform: translateY(4px);
		box-shadow: 0 2px 0 #008f2d;
	}

	.bet-adjust-bar {
		position: fixed;
		left: 50%;
		bottom: clamp(14px, 3vh, 32px);
		z-index: 2;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 99px;
		padding: 8px 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		backdrop-filter: blur(4px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.bet-adjust-bar.stacked {
		bottom: 24px;
		background: rgba(20, 20, 20, 0.95);
	}

	.bet-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bet-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.08);
	}

	.bet-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.bet-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 120px;
		border-radius: 14px;
		padding: 9px 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.22);
	}

	.bet-label {
		font-size: 10px;
		color: #e8a855;
		font-weight: 900;
		letter-spacing: 1px;
	}

	.bet-value {
		font-family: var(--lex-looter-ui-font, sans-serif);
		font-size: 23px;
		color: #ffffff;
		font-weight: 900;
		line-height: 1;
	}

	@media (max-width: 768px) {
		.modal-overlay {
			padding: 14px 0 0;
		}

		.modal-wrapper {
			gap: 12px;
		}

		.cards-container.stacked {
			gap: 12px;
			padding: 6px 0 118px;
		}

		.cards-container.stacked .card {
			width: min(315px, calc(100vw - 32px));
			flex: 0 0 auto;
			min-height: clamp(292px, 40vh, 340px);
			padding: 16px 14px;
		}

		.cards-container.stacked .card:last-child {
			margin-bottom: 88px;
		}

		.bet-scroll-spacer {
			display: block;
			flex: 0 0 104px;
		}

		.cards-container.stacked .visual-frame {
			height: clamp(92px, 22vh, 132px);
		}

		.card-copy {
			min-height: 88px;
		}

		.bet-adjust-bar {
			gap: 12px;
			padding: 8px 14px;
		}

		.bet-display {
			min-width: 88px;
		}

		.bet-value {
			font-size: 20px;
		}

		.bet-btn {
			width: 38px;
			height: 38px;
		}
	}

	@media (orientation: landscape) and (max-height: 620px) {
		.modal-overlay {
			align-items: center;
			padding: clamp(6px, 2vh, 12px) clamp(8px, 2vw, 16px);
		}

		.modal-wrapper {
			gap: clamp(6px, 2vh, 12px);
		}

		.close-btn {
			width: clamp(28px, 7vh, 38px);
			height: clamp(28px, 7vh, 38px);
			border-width: 1px;
			font-size: clamp(18px, 5vh, 26px);
		}

		.cards-container {
			justify-content: flex-start;
			align-items: stretch;
			gap: clamp(8px, 1.8vw, 18px);
			width: min(100%, 940px);
			max-height: calc(100dvh - 70px);
			padding: 2px clamp(24px, 6vw, 46px);
			scroll-snap-type: x proximity;
		}

		.card {
			flex: 0 0 clamp(112px, 29vw, 250px);
			width: clamp(112px, 29vw, 250px);
			min-height: 0;
			height: min(300px, calc(100dvh - 76px));
			padding: clamp(8px, 2.2vh, 16px) clamp(8px, 1.6vw, 16px);
			border-radius: clamp(10px, 3vh, 16px);
			gap: clamp(5px, 1.6vh, 10px);
			scroll-snap-align: center;
		}

		.visual-frame {
			height: clamp(44px, 22vh, 112px);
			flex: 0 0 auto;
		}

		.top-visual {
			max-width: min(100%, 170px);
		}

		.card-copy {
			gap: 4px;
			min-height: 0;
		}

		h2 {
			font-size: clamp(14px, 4.4vh, 28px);
			line-height: 0.95;
		}

		p {
			font-size: clamp(8px, 2.2vh, 11px);
			line-height: 1.15;
		}

		.price-container {
			gap: 1px;
		}

		.price-text {
			font-size: clamp(17px, 5vh, 34px);
		}

		.cost-formula {
			font-size: clamp(8px, 2vh, 11px);
			line-height: 1;
		}

		.action-btn {
			padding: clamp(5px, 1.8vh, 8px) clamp(8px, 1.5vw, 14px);
			border-width: 1px;
			box-shadow: 0 4px 0 0 #008f2d;
			font-size: clamp(10px, 3vh, 16px);
			line-height: 1;
		}

		.confirm-panel {
			gap: 6px;
		}

		.confirm-row {
			gap: 6px;
		}

		.confirm-back-btn,
		.confirm-ok-btn {
			padding: clamp(5px, 1.8vh, 8px) 6px;
			border-width: 1px;
			font-size: clamp(9px, 2.7vh, 13px);
			line-height: 1;
		}

		.bet-adjust-bar {
			gap: clamp(6px, 1.4vw, 12px);
			padding: clamp(4px, 1.4vh, 7px) clamp(8px, 1.8vw, 12px);
		}

		.bet-btn {
			width: clamp(28px, 8vh, 38px);
			height: clamp(28px, 8vh, 38px);
		}

		.bet-display {
			min-width: clamp(74px, 16vw, 104px);
			padding: clamp(4px, 1.4vh, 7px) 10px;
			border-radius: 12px;
		}

		.bet-label {
			font-size: clamp(7px, 1.8vh, 9px);
		}

		.bet-value {
			font-size: clamp(14px, 4vh, 20px);
		}
	}

	@media (orientation: landscape) and (max-height: 260px) {
		.modal-overlay {
			align-items: flex-start;
			justify-content: center;
			padding: 8px 8px 54px;
		}

		.modal-wrapper {
			gap: 4px;
			height: calc(100dvh - 68px);
		}

		.cards-container {
			justify-content: center;
			align-items: stretch;
			gap: 8px;
			height: 100%;
			max-height: none;
			padding: 0 34px;
		}

		.card {
			flex: 0 0 104px;
			width: 104px;
			height: 100%;
			min-height: 0;
			padding: 7px 7px 8px;
			gap: 4px;
			justify-content: space-between;
			border-radius: 10px;
		}

		.visual-frame {
			height: 42px;
		}

		.top-visual {
			max-width: min(100%, 66px);
		}

		.card-copy {
			gap: 2px;
			min-height: 15px;
		}

		h2 {
			font-size: 9px;
			line-height: 1;
		}

		.price-container {
			gap: 0;
		}

		.price-text {
			font-size: 12px;
		}

		.action-btn {
			min-height: 19px;
			margin-top: 0;
			padding: 3px 6px;
			box-shadow: 0 2px 0 0 #008f2d;
			font-size: 8px;
		}

		.confirm-back-btn,
		.confirm-ok-btn {
			min-height: 18px;
			padding: 3px;
			font-size: 7px;
		}

		.bet-adjust-bar {
			bottom: 10px;
			gap: 8px;
			padding: 4px 8px;
		}

		.bet-btn {
			width: 28px;
			height: 28px;
		}

		.bet-display {
			min-width: 88px;
			padding: 4px 8px;
		}

		.bet-label {
			font-size: 7px;
		}

		.bet-value {
			font-size: 14px;
		}

		p,
		.cost-formula {
			display: none;
		}
	}

	@media (orientation: landscape) and (max-width: 500px) and (max-height: 260px) {
		.modal-overlay {
			background: rgba(0, 0, 0, 0.82);
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
			align-items: center;
			padding: 4px;
		}

		.modal-wrapper {
			position: relative;
			width: 100%;
			height: 100dvh;
			gap: 1px;
			padding: 0 3px;
			box-sizing: border-box;
		}

		.close-btn {
			top: 2px;
			right: 4px;
			width: 22px;
			height: 22px;
			font-size: 15px;
			background: rgba(0, 0, 0, 0.45);
		}

		.cards-container {
			position: absolute;
			top: 52%;
			left: 50%;
			transform: translate(-50%, -50%);
			justify-content: center;
			align-items: stretch;
			flex-wrap: nowrap;
			gap: 6px;
			width: 100%;
			height: clamp(108px, 52dvh, 124px);
			max-height: clamp(108px, 52dvh, 124px);
			overflow-y: hidden;
			overflow-x: auto;
			padding: 2px 28px 0 8px;
			scroll-snap-type: x proximity;
		}

		.card {
			background: #070d0c;
			flex: 0 0 112px;
			width: 112px;
			height: 100%;
			min-height: 0;
			padding: 6px;
			gap: 2px;
			scroll-snap-align: center;
		}

		.card.active {
			background: #070d0c;
		}

		.visual-frame {
			height: clamp(38px, 22vh, 50px);
			flex: 0 0 auto;
		}

		.top-visual {
			max-width: min(100%, 78px);
		}

		.card-copy {
			gap: 1px;
			min-height: 0;
		}

		h2 {
			font-size: 10px;
			line-height: 1;
		}

		p {
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
			font-size: 5px;
			line-height: 1.1;
		}

		.price-container {
			gap: 0;
		}

		.price-text {
			font-size: 12px;
		}

		.cost-formula {
			display: block;
			font-size: 5px;
			line-height: 1;
			opacity: 0.72;
		}

		.action-btn {
			min-height: 17px;
			padding: 3px 5px 2px;
			box-shadow: 0 2px 0 0 #008f2d;
			font-size: 7px;
			line-height: 1;
		}

		.confirm-back-btn,
		.confirm-ok-btn {
			min-height: 16px;
			padding: 2px;
			font-size: 6px;
			line-height: 1;
		}

		.confirm-row {
			gap: 3px;
		}

		.bet-adjust-bar {
			bottom: 8px;
			gap: 3px;
			padding: 1px 5px;
			background: rgba(20, 20, 20, 0.95);
			border-radius: 40px;
		}

		.bet-btn {
			width: 17px;
			height: 17px;
		}

		.bet-display {
			min-width: 60px;
			padding: 1px 5px;
			border-radius: 20px;
		}

		.bet-label {
			font-size: 5px;
		}

		.bet-value {
			font-size: 10px;
		}
	}

	@media (orientation: landscape) and (min-width: 501px) and (max-width: 900px) and (max-height: 520px) {
		.modal-wrapper {
			transform: translateY(-22px);
		}

		.close-btn {
			top: -38px;
		}
	}
</style>
