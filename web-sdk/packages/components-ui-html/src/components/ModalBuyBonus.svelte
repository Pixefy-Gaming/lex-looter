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
		stateMetaDerived.betModeMetaList().filter((item) => item.type === 'activate' || item.type === 'buy'),
	);
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const stackedLayout = $derived(layoutType === 'portrait' || layoutType === 'tablet');
	const betOptionIndex = $derived(
		stateConfig.betAmountOptions.findIndex((amount) => amount === stateBet.betAmount),
	);

	const closeModal = () => {
		stateModal.modal = null;
	};

	const activateBonus = (betModeData: BetModeData) => {
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
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<div
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
					</div>
				{/each}
			</div>

			<div class="bet-adjust-bar">
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
		</div>
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
		font-family: 'proxima-nova', sans-serif;
		cursor: pointer;
	}

	.modal-overlay.stacked {
		align-items: flex-start;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.modal-wrapper {
		position: relative;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(14px, 3vh, 30px);
		cursor: default;
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
	}

	.cards-container::-webkit-scrollbar {
		display: none;
	}

	.cards-container.stacked {
		flex-direction: column;
		align-items: center;
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
		min-height: clamp(105px, 11vw, 150px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.top-visual {
		width: min(100%, 200px);
		aspect-ratio: var(--asset-ratio);
		height: auto;
		display: block;
	}

	.card-copy {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		min-height: 96px;
	}

	h2 {
		margin: 0;
		color: #ffffff;
		font-family: 'Russo One', 'proxima-nova', sans-serif;
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
	}

	.price-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.price-text {
		font-family: 'Russo One', 'proxima-nova', sans-serif;
		font-size: clamp(30px, 3vw, 44px);
		font-weight: 900;
		color: #ffffff;
		line-height: 1;
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
		font-family: 'Russo One', 'proxima-nova', sans-serif;
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

	.bet-adjust-bar {
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

	.stacked .bet-adjust-bar {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
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
		font-family: 'Russo One', 'proxima-nova', sans-serif;
		font-size: 23px;
		color: #ffffff;
		font-weight: 900;
		line-height: 1;
	}

	@media (max-width: 768px) {
		.modal-overlay {
			padding: 14px 0 0;
		}

		.card-copy {
			min-height: 100px;
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
</style>
