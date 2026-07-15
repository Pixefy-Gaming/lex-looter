<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { stateBet, stateBetDerived, stateConfig, stateModal, stateSound } from 'state-shared';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';

	const context = getContext();

	let uiVisible = $state(true);
	let isMenuOpen = $state(false);
	let showNotification = $state(false);
	let notificationText = $state('');
	let notificationTimer: ReturnType<typeof setTimeout> | undefined;
	let onFadeComplete = $state(() => {});

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isFreeSpin = $derived(context.stateGame.gameType === 'freegame');
	const isIdle = $derived(context.stateXstateDerived.isIdle());
	const isSpinning = $derived(!isIdle);
	const isAuto = $derived(stateBetDerived.hasAutoBetCounter());
	const isTurboDisabled = $derived(!!stateConfig.jurisdiction?.disabledTurbo);
	const isFastForwardDisabled = $derived(isIdle || stateBet.isSpaceHold);
	const isAutoDisabled = $derived(
		!!stateConfig.jurisdiction?.disabledAutoplay ||
			stateBet.isSpaceHold ||
			!stateBetDerived.isBetCostAvailable(),
	);
	const isFeatureBuyDisabled = $derived(!!stateConfig.jurisdiction?.disabledBuyFeature);
	const show = $derived(uiVisible && !isFreeSpin);
	const isPopoutS = $derived(layoutType === 'popout' && canvasSizes.width <= 500);
	const isPopoutL = $derived(layoutType === 'popout' && canvasSizes.width > 500);
	const balanceFormatted = $derived(numberToCurrencyString(stateBet.balanceAmount));
	const betFormatted = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const baseBetFormatted = $derived(numberToCurrencyString(stateBet.betAmount));
	const winFormatted = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const volume = $derived(stateSound.volumeValueMaster / 100);
	const isMuted = $derived(stateSound.volumeValueMaster === 0);
	const isMusicMuted = $derived(stateSound.volumeValueMusic === 0);
	const activeBetMode = $derived(stateBetDerived.activeBetMode());
	const isBonusActive = $derived(activeBetMode?.type === 'activate');
	const betModeMultiplier = $derived(stateBetDerived.betCostMultiplier());

	const balanceFontSize = $derived(
		isPopoutS
			? balanceFormatted.length > 15
				? '9px'
				: balanceFormatted.length > 12
					? '11px'
					: balanceFormatted.length > 10
						? '12px'
						: '14px'
			: undefined,
	);
	const winFontSize = $derived(
		isPopoutS
			? winFormatted.length > 15
				? '9px'
				: winFormatted.length > 12
					? '11px'
					: winFormatted.length > 10
						? '12px'
						: '14px'
			: undefined,
	);

	const triggerNotification = (text: string) => {
		notificationText = text;
		showNotification = true;
		if (notificationTimer) clearTimeout(notificationTimer);
		notificationTimer = setTimeout(() => {
			showNotification = false;
		}, 2000);
	};

	const stop = () => {
		if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
		context.eventEmitter.broadcast({ type: 'stopButtonClick' });
	};

	const handleSpin = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (isIdle) {
			if (!stateBetDerived.isBetCostAvailable()) {
				triggerNotification('INSUFFICIENT BALANCE');
				return;
			}

			if (activeBetMode?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
			return;
		}

		if (stateBet.isTurbo && !stateBetDerived.hasAutoBetCounter()) return;
		stop();
	};

	const openFeatureModal = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning || isFeatureBuyDisabled) return;

		if (isBonusActive) {
			stateBet.activeBetModeKey = 'BASE';
			triggerNotification('BONUS DISABLED');
			return;
		}

		stateModal.modal = { name: 'buyBonus' };
	};

	const openBetModal = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning) return;
		stateModal.modal = { name: 'betAmountMenu' };
	};

	const decreaseBet = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning) return;

		const smallest = stateConfig.betAmountOptions[0];
		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);
		stateBetDerived.setBetAmount(nextSmaller || smallest);
	};

	const increaseBet = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning) return;

		const biggest = stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1];
		const nextBigger = [...stateConfig.betAmountOptions]
			.sort((a, b) => a - b)
			.find((option) => option > stateBet.betAmount);
		stateBetDerived.setBetAmount(nextBigger || biggest);
	};

	const toggleAuto = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (stateBetDerived.hasAutoBetCounter()) {
			stateBet.autoSpinsCounter = 0;
			return;
		}

		if (!isIdle || isAutoDisabled) return;
		stateModal.modal = { name: 'autoSpin' };
	};

	const fastForward = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isFastForwardDisabled) return;
		context.eventEmitter.broadcast({ type: 'skipLexPlayback' });
	};

	const toggleMenu = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isMenuOpen = !isMenuOpen;
	};

	const toggleMute = () => {
		stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 100 : 0;
	};

	const toggleMusicMute = () => {
		stateSound.volumeValueMusic = stateSound.volumeValueMusic === 0 ? 100 : 0;
	};

	const updateVolume = (event: Event) => {
		stateSound.volumeValueMaster = Number((event.target as HTMLInputElement).value) * 100;
	};

	const openPayTable = () => {
		stateModal.modal = { name: 'payTable' };
		isMenuOpen = false;
	};

	const openGameRules = () => {
		stateModal.modal = { name: 'gameRules' };
		isMenuOpen = false;
	};

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') isMenuOpen = false;
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	$effect(() => {
		if (!isFreeSpin && !isTurboDisabled && !stateBet.isTurbo) {
			stateBetDerived.updateIsTurbo(true, { persistent: true });
		}
	});

	onDestroy(() => {
		if (notificationTimer) clearTimeout(notificationTimer);
	});

	context.eventEmitter.subscribeOnMount({
		uiShow: async () => {
			if (!uiVisible) {
				uiVisible = true;
				await waitForResolve((resolve) => (onFadeComplete = resolve));
			}
		},
		uiHide: async () => {
			if (uiVisible) {
				uiVisible = false;
				isMenuOpen = false;
				await waitForResolve((resolve) => (onFadeComplete = resolve));
			}
		},
		stopButtonClick: () => stateBetDerived.updateIsTurbo(true, { persistent: false }),
		stopButtonEnable: () => stateBetDerived.updateIsTurbo(false, { persistent: false }),
	});
</script>

<div
	class="control-bar-wrapper {layoutType}"
	class:show
	class:popout-s={isPopoutS}
	class:popout-l={isPopoutL}
	ontransitionend={() => onFadeComplete()}
>
	{#if showNotification}
		<div class="feature-notification-bar" transition:fly={{ y: -20, duration: 400 }}>
			<span class="notification-text">{notificationText}</span>
		</div>
	{/if}

	{#if layoutType === 'portrait'}
		<div class="portrait-control-bar">
			<div class="top-row">
				<div class="feature-slot">
					<button
						class="feature-buy-portrait"
						class:disabled={isSpinning || isFeatureBuyDisabled}
						class:active={isBonusActive}
						onclick={openFeatureModal}
						aria-label={context.i18nDerived.buyBonus()}
					>
						<img
							src="assets/sprites/controlBar/bonusButton.png"
							alt={context.i18nDerived.buyBonus()}
							class="bonus-button-icon-portrait"
							draggable="false"
						/>
						{#if isBonusActive}
							<span class="mode-dismiss-btn-portrait">{context.i18nDerived.disable()}</span>
						{/if}
					</button>
				</div>

				<div class="mobile-center-controls">
					<button
						class="toggle-btn-portrait"
						class:active={isSpinning}
						onclick={fastForward}
						disabled={isFastForwardDisabled}
						aria-label={context.i18nDerived.fastForward()}
					>
						<span class="fast-forward-icon-portrait">{context.i18nDerived.fastForward()}</span>
					</button>

					<div class="spin-section-mobile">
						<button
							class="spin-button-portrait"
							class:spinning-portrait={isSpinning || isAuto}
							class:ante-active-portrait={isBonusActive}
							onclick={handleSpin}
							disabled={isIdle && !stateBetDerived.isBetCostAvailable()}
							aria-label={context.i18nDerived.bet()}
						>
							{#if isAuto || isSpinning}
								<div class="auto-stop-indicator-portrait">
									<div class="stop-rect-portrait">
										{#if isAuto}
											<span class="fs-label-portrait">
												{stateBet.autoSpinsCounter === Infinity ? '∞' : stateBet.autoSpinsCounter}
											</span>
										{/if}
									</div>
								</div>
							{:else}
								<img
									src="assets/sprites/controlBar/spin.png"
									alt={context.i18nDerived.bet()}
									class="spin-icon-mobile"
									draggable="false"
								/>
							{/if}
						</button>
					</div>

					<button
						class="toggle-btn-portrait"
						class:active={isAuto}
						onclick={toggleAuto}
						disabled={(!isIdle && !isAuto) || isAutoDisabled}
						aria-label={context.i18nDerived.autoSpin()}
					>
						<img
							src="assets/sprites/controlBar/autoSpinActive.png"
							alt={context.i18nDerived.autoSpin()}
							class="toggle-icon-portrait"
							draggable="false"
						/>
					</button>
				</div>

				<div class="menu-slot">
					<button
						class="menu-btn-portrait"
						onclick={toggleMenu}
						aria-label={context.i18nDerived.menu()}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
							<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
						</svg>
					</button>
				</div>
			</div>

			<div class="bottom-row">
				<div class="hud-slot-left">
					<div class="balance-display-mobile">
						<span class="mobile-label">{context.i18nDerived.balance()}</span>
						<span class="mobile-value" style:font-size={balanceFontSize}>{balanceFormatted}</span>
					</div>
				</div>

				<div class="hud-slot-center">
					<div class="bet-controls-mobile">
						<button
							class="arrow-btn-mobile"
							onclick={decreaseBet}
							disabled={isSpinning}
							aria-label="Decrease bet"
						>
							<span class="arrow-icon-mobile arrow-down"></span>
						</button>
						<button
							class="bet-info-mobile"
							onclick={openBetModal}
							disabled={isSpinning}
							aria-label="Open bet selection"
						>
							{#if betModeMultiplier > 1}
								<span class="mobile-label">{context.i18nDerived.bet()} {baseBetFormatted}</span>
								<span class="mobile-value">{betFormatted}</span>
							{:else}
								<span class="mobile-label">{context.i18nDerived.bet()}</span>
								<span class="mobile-value">{betFormatted}</span>
							{/if}
						</button>
						<button
							class="arrow-btn-mobile"
							onclick={increaseBet}
							disabled={isSpinning}
							aria-label="Increase bet"
						>
							<span class="arrow-icon-mobile arrow-up"></span>
						</button>
					</div>
				</div>

				<div class="hud-slot-right">
					<div class="win-display-mobile">
						<span class="mobile-label">{context.i18nDerived.win()}</span>
						<span class="mobile-value" style:font-size={winFontSize}>{winFormatted}</span>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="feature-buy-landscape-container">
			<button
				class="feature-buy-landscape"
				class:disabled={isSpinning || isFeatureBuyDisabled}
				class:active={isBonusActive}
				onclick={openFeatureModal}
				aria-label={context.i18nDerived.buyBonus()}
			>
				<img
					src="assets/sprites/controlBar/bonusButton.png"
					alt={context.i18nDerived.buyBonus()}
					class="bonus-button-icon-landscape"
					draggable="false"
				/>
				{#if isBonusActive}
					<span class="mode-dismiss-btn-landscape">{context.i18nDerived.disable()}</span>
				{/if}
			</button>
		</div>

		<div class="control-bar">
			<div class="left-group">
				<button
					class="menu-btn-landscape"
					onclick={toggleMenu}
					aria-label={context.i18nDerived.menu()}
				>
					<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
						<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
					</svg>
				</button>

				<div class="balance-display">
					<span class="label">{context.i18nDerived.balance()}</span>
					<span class="value" style:font-size={balanceFontSize}>{balanceFormatted}</span>
				</div>
			</div>

			<div class="win-display-landscape">
				<span class="label">{context.i18nDerived.win()}</span>
				<span class="value" style:font-size={winFontSize}>{winFormatted}</span>
			</div>

			<div class="right-group-landscape">
				<div class="bet-controls-landscape">
					<button
						class="bet-info-landscape"
						onclick={openBetModal}
						disabled={isSpinning}
						aria-label="Open bet selection"
					>
						<span class="label">{context.i18nDerived.bet()}</span>
						<span class="value">{betFormatted}</span>
					</button>
					<div class="bet-buttons">
						<button
							class="arrow-btn"
							onclick={increaseBet}
							disabled={isSpinning}
							aria-label="Increase bet"
						>
							<img
								src="assets/sprites/controlBar/arrow-up.png"
								alt="Up"
								class="arrow-icon"
								draggable="false"
							/>
						</button>
						<button
							class="arrow-btn"
							onclick={decreaseBet}
							disabled={isSpinning}
							aria-label="Decrease bet"
						>
							<img
								src="assets/sprites/controlBar/arrow-down.png"
								alt="Down"
								class="arrow-icon"
								draggable="false"
							/>
						</button>
					</div>
				</div>

				<div class="spin-section-landscape">
					<button
						class="spin-button-landscape"
						class:spinning-landscape={isSpinning || isAuto}
						class:ante-active-landscape={isBonusActive}
						onclick={handleSpin}
						disabled={isIdle && !stateBetDerived.isBetCostAvailable()}
						aria-label={context.i18nDerived.bet()}
					>
						{#if isAuto || isSpinning}
							<div class="auto-stop-indicator-landscape">
								<div class="stop-rect-landscape">
									{#if isAuto}
										<span class="fs-label-landscape">
											{stateBet.autoSpinsCounter === Infinity ? '∞' : stateBet.autoSpinsCounter}
										</span>
									{/if}
								</div>
							</div>
						{:else}
							<img
								src="assets/sprites/controlBar/spin.png"
								alt={context.i18nDerived.bet()}
								class="spin-icon-landscape"
								draggable="false"
							/>
						{/if}
					</button>
				</div>

				<div class="toggles-landscape">
					<button
						class="toggle-btn-landscape"
						class:active={isSpinning}
						onclick={fastForward}
						disabled={isFastForwardDisabled}
						aria-label={context.i18nDerived.fastForward()}
					>
						<span class="fast-forward-icon-landscape">{context.i18nDerived.fastForward()}</span>
					</button>
					<button
						class="toggle-btn-landscape"
						class:active={isAuto}
						onclick={toggleAuto}
						disabled={(!isIdle && !isAuto) || isAutoDisabled}
						aria-label={context.i18nDerived.autoSpin()}
					>
						<img
							src="assets/sprites/controlBar/autoSpinActive.png"
							alt={context.i18nDerived.autoSpin()}
							class="toggle-icon-landscape"
							draggable="false"
						/>
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if isMenuOpen}
		<button class="modal-backdrop" aria-label="Close menu" onclick={toggleMenu}></button>
		<div class="menu-overlay settings-modal">
			<div class="menu-content">
				<h3 class="text-white label">{context.i18nDerived.settings()}</h3>
				<div class="setting-row">
					<span class="label text-white">{context.i18nDerived.payTable()}</span>
					<button class="text-btn" onclick={openPayTable}>OPEN</button>
				</div>
				<div class="setting-row">
					<span class="label text-white">RULES</span>
					<button class="text-btn" onclick={openGameRules}>OPEN</button>
				</div>
				<div class="setting-row">
					<span class="label text-white">MUSIC</span>
					<label class="switch">
						<input type="checkbox" checked={!isMusicMuted} onchange={toggleMusicMute} />
						<span class="slider round"></span>
					</label>
				</div>
				<div class="setting-row">
					<span class="label text-white">SOUND</span>
					<label class="switch">
						<input type="checkbox" checked={!isMuted} onchange={toggleMute} />
						<span class="slider round"></span>
					</label>
				</div>
				<div class="setting-row">
					<span class="label text-white">VOLUME</span>
					<input
						class="volume-slider"
						type="range"
						min="0"
						max="1"
						step="0.1"
						value={volume}
						oninput={updateVolume}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.control-bar-wrapper {
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 95%;
		max-width: 900px;
		z-index: 1001;
		display: flex;
		align-items: center;
		gap: 15px;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.3s ease-in-out,
			visibility 0.3s,
			bottom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.control-bar-wrapper.show {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.control-bar-wrapper.portrait {
		bottom: 0;
		width: 100%;
		padding: 0;
		display: block;
	}

	.feature-notification-bar {
		position: absolute;
		bottom: 92px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(254, 214, 151, 0.5);
		border-radius: 8px;
		padding: 8px 16px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
	}

	.notification-text {
		font-family: 'Poppins', sans-serif;
		font-weight: 800;
		color: #fed697;
		font-size: 12px;
		letter-spacing: 1px;
	}

	.portrait-control-bar {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.top-row {
		padding: 0 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: relative;
	}

	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		width: 100%;
		margin-top: 10px;
		background-color: #00000094;
	}

	.feature-slot,
	.menu-slot {
		width: 15%;
		display: flex;
		align-items: center;
	}

	.menu-slot {
		justify-content: flex-end;
	}

	.mobile-center-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 70%;
	}

	.hud-slot-left,
	.hud-slot-right {
		width: 20%;
		display: flex;
		align-items: center;
	}

	.hud-slot-left {
		justify-content: flex-start;
	}

	.hud-slot-center {
		width: 60%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.hud-slot-right {
		justify-content: flex-end;
	}

	.control-bar {
		max-height: 68px;
		background: rgba(10, 10, 10, 0.95);
		border-radius: 12px;
		padding: 8px 18px;
		display: flex;
		align-items: center;
		flex: 1;
		justify-content: space-between;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.6),
			inset 0 2px 5px rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
	}

	.left-group,
	.right-group-landscape {
		display: flex;
		align-items: center;
	}

	.left-group {
		flex: 1;
		gap: 16px;
	}

	.right-group-landscape {
		flex: 1.4;
		justify-content: flex-end;
		gap: 14px;
	}

	.balance-display,
	.win-display-landscape,
	.bet-info-landscape,
	.balance-display-mobile,
	.win-display-mobile,
	.bet-info-mobile {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.win-display-landscape {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		align-items: center;
		min-width: 160px;
	}

	.label,
	.mobile-label {
		font-family: 'Poppins', sans-serif;
		font-size: 10px;
		color: #fed697;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		white-space: nowrap;
	}

	.value,
	.mobile-value {
		font-family: 'Poppins', sans-serif;
		font-size: 18px;
		font-weight: 900;
		color: white;
		line-height: 1.1;
		white-space: nowrap;
	}

	.balance-display-mobile,
	.win-display-mobile {
		min-width: 76px;
		padding: 10px 5px 3px;
		align-items: center;
	}

	.bet-controls-mobile,
	.bet-controls-landscape {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.bet-info-mobile,
	.bet-info-landscape {
		background: rgba(15, 15, 15, 0.95);
		border: 1px solid white;
		cursor: pointer;
		color: white;
	}

	.bet-info-mobile {
		border-radius: 25px;
		padding: 6px 20px;
		min-width: 100px;
		align-items: center;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
	}

	.bet-info-landscape {
		border-radius: 8px;
		padding: 6px 16px;
		min-width: 90px;
		align-items: center;
	}

	button:disabled,
	.disabled {
		opacity: 0.45;
		cursor: default;
		pointer-events: none;
	}

	.feature-buy-portrait,
	.feature-buy-landscape {
		position: relative;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.feature-buy-portrait:hover,
	.feature-buy-landscape:hover {
		transform: scale(1.05);
	}

	.bonus-button-icon-portrait {
		width: 68px;
		height: auto;
		display: block;
	}

	.bonus-button-icon-landscape {
		width: 90px;
		height: auto;
		display: block;
	}

	.feature-buy-portrait.active .bonus-button-icon-portrait,
	.feature-buy-landscape.active .bonus-button-icon-landscape {
		filter: drop-shadow(0 0 10px #fed697) saturate(1.35);
	}

	.mode-dismiss-btn-portrait,
	.mode-dismiss-btn-landscape {
		position: absolute;
		left: 50%;
		bottom: -4px;
		transform: translateX(-50%);
		background: #fed697;
		color: #111;
		border-radius: 10px;
		padding: 2px 7px;
		font-family: 'Poppins', sans-serif;
		font-size: 8px;
		font-weight: 900;
		letter-spacing: 0.5px;
	}

	.spin-section-mobile,
	.spin-section-landscape {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spin-button-portrait,
	.spin-button-landscape {
		position: relative;
		border: 0;
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.5));
		transition: transform 0.12s;
	}

	.spin-button-portrait {
		width: 86px;
		height: 86px;
	}

	.spin-button-landscape {
		width: 92px;
		height: 92px;
		margin-top: -22px;
		margin-bottom: -22px;
	}

	.spin-button-portrait:hover,
	.spin-button-landscape:hover {
		transform: scale(1.04);
	}

	.spin-icon-mobile,
	.spin-icon-landscape {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.spin-button-portrait.ante-active-portrait,
	.spin-button-landscape.ante-active-landscape {
		filter: drop-shadow(0 0 12px rgba(254, 214, 151, 0.9));
	}

	.auto-stop-indicator-portrait,
	.auto-stop-indicator-landscape {
		width: 72%;
		height: 72%;
		border-radius: 50%;
		background: #fed697;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 5px solid #2b160e;
	}

	.stop-rect-portrait,
	.stop-rect-landscape {
		width: 34%;
		height: 34%;
		background: #111;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fs-label-portrait,
	.fs-label-landscape {
		position: absolute;
		color: black;
		font-family: 'Poppins', sans-serif;
		font-size: 16px;
		font-weight: 900;
		transform: translateY(38px);
	}

	.toggle-btn-portrait,
	.toggle-btn-landscape,
	.menu-btn-portrait,
	.menu-btn-landscape {
		background: transparent;
		border: 0;
		cursor: pointer;
		padding: 0;
		color: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.menu-btn-portrait {
		background: #00000094;
		width: 38px;
		height: 38px;
		border: 2px solid white;
		border-radius: 8px;
	}

	.toggle-icon-portrait {
		width: 38px;
		height: 38px;
		object-fit: contain;
		background: #fff;
		border-radius: 50%;
	}

	.toggle-icon-landscape {
		width: 32px;
		height: 32px;
		object-fit: contain;
		border-radius: 50%;
	}

	.fast-forward-icon-portrait,
	.fast-forward-icon-landscape {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fff;
		color: #111;
		border-radius: 50%;
		font-family: 'Poppins', sans-serif;
		font-weight: 900;
		line-height: 1;
		box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.12);
	}

	.fast-forward-icon-portrait {
		width: 38px;
		height: 38px;
		font-size: 15px;
	}

	.fast-forward-icon-landscape {
		width: 32px;
		height: 32px;
		font-size: 13px;
	}

	.toggle-btn-portrait.active,
	.toggle-btn-landscape.active {
		filter: drop-shadow(0 0 8px #fed697);
	}

	.toggles-landscape {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.bet-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.arrow-btn,
	.arrow-btn-mobile {
		background: transparent;
		border: 0;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.arrow-btn {
		width: 24px;
		height: 24px;
	}

	.arrow-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.arrow-btn-mobile {
		width: 42px;
		height: 42px;
	}

	.arrow-icon-mobile {
		width: 30px;
		height: 30px;
		display: block;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
	}

	.arrow-icon-mobile.arrow-up {
		background-image: url('/assets/sprites/controlBar/arrow-up.png');
	}

	.arrow-icon-mobile.arrow-down {
		background-image: url('/assets/sprites/controlBar/arrow-down.png');
	}

	.menu-overlay {
		position: absolute;
		bottom: 110%;
		right: 0;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid #444;
		border-radius: 10px;
		padding: 15px;
		width: 250px;
		color: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
		z-index: 1000;
	}

	.settings-modal {
		bottom: 150px;
		right: 20px;
	}

	.menu-content h3 {
		margin: 0 0 15px;
		color: #37cc03;
		font-size: 14px;
		border-bottom: 1px solid #444;
		padding-bottom: 5px;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}

	.text-white {
		color: white;
	}

	.text-btn {
		background: #fed697;
		color: #111;
		border: 0;
		border-radius: 4px;
		font-weight: 900;
		font-size: 11px;
		padding: 4px 8px;
		cursor: pointer;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 24px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #333;
		transition: 0.4s;
		border: 1px solid #444;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 3px;
		background-color: white;
		transition: 0.4s;
	}

	input:checked + .slider {
		background-color: #fed697;
	}

	input:checked + .slider:before {
		transform: translateX(16px);
		background-color: #000;
	}

	.slider.round {
		border-radius: 34px;
	}

	.slider.round:before {
		border-radius: 50%;
	}

	.volume-slider {
		width: 42%;
		height: 6px;
		background: #333;
		border-radius: 5px;
		outline: none;
		margin-left: 15px;
		accent-color: #fed697;
	}

	.modal-backdrop {
		position: fixed;
		top: -100vh;
		left: -100vw;
		width: 300vw;
		height: 300vh;
		background: transparent;
		border: 0;
		z-index: 999;
		cursor: pointer;
	}

	@media (max-width: 600px) {
		.control-bar-wrapper {
			bottom: 10px;
			width: 100%;
			gap: 5px;
			justify-content: center;
		}

		.spin-button-portrait {
			width: 76px;
			height: 76px;
		}

		.bonus-button-icon-portrait {
			width: 58px;
		}

		.bet-info-mobile {
			padding: 5px 12px;
			min-width: 88px;
		}
	}

	@media (max-width: 360px) {
		.top-row {
			padding: 0 8px;
		}

		.spin-button-portrait {
			width: 68px;
			height: 68px;
		}

		.toggle-icon-portrait,
		.menu-btn-portrait {
			width: 32px;
			height: 32px;
		}

		.bet-info-mobile {
			padding: 4px 8px;
			min-width: 78px;
		}

		.mobile-label {
			font-size: 8px;
		}

		.mobile-value {
			font-size: 11px;
		}
	}

	.popout-s .control-bar {
		transform: scale(0.62);
		transform-origin: bottom center;
		padding: 4px 10px;
		gap: 8px;
		border-radius: 16px;
		max-height: 45px;
	}

	.popout-s .label,
	.popout-s .mobile-label {
		font-size: 7px;
	}

	.popout-s .value,
	.popout-s .mobile-value {
		font-size: 14px;
	}

	.popout-s .spin-button-landscape {
		width: 70px;
		height: 70px;
	}

	.popout-s .bonus-button-icon-landscape {
		width: 58px;
	}
</style>
