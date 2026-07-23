<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { OnHotkey } from 'components-shared';
	import {
		stateConfig,
		stateSound,
		stateBet,
		stateBetDerived,
		stateI18n,
		stateModal,
		stateUi,
		stateUrlDerived,
	} from 'state-shared';
	import { getContext } from '../game/context';
	import ControlToggleIcon from './ControlToggleIcon.svelte';
	import {
		numberToCurrencyString as formatCurrency,
		bookEventAmountToNormalisedAmount,
	} from 'utils-shared/amount';
	import { waitForTimeout } from 'utils-shared/wait';
	import { BIG_WIN_PRESENTATION_MIN_BOOK_EVENT_AMOUNT } from '../game/winLevelMap';
	import { CONTROL_BAR_THEME } from '../game/controlBarTheme';
	import InfoModal from './InfoModal.svelte';

	const { stateGame, i18nDerived, stateLayoutDerived, eventEmitter, stateXstateDerived } =
		getContext();

	function safeNumber(value: unknown) {
		return typeof value === 'number' && Number.isFinite(value) ? value : 0;
	}

	function formatLastWin(value: number) {
		return formatCurrency(safeNumber(value));
	}

	const isSocial = $derived(stateConfig.jurisdiction?.socialCasino);
	const betLabel = $derived(isSocial ? 'PLAY' : i18nDerived.bet());
	const costLabel = $derived(isSocial ? 'PLAY' : 'BET');
	const balanceLabel = $derived(isSocial ? 'FUNDS' : i18nDerived.balance());
	const bonusLabel = $derived(isSocial ? 'FEATURE MODES' : i18nDerived.buyBonus());
	const lastResultLabel = $derived(isSocial ? 'LAST RESULT' : stateI18n.i18n._('LAST WIN'));
	const lowFundsLabel = $derived(isSocial ? 'LOW FUNDS' : 'INSUFFICIENT BALANCE');

	const isIdle = $derived(stateXstateDerived.isIdle());
	const isSpinning = $derived(!isIdle);
	const isRoundInProgress = $derived(stateXstateDerived.isPlaying());
	const balance = $derived(safeNumber(stateBet.balanceAmount));
	const currentBet = $derived(safeNumber(stateBet.betAmount));
	const totalBet = $derived(safeNumber(stateBetDerived.betCost()));
	const freeSpinCount = $derived(
		stateUi.freeSpinCounterShow ? safeNumber(stateUi.freeSpinCounterTotal) : 0,
	);
	const isFreeSpin = $derived(stateGame.gameType === 'freegame');
	const freeSpinCurrent = $derived(safeNumber(stateUi.freeSpinCounterCurrent));
	const freeSpinTotal = $derived(safeNumber(stateUi.freeSpinCounterTotal));
	const activeBetMode = $derived(stateBetDerived.activeBetMode());
	const activeBetModeKey = $derived((stateBet.activeBetModeKey ?? 'BASE').toUpperCase());
	const isExtraChance = $derived(activeBetModeKey === 'EXTRA_CHANCE');
	const isGlitchMachine = $derived(activeBetModeKey === 'GLITCH_MACHINE');
	const isMultiHunt = $derived(false);
	const isFeatureModeActive = $derived(activeBetMode?.type === 'activate' && activeBetModeKey !== 'BASE');
	const isGenericFeatureActive = $derived(
		isFeatureModeActive && !isExtraChance && !isGlitchMachine && !isMultiHunt,
	);
	const isFeatureButtonActive = $derived(
		isFeatureModeActive || isExtraChance || isGlitchMachine || isMultiHunt,
	);
	const isReplay = $derived(stateUi.config.mode === 'replay');
	const isReplayFinished = $derived(isReplay && stateUi.config.replayStatus === 'finished');
	const isReplayLoading = $derived(isReplay && stateUi.config.replayStatus === 'ready');
	const currentSpinWin = $derived(
		safeNumber(bookEventAmountToNormalisedAmount(stateBet.winBookEventAmount)),
	);
	let lastWinAmount = $state(0);
	let inlineWinAmount = $state(0);
	let showInlineWin = $state(false);

	const isAuto = $derived(
		stateBetDerived.hasAutoBetCounter() || stateXstateDerived.isAutoBetting(),
	);
	const autoSpinCount = $derived(
		stateBet.autoSpinsCounter === Infinity ? '∞' : `${stateBet.autoSpinsCounter}`,
	);
	const isTurbo = $derived(stateBet.isTurbo);
	const isTurboDisabled = $derived(!!stateConfig.jurisdiction?.disabledTurbo);
	const isFastForwardDisabled = $derived(isIdle || stateBet.isSpaceHold);
	const isFeatureBuyDisabled = $derived(!!stateConfig.jurisdiction?.disabledBuyFeature);
	let isOverlayActive = $state(false);
	let isHudHidden = $state(false);
	let canSkip = $state(false);
	let stopDisabled = $state(false);

	function getLiveSessionParams() {
		let searchParams: URLSearchParams | undefined;
		if (typeof window !== 'undefined') {
			searchParams = new URLSearchParams(window.location.search);
		}

		const sessionID =
			searchParams?.get('sessionID') ||
			searchParams?.get('sessionId') ||
			searchParams?.get('session_id') ||
			searchParams?.get('session-id') ||
			stateUrlDerived.sessionID();
		const rgsUrl =
			searchParams?.get('rgs_url') ||
			searchParams?.get('rgsUrl') ||
			searchParams?.get('rgs-url') ||
			stateUrlDerived.rgsUrl();

		return { sessionID, rgsUrl };
	}

	const cloneReplayBet = () =>
		stateBet.replayBet ? JSON.parse(JSON.stringify(stateBet.replayBet)) : null;

	function isDemoPreviewOnly() {
		const { sessionID, rgsUrl } = getLiveSessionParams();
		return stateUrlDerived.demo() && (!sessionID || !rgsUrl);
	}

	let isMenuOpen = $state(false);
	let isInfoModalOpen = $state(false);
	let isAutoSpinModalOpen = $state(false); // New state for Auto Spin selection
	let isBetModalOpen = $state(false);
	let autoCountToConfirm = $state(0);

	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				isAutoSpinModalOpen = false;
				isBetModalOpen = false;
				isMenuOpen = false;
				isInfoModalOpen = false;
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
	// ----------------------------------------

	// Use derived state to stay in sync with global stateSound
	const volume = $derived(stateSound.volumeValueMaster / 100);
	const isMuted = $derived(stateSound.volumeValueMaster === 0);
	const isMusicMuted = $derived(stateSound.volumeValueMusic === 0);
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isStakePopoutViewport = $derived.by(() => {
		const ratio = canvasSizes.width / Math.max(canvasSizes.height, 1);
		return canvasSizes.width <= 900 && canvasSizes.height <= 520 && ratio >= 1.55;
	});
	const controlBarLayoutType = $derived(
		layoutType === 'popout' || isStakePopoutViewport ? 'popout' : layoutType,
	);
	const isPopoutS = $derived(controlBarLayoutType === 'popout' && canvasSizes.width <= 500);
	const isPopoutL = $derived(controlBarLayoutType === 'popout' && canvasSizes.width > 500);
	const cbScale = $derived.by(() => {
		if (controlBarLayoutType === 'portrait') return 1;
		if (controlBarLayoutType === 'popout') {
			return Math.min(1, canvasSizes.width / 960, canvasSizes.height / 540);
		}
		return Math.min(1, canvasSizes.width / 1200);
	});

	const winLabel = $derived(i18nDerived.win());
	const winAmount = $derived(isRoundInProgress ? currentSpinWin : lastWinAmount);
	const inlineWinFormatted = $derived(formatCurrency(inlineWinAmount));
	const decreaseCostLabel = $derived(
		isSocial ? 'DECREASE PLAY COST' : stateI18n.i18n._('DECREASE BET'),
	);
	const increaseCostLabel = $derived(
		isSocial ? 'INCREASE PLAY COST' : stateI18n.i18n._('INCREASE BET'),
	);
	const openCostSelectionLabel = $derived(
		isSocial ? 'OPEN PLAY COST SELECTION' : stateI18n.i18n._('OPEN BET SELECTION'),
	);

	// Dynamic font size calculation for balance and win in Popout S
	const balanceFormatted = $derived(formatCurrency(balance));
	const winFormatted = $derived(formatLastWin(winAmount));

	const balanceFontSize = $derived.by(() => {
		if (!isPopoutS) return 'inherit';
		const len = balanceFormatted.length;
		if (len > 15) return '14px';
		if (len > 12) return '16px';
		if (len > 10) return '18px';
		return 'inherit';
	});

	const winFontSize = $derived.by(() => {
		if (!isPopoutS) return 'inherit';
		const len = winFormatted.length;
		if (len > 15) return '14px';
		if (len > 12) return '16px';
		if (len > 10) return '18px';
		return 'inherit';
	});

	const isBlockingUiModalOpen = $derived(
		isInfoModalOpen || isAutoSpinModalOpen || isBetModalOpen || isMenuOpen,
	);
	const canStartRound = $derived(isIdle && !isBlockingUiModalOpen);
	const hasSpinBalance = $derived(
		stateBetDerived.isBetCostAvailable() || isFreeSpin || freeSpinCount > 0,
	);
	const betModeMultiplier = $derived(activeBetMode?.costMultiplier ?? 1);
	const displayBetLabel = $derived(
		betModeMultiplier > 1 ? `${costLabel} ×${betModeMultiplier}` : costLabel,
	);
	const canPressSpinButton = $derived(
		isReplay
			? isReplayFinished
			: isIdle
				? stateBetDerived.isBetCostAvailable()
				: !stopDisabled && (!stateBet.isTurbo || stateBetDerived.hasAutoBetCounter()),
	);
	const betLevels = $derived(stateConfig.betAmountOptions ?? []);
	const isDemoPreview = $derived.by(() => isDemoPreviewOnly());

	eventEmitter.subscribeOnMount({
		uiHide: () => {
			isOverlayActive = true;
			isHudHidden = true;
		},
		uiShow: () => {
			isOverlayActive = false;
			isHudHidden = false;
		},
		stopButtonEnable: () => {
			canSkip = true;
			stopDisabled = false;
			stateBetDerived.updateIsTurbo(false, { persistent: false });
		},
		stopButtonClick: () => {
			canSkip = false;
			stopDisabled = true;
			stateBetDerived.updateIsTurbo(true, { persistent: false });
		},
		winHide: () => {
			showInlineWin = false;
		},
		winUpdate: async (emitterEvent) => {
			if (
				emitterEvent.amount >= BIG_WIN_PRESENTATION_MIN_BOOK_EVENT_AMOUNT ||
				stateGame.gameType === 'freegame'
			) {
				return;
			}

			inlineWinAmount = safeNumber(bookEventAmountToNormalisedAmount(emitterEvent.amount));
			showInlineWin = inlineWinAmount > 0;

			if (!showInlineWin) return;

			await waitForTimeout(Math.max(emitterEvent.winLevelData.presentDuration ?? 0, 1000));
			showInlineWin = false;
		},
	});

	$effect(() => {
		if (!isSpinning) lastWinAmount = currentSpinWin;
	});

	$effect(() => {
		stateGame.isUiModalOpen = isBlockingUiModalOpen;
	});

	$effect(() => {
		if (isTurboDisabled && stateBet.isTurbo) {
			stateBetDerived.updateIsTurbo(false, { persistent: true });
		} else if (!isFreeSpin && !isTurboDisabled && !stateBet.isTurbo) {
			stateBetDerived.updateIsTurbo(true, { persistent: true });
		}
	});

	onDestroy(() => {
		stateGame.isUiModalOpen = false;
		if (notificationTimer) clearTimeout(notificationTimer);
	});

	function handleSpin() {
		eventEmitter.broadcast({ type: 'soundPressBet' });

		if (isReplay) {
			const replayBet = cloneReplayBet();
			if (!isReplayFinished || !replayBet) return;
			stateBet.betToResume = replayBet;
			stateUi.config.replayStatus = 'playing';
			eventEmitter.broadcast({ type: 'resumeBet' });
			return;
		}

		if (isIdle) {
			if (!stateBetDerived.isBetCostAvailable()) {
				triggerNotification(lowFundsLabel);
				return;
			}

			if (activeBetMode?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			eventEmitter.broadcast({ type: 'bet' });
			return;
		}

		if (stopDisabled) return;
		if (stateBet.isTurbo && !stateBetDerived.hasAutoBetCounter()) return;
		if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
		eventEmitter.broadcast({ type: 'stopButtonClick' });
	}

	function openBetModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning || isFreeSpin || isReplay) return;
		stateModal.modal = { name: 'betAmountMenu' };
	}

	function closeBetModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isBetModalOpen = false;
	}

	function selectBetAmount(amount: number) {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.setBetAmount(amount);
		isBetModalOpen = false;
	}

	function decreaseBet() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning || isFreeSpin || isReplay) return;

		const options = stateConfig.betAmountOptions ?? [];
		if (options.length === 0) return;

		const currentIndex = options.findIndex((amount) => amount === stateBet.betAmount);
		if (currentIndex === -1) {
			stateBetDerived.setBetAmount(options[0]);
			return;
		}

		const prevIndex = Math.max(currentIndex - 1, 0);
		stateBetDerived.setBetAmount(options[prevIndex]);
	}

	function increaseBet() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning || isFreeSpin || isReplay) return;

		const options = stateConfig.betAmountOptions ?? [];
		if (options.length === 0) return;

		const currentIndex = options.findIndex((amount) => amount === stateBet.betAmount);
		if (currentIndex === -1) {
			stateBetDerived.setBetAmount(options[0]);
			return;
		}

		const nextIndex = Math.min(currentIndex + 1, options.length - 1);
		stateBetDerived.setBetAmount(options[nextIndex]);
	}

	function toggleAuto() {
		if (stateConfig.jurisdiction?.disabledAutoplay || isRoundInProgress) return;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (isAuto) {
			stateBet.autoSpinsCounter = 0;
			autoCountToConfirm = 0;
		} else {
			isAutoSpinModalOpen = !isAutoSpinModalOpen;
			autoCountToConfirm = 0;
		}
	}

	function selectAutoCount(count: number) {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		autoCountToConfirm = count;
	}

	function confirmAutoSpin() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (autoCountToConfirm > 0 && !stateConfig.jurisdiction?.disabledAutoplay) {
			isAutoSpinModalOpen = false;
			stateBet.autoSpinsCounter = autoCountToConfirm === 1000 ? Infinity : autoCountToConfirm;
			stateBet.autoSpinsLossLimitAmount = Infinity;
			stateBet.autoSpinsSingleWinLimitAmount = Infinity;
			if (activeBetMode?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			eventEmitter.broadcast({ type: 'autoBet' });
			autoCountToConfirm = 0;
		}
	}

	function closeAutoModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isAutoSpinModalOpen = false;
		autoCountToConfirm = 0;
	}

	function fastForward() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isFastForwardDisabled) return;
		eventEmitter.broadcast({ type: 'skipLexPlayback' });
	}

	function toggleMenu() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isMenuOpen = !isMenuOpen;
	}

	function toggleMute() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 100 : 0;
	}

	function toggleMusicMute() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateSound.volumeValueMusic = stateSound.volumeValueMusic === 0 ? 100 : 0;
	}

	function updateVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		const vol = parseFloat(target.value);
		stateSound.volumeValueMaster = vol * 100;
	}

	function exitReplay() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const url = new URL(window.location.href);
		url.searchParams.delete('replay');
		window.location.href = url.toString();
	}

	function openFeatureModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isSpinning || isFeatureBuyDisabled || isReplay) return;

		if (activeBetMode?.type === 'activate') {
			stateBet.activeBetModeKey = 'BASE';
			triggerNotification('FEATURE DISABLED');
			return;
		}

		stateModal.modal = { name: 'buyBonus' };
	}

	function openInfoModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isInfoModalOpen = true;
		isMenuOpen = false;
	}

	function closeInfoModal() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		isInfoModalOpen = false;
	}
	function deactivateMode() {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.activeBetModeKey = 'BASE';
	}

	// --- FEATURE NOTIFICATION LOGIC ---
	let notificationText = $state('');
	let showNotification = $state(false);
	let notificationTimer: ReturnType<typeof setTimeout> | undefined;

	function triggerNotification(text: string) {
		notificationText = text;
		showNotification = true;
		if (notificationTimer) clearTimeout(notificationTimer);
		notificationTimer = setTimeout(() => {
			showNotification = false;
		}, 2000);
	}

	$effect(() => {
		const modal = stateModal.modal;
		if (modal?.name !== 'autoSpinMessage' || modal.message !== 'insufficientFunds') return;

		stateModal.modal = null;
		triggerNotification(lowFundsLabel);
	});

	// Use a variable to track previous states to only trigger on activation (false -> true)
	let prevExtraChance = false;
	let prevGlitchMachine = false;
	let prevMultiHunt = false;

	$effect(() => {
		if (isExtraChance && !prevExtraChance) {
			triggerNotification('EXTRA CHANCE ACTIVATED');
		}
		if (isGlitchMachine && !prevGlitchMachine) {
			triggerNotification('GLITCH MACHINE ACTIVATED');
		}
		if (isMultiHunt && !prevMultiHunt) {
			triggerNotification('MULTI HUNT ACTIVATED');
		}
		prevExtraChance = isExtraChance;
		prevGlitchMachine = isGlitchMachine;
		prevMultiHunt = isMultiHunt;
	});
	// ----------------------------------
</script>

{#if isInfoModalOpen}
	<InfoModal onClose={closeInfoModal} />
{/if}

<OnHotkey
	hotkey="Space"
	disabled={stateConfig.jurisdiction?.disabledSpacebar ||
		!canPressSpinButton ||
		isFreeSpin ||
		isBlockingUiModalOpen}
	onpress={handleSpin}
/>

<div
	class="control-bar-wrapper {controlBarLayoutType}"
	class:popout-s={isPopoutS}
	class:popout-l={isPopoutL}
	class:hidden={isHudHidden}
	class:dimmed={isOverlayActive}
	style:--cb-scale={cbScale}
	style:--z-index={isHudHidden ? 1 : 1001}
	style:--pipee-accent={CONTROL_BAR_THEME.accent}
	style:--pipee-accent-bright={CONTROL_BAR_THEME.accentBright}
	style:--pipee-accent-soft={CONTROL_BAR_THEME.accentSoft}
	style:--pipee-accent-border={CONTROL_BAR_THEME.accentBorder}
	style:--pipee-accent-glow={CONTROL_BAR_THEME.accentGlow}
>
	<!-- FEATURE ACTIVATION NOTIFICATION -->
	{#if showNotification}
		<div class="feature-notification-bar" transition:fly={{ y: -20, duration: 400 }}>
			<span class="notification-text">{notificationText}</span>
		</div>
	{/if}

	<!-- AUTO SPIN MODAL -->
	{#if isAutoSpinModalOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={closeAutoModal}></div>
		<div class="menu-overlay auto-modal">
			<div class="menu-content">
				<h3 class="label text-white">{i18nDerived.autoSpin()}</h3>
				<div class="auto-options">
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 10}
						onclick={() => selectAutoCount(10)}>10</button
					>
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 20}
						onclick={() => selectAutoCount(20)}>20</button
					>
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 50}
						onclick={() => selectAutoCount(50)}>50</button
					>
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 100}
						onclick={() => selectAutoCount(100)}>100</button
					>
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 200}
						onclick={() => selectAutoCount(200)}>200</button
					>
					<button
						class="auto-opt"
						class:selected={autoCountToConfirm === 1000}
						onclick={() => selectAutoCount(1000)}>∞</button
					>
				</div>
				<button
					class="auto-confirm-btn"
					disabled={autoCountToConfirm === 0 || stateConfig.jurisdiction?.disabledAutoplay}
					onclick={confirmAutoSpin}
				>
					{i18nDerived.autoSpin()}
				</button>
			</div>
		</div>
	{/if}

	{#if isBetModalOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={closeBetModal}></div>
		<div class="menu-overlay bet-modal">
			<div class="menu-content">
				<h3 class="label text-white">{costLabel}</h3>
				<div class="bet-options">
					{#each betLevels as betAmount}
						<button
							class="bet-opt"
							class:active={Math.abs(betAmount - currentBet) < 0.001}
							onpointerup={() => selectBetAmount(betAmount)}
						>
							{formatCurrency(betAmount)}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if controlBarLayoutType === 'portrait'}
		<!-- ----------------------------------------------------- -->
		<!--                   PORTRAIT LAYOUT                     -->
		<!-- ----------------------------------------------------- -->
		<div class="portrait-control-bar">
			<!-- Top Row: Feature, Turbo, Spin, Auto, Menu -->
			<div class="top-row">
				<!-- 1. Feature Buy -->
				<div class="mobile-top-side mobile-top-side-left">
					<div
						class="feature-buy-portrait"
						class:disabled={isFreeSpin || isSpinning || isFeatureBuyDisabled}
						class:active={isFeatureButtonActive}
						onclick={() =>
							!isFreeSpin && !isSpinning && !isFeatureBuyDisabled && openFeatureModal()}
						data-sound-click
						role="button"
						tabindex="0"
						aria-disabled={isFreeSpin || isSpinning || isFeatureBuyDisabled}
						onkeydown={(e) =>
							e.key === 'Enter' && !isFreeSpin && !isFeatureBuyDisabled && openFeatureModal()}
					>
						<img
							src="assets/sprites/controlBar/bonusButton.png"
							alt={bonusLabel}
							class="bonus-button-icon-portrait feature-buy-mobile"
							class:tint-ante={isExtraChance || isGenericFeatureActive}
							class:tint-glitch={isGlitchMachine}
							class:tint-multihunt={isMultiHunt}
							draggable="false"
						/>

						{#if isFeatureButtonActive && !isFreeSpin}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								class="mode-dismiss-btn-portrait"
								class:is-spinning-portrait={isSpinning}
								onclick={(e) => {
									if (isSpinning) return;
									e.stopPropagation();
									deactivateMode();
								}}
								data-sound-click
								role="button"
								tabindex="0"
								aria-disabled={isSpinning}
								aria-label={stateI18n.i18n._('Deactivate mode')}
							>
								<span>{stateI18n.i18n._('DISABLE')}</span>
							</div>
						{/if}
					</div>
				</div>

				<div class="mobile-top-actions">
					<!-- 2. Turbo Toggle -->
					<button
						class="toggle-btn-portrait turbo-btn-mobile"
						class:active={isSpinning && !isFastForwardDisabled}
						onclick={fastForward}
						aria-label={i18nDerived.fastForward()}
						disabled={isFastForwardDisabled}
					>
						<ControlToggleIcon
							kind="turbo"
							active={isSpinning && !isFastForwardDisabled}
							size="portrait"
							label={i18nDerived.fastForward()}
						/>
					</button>

					<!-- 3. Center Spin Button -->
					<div class="spin-section-mobile">
						<button
							class="spin-button-portrait spin-button-mobile"
							class:spinning-portrait={isSpinning}
							class:free-spin-portrait={isFreeSpin}
							class:ante-active-portrait={isExtraChance || isGenericFeatureActive}
							class:glitch-active-portrait={isGlitchMachine}
							class:multi-active-portrait={isMultiHunt}
							class:replay-portrait={isReplay}
							onclick={handleSpin}
							disabled={isReplay
								? !isReplayFinished
								: isIdle && !stateBetDerived.isBetCostAvailable()}
							aria-label={isReplay ? stateI18n.i18n._('REPLAY') : betLabel}
						>
							{#if isReplay}
								{#if isReplayLoading}
									<div class="watching-text-portrait">...</div>
								{:else if isReplayFinished}
									<div class="auto-stop-indicator-portrait">
										<span class="fs-label-portrait">{stateI18n.i18n._('PLAY') || 'PLAY'}</span>
										<div class="stop-square-portrait replay-again"></div>
									</div>
								{:else if isSpinning}
									<div class="watching-text-portrait">{stateI18n.i18n._('WATCH')}</div>
								{:else}
									<img
										src="assets/sprites/controlBar/spin.png"
										alt="Start Replay"
										class="spin-icon-mobile"
										draggable="false"
									/>
								{/if}
							{:else if isAuto || isSpinning}
								<div class="auto-stop-indicator-portrait">
									<div class="stop-rect-portrait">
										{#if isAuto}
											<span
												class="fs-label-portrait auto-count"
												class:infinite-count={autoSpinCount === '∞'}
												style="color: black">{autoSpinCount}</span
											>
										{/if}
									</div>
								</div>
							{:else}
								<img
									src="assets/sprites/controlBar/spin.png"
									alt={betLabel}
									class="spin-icon-mobile"
									draggable="false"
								/>
							{/if}
						</button>
					</div>

					<!-- 4. Auto Toggle -->
					<button
						class="toggle-btn-portrait auto-btn-mobile"
						class:active={isAuto}
						onclick={toggleAuto}
						aria-label={i18nDerived.autoSpin()}
						disabled={isRoundInProgress || stateConfig.jurisdiction?.disabledAutoplay}
					>
						<ControlToggleIcon
							kind="autoplay"
							active={isAuto}
							size="portrait"
							label={i18nDerived.autoSpin()}
						/>
					</button>
				</div>

				<div class="mobile-top-side mobile-top-side-right">
					<!-- 5. Menu -->
					<button
						class="menu-btn-portrait menu-btn-mobile"
						onclick={toggleMenu}
						aria-label={i18nDerived.menu()}
						style="background:#00000094;"
					>
						<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" style="color:white">
							<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Connected Bottom Section containing both Bet Controls & Balance/Win strip -->
			<div class="bottom-container-mobile">
				<div class="bet-row">
					<div class="bet-controls-mobile bet-controls-row" class:disabled={isFreeSpin || isReplay}>
						<button
							class="arrow-btn-mobile"
							onclick={decreaseBet}
							disabled={isSpinning || isFreeSpin || isReplay}
							aria-label={decreaseCostLabel}
						>
							<span class="arrow-icon-mobile arrow-down"></span>
						</button>
						<button
							class="bet-info-mobile bet-picker-btn-portrait"
							onclick={openBetModal}
							disabled={isSpinning || isFreeSpin || isReplay}
							aria-label={openCostSelectionLabel}
						>
							{#if isReplay}
								<span class="mobile-label replay-label">{stateI18n.i18n._('REPLAY')}</span>
								<span class="mobile-value">{stateI18n.i18n._('MODE')}</span>
							{:else}
								<span class="mobile-label">{displayBetLabel}</span>
								<span class="mobile-value">{formatCurrency(currentBet * betModeMultiplier)}</span>
							{/if}
						</button>
						<button
							class="arrow-btn-mobile"
							onclick={increaseBet}
							disabled={isSpinning || isFreeSpin || isReplay}
							aria-label={increaseCostLabel}
						>
							<span class="arrow-icon-mobile arrow-up"></span>
						</button>
					</div>
				</div>

				<div class="bottom-row">
					<div class="balance-display-mobile">
						<span class="mobile-label">{balanceLabel}</span>
						<span class="mobile-value" style:font-size={balanceFontSize}>{balanceFormatted}</span>
					</div>

					<div class="win-display-mobile">
						<span class="mobile-label">{lastResultLabel}</span>
						<span class="mobile-value" style:font-size={winFontSize}>{winFormatted}</span>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- ----------------------------------------------------- -->
		<!--              LANDSCAPE/DESKTOP LAYOUT                 -->
		<!-- ----------------------------------------------------- -->
		<!-- 1. Detached Feature Buy -->
		<div class="feature-buy-container feature-buy-landscape-container">
			<div
				class="feature-buy-landscape"
				class:disabled={isFreeSpin || isSpinning || isFeatureBuyDisabled}
				class:active={isFeatureButtonActive}
				onclick={() => !isFreeSpin && !isSpinning && !isFeatureBuyDisabled && openFeatureModal()}
				data-sound-click
				role="button"
				tabindex="0"
				aria-disabled={isFreeSpin || isSpinning || isFeatureBuyDisabled}
				onkeydown={(e) =>
					e.key === 'Enter' && !isFreeSpin && !isFeatureBuyDisabled && openFeatureModal()}
			>
				<img
					src="assets/sprites/controlBar/bonusButton.png"
					alt={bonusLabel}
					class="bonus-button-icon-landscape"
					class:tint-ante={isExtraChance || isGenericFeatureActive}
					class:tint-glitch={isGlitchMachine}
					class:tint-multihunt={isMultiHunt}
					draggable="false"
				/>

				{#if isFeatureButtonActive && !isFreeSpin}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="mode-dismiss-btn-landscape"
						class:is-spinning-landscape={isSpinning}
						onclick={(e) => {
							if (isSpinning) return;
							e.stopPropagation();
							deactivateMode();
						}}
						data-sound-click
						role="button"
						tabindex="0"
						aria-disabled={isSpinning}
						aria-label={stateI18n.i18n._('Deactivate mode')}
					>
						<span>{stateI18n.i18n._('DISABLE')}</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="control-bar">
			{#if showInlineWin}
				<div class="inline-win-display">
					<span class="label">{winLabel}</span>
					<span class="value">{inlineWinFormatted}</span>
				</div>
			{/if}

			<div class="left-group">
				<!-- 6. Menu (Moved to far left) -->
				<button class="menu-btn-landscape" onclick={toggleMenu} aria-label={i18nDerived.menu()}>
					<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
						<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
					</svg>
				</button>

				<!-- 2. Balance Display -->
				<div class="balance-display">
					<span class="label">{balanceLabel}</span>
					<span class="value" style:font-size={balanceFontSize}>{balanceFormatted}</span>
				</div>
			</div>

			<div class="right-group-landscape">
				<!-- 5. Bet Controls -->
				<div class="bet-controls-landscape" class:disabled={isFreeSpin || isReplay}>
					<button
						class="bet-info-landscape bet-picker-btn-landscape"
						onclick={openBetModal}
						disabled={isSpinning || isFreeSpin || isReplay}
						aria-label={openCostSelectionLabel}
					>
						{#if isReplay}
							<span class="label replay-label">{stateI18n.i18n._('REPLAY')}</span>
							<span class="value" style="font-size: 16px;">{stateI18n.i18n._('MODE')}</span>
						{:else if betModeMultiplier > 1}
							<span class="label">{displayBetLabel}</span>
							<span class="value">{formatCurrency(currentBet * betModeMultiplier)}</span>
						{:else}
							<span class="label">{displayBetLabel}</span>
							<span class="value">{formatCurrency(currentBet)}</span>
						{/if}
					</button>
					<div class="bet-buttons">
						<button
							class="arrow-btn"
							onclick={increaseBet}
							disabled={isSpinning || isFreeSpin || isReplay}
							aria-label={increaseCostLabel}
						>
							<img
								src="assets/sprites/controlBar/arrow-up.png"
								alt={stateI18n.i18n._('UP')}
								class="arrow-icon"
								draggable="false"
							/>
						</button>
						<button
							class="arrow-btn"
							onclick={decreaseBet}
							disabled={isSpinning || isFreeSpin || isReplay}
							aria-label={decreaseCostLabel}
						>
							<img
								src="assets/sprites/controlBar/arrow-down.png"
								alt={stateI18n.i18n._('DOWN')}
								class="arrow-icon"
								draggable="false"
							/>
						</button>
					</div>
				</div>

				<!-- 4. Spin Button (Moved to right) -->
				<div class="spin-section-landscape">
					<button
						class="spin-button-landscape"
						class:spinning-landscape={isSpinning}
						class:free-spin-landscape={isFreeSpin}
						class:replay-landscape={isReplay}
						class:ante-active-landscape={isExtraChance || isGenericFeatureActive}
						class:glitch-active-landscape={isGlitchMachine}
						class:multi-active-landscape={isMultiHunt}
						onclick={handleSpin}
						disabled={isReplay
							? !isReplayFinished
							: isIdle && !stateBetDerived.isBetCostAvailable()}
						aria-label={isReplay ? stateI18n.i18n._('REPLAY') : betLabel}
					>
						{#if isReplay}
							{#if isReplayLoading}
								<div class="watching-text-landscape">...</div>
							{:else if isReplayFinished}
								<div class="auto-stop-indicator-landscape">
									<span class="fs-label-landscape">{stateI18n.i18n._('PLAY') || 'PLAY'}</span>
									<div class="stop-square-landscape replay-again"></div>
								</div>
							{:else if isSpinning}
								<div class="watching-text-landscape">{stateI18n.i18n._('WATCHING')}</div>
							{:else}
								<img
									src="assets/sprites/controlBar/spin.png"
									alt={stateI18n.i18n._('START REPLAY')}
									class="spin-icon-landscape"
									draggable="false"
								/>
							{/if}
						{:else if isAuto || isSpinning}
							<div class="auto-stop-indicator-landscape">
								<div class="stop-rect-landscape">
									{#if isAuto}
										<span
											class="fs-label-landscape auto-count"
											class:infinite-count={autoSpinCount === '∞'}
											style="color: black">{autoSpinCount}</span
										>
									{/if}
								</div>
							</div>
						{:else}
							<img
								src="assets/sprites/controlBar/spin.png"
								alt={betLabel}
								class="spin-icon-landscape"
								draggable="false"
							/>
						{/if}
					</button>
				</div>

				<!-- 3. Toggles (Auto / Turbo) -->
				<div class="toggles-landscape">
					<button
						class="toggle-btn-landscape turbo-btn-landscape"
						class:active={isSpinning && !isFastForwardDisabled}
						onclick={fastForward}
						aria-label={i18nDerived.fastForward()}
						disabled={isFastForwardDisabled}
					>
						<ControlToggleIcon
							kind="turbo"
							active={isSpinning && !isFastForwardDisabled}
							size="landscape"
							label={i18nDerived.fastForward()}
						/>
					</button>
					<button
						class="toggle-btn-landscape"
						class:active={isAuto}
						onclick={toggleAuto}
						aria-label={i18nDerived.autoSpin()}
						disabled={isRoundInProgress || stateConfig.jurisdiction?.disabledAutoplay}
					>
						<ControlToggleIcon
							kind="autoplay"
							active={isAuto}
							size="landscape"
							label={i18nDerived.autoSpin()}
						/>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Menu Overlay (Shared) -->
	{#if isMenuOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={toggleMenu}></div>
		<div class="menu-overlay setting-menu-overlay">
			<div class="menu-content">
				<h3 class="text-white label">{i18nDerived.settings()}</h3>
				<div
					class="setting-row info-setting-row"
					role="button"
					tabindex="0"
					onclick={openInfoModal}
					onkeydown={(e) => e.key === 'Enter' && openInfoModal()}
				>
					<span class="label text-white">{stateI18n.i18n._('INFO')}</span>
					<button
						class="info-btn"
						style="padding:0;"
						aria-label={stateI18n.i18n._('INFO')}
						onclick={(e) => {
							e.stopPropagation();
							openInfoModal();
						}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="var(--pipee-accent-soft)"
							stroke="black"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							style="vertical-align: middle;"
						>
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="16" x2="12" y2="12"></line>
							<line x1="12" y1="8" x2="12.01" y2="8"></line>
						</svg>
					</button>
				</div>
				<div class="setting-row">
					<span class="label text-white">{stateI18n.i18n._('MUSIC')}</span>
					<label class="switch">
						<input type="checkbox" checked={!isMusicMuted} onchange={toggleMusicMute} />
						<span class="slider round"></span>
					</label>
				</div>
				<div class="setting-row">
					<span class="label text-white">{stateI18n.i18n._('SOUND')}</span>
					<!-- <button class="mute-btn" onclick={toggleMute}>
                    {isMuted ? i18nDerived.soundOn() : i18nDerived.soundOff()}
                    </button> -->
					<label class="switch">
						<input type="checkbox" checked={!isMuted} onchange={toggleMute} />
						<span class="slider round"></span>
					</label>
				</div>
				<div class="setting-row">
					<span class="label text-white">{stateI18n.i18n._('VOLUME')}</span>
					<!-- <input type="range" min="0" max="1" step="0.1" value={volume} oninput={updateVolume} /> -->
					<input
						type="range"
						class="volume-slider"
						min="0"
						max="1"
						step="0.1"
						value={volume}
						oninput={updateVolume}
					/>
				</div>
				<!-- <button class="close-btn" onclick={toggleMenu}>{i18nDerived.disable()}</button> -->
				{#if isReplay}
					<button
						class="close-btn"
						style="background: #ff4444; border-color: #ff4444; margin-top: 10px;"
						onclick={exitReplay}>EXIT REPLAY</button
					>
				{/if}
			</div>
		</div>
	{/if}

	<!-- SVG Filter for the 3D text effect -->
	<svg width="0" height="0" style="position:absolute; pointer-events: none;">
		<filter id="bungee-3d-filter" x="-20%" y="-20%" width="140%" height="140%">
			<feMorphology operator="dilate" radius="0.5" in="SourceAlpha" result="thicker" />
			<feFlood flood-color="#422118" result="filterStrokeColor" />
			<feComposite in="filterStrokeColor" in2="thicker" operator="in" result="outline" />
			<feOffset in="outline" dx="0" dy="2" result="depth" />
			<feMerge>
				<feMergeNode in="depth" />
				<feMergeNode in="outline" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</svg>
</div>

<!-- large screen -->
<style>
	.control-bar-wrapper {
		--pipee-accent: #00ff50;
		--pipee-accent-bright: #00ff50;
		--pipee-accent-soft: #00ff50;
		--pipee-accent-border: rgba(0, 255, 80, 0.35);
		--pipee-accent-glow: rgba(0, 255, 80, 0.5);
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 95%;
		max-width: 900px;
		z-index: var(--z-index, 100);
		display: flex;
		align-items: center;
		transition:
			opacity 0.3s ease-in-out,
			visibility 0.3s;
		gap: 15px; /* Space between Feature Buy and Main Bar */
		transition: bottom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.control-bar-wrapper.portrait {
		bottom: 0;
		width: 100%;
		padding: 0;
		/* we override flex constraints here since we aren't using the default flex layout */
		display: block;
	}

	.control-bar-wrapper.dimmed {
		opacity: 0.3;
		pointer-events: none;
		filter: grayscale(0.5);
	}

	.control-bar-wrapper.hidden {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	/* -------------------------------------------------------------------------- */
	/*                         PORTRAIT LAYOUT SPECIFIC                           */
	/* -------------------------------------------------------------------------- */

	.portrait-control-bar {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 4px; /* tighter to shift icons up and leave room for bet row */
	}

	.portrait-control-bar .top-row {
		padding: 0 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: relative;
	}

	.mobile-top-side,
	.mobile-top-actions,
	.spin-section-mobile {
		display: flex;
		align-items: center;
	}

	.mobile-top-side {
		width: 15%;
	}

	.mobile-top-side-left {
		justify-content: flex-start;
		position: relative;
		z-index: 20;
		overflow: visible;
	}

	.mobile-top-side-right {
		justify-content: flex-end;
	}

	.mobile-top-actions {
		justify-content: center;
	}

	.spin-section-mobile {
		width: 70%;
		justify-content: center;
	}

	/* ── Connected Bottom Section containing both Bet Controls & Balance/Win strip ── */
	/* ── Connected Bottom Section containing both Bet Controls & Balance/Win strip ── */
	.bottom-container-mobile {
		background-color: #00000094;
		display: flex;
		flex-direction: column;
		width: 100%;
		border-radius: 0 !important; /* Rectangle! */
		box-sizing: border-box;
	}

	.bet-row {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0; /* Remove top/bottom padding */
	}

	.bet-controls-row {
		display: flex;
		align-items: center;
		justify-content: space-between !important;
		width: 60% !important;
		max-width: 220px !important;
		margin: 0 auto !important;
		box-sizing: border-box;
		padding: 2px 6px 0 6px !important; /* Top padding 2px */
	}

	.portrait-control-bar .bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: stretch;
		width: 100%;
		position: relative; /* For absolute centering of LAST WIN */
	}

	.hud-slot-left {
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}
	.hud-slot-center {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.bet-controls-mobile {
		padding: 1em;
	}
	.hud-slot-right {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		padding-left: 20px;
	}

	.win-display-mobile {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-end; /* Right aligned */
		text-align: right;
		min-width: 80px;
		padding: 6px 5px;
		border-radius: 0 !important; /* Rectangle! */
	}
	.win-display-mobile .mobile-label {
		font-family: 'Poppins', sans-serif;
		color: var(--pipee-accent-soft);
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}
	.win-display-mobile .mobile-value {
		font-family: 'Poppins', sans-serif;
		font-size: 13px !important;
		line-height: 1;
		margin-top: 2px;
		color: white;
		font-weight: 900;
	}

	/* WIN display — landscape */
	.win-display-landscape {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-right: 8px;
	}
	/* Mobile Spin Button - Breaks out of container */
	.portrait-control-bar .spin-section-mobile img {
		width: 100%;
	}

	.spin-button-mobile {
		pointer-events: auto; /* Re-enable clicks for the button */
		border-radius: 50%;
		border: 4px solid #181818;
		padding: 9px;
		cursor: pointer;
	}

	.spin-button-mobile .spin-icon-mobile {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.portrait-control-bar .auto-stop-indicator-landscape,
	.portrait-control-bar .auto-stop-indicator-portrait {
		width: 83% !important;
		height: 83% !important;
	}

	/* Mobile Feature Buy */
	.feature-buy-mobile {
		width: 65px !important;
		height: 65px !important;
		border-radius: 50%;
		overflow: hidden;
	}
	.portrait-control-bar .feature-buy-landscape,
	.portrait-control-bar .feature-buy-portrait {
		width: auto;
		height: auto;
		padding: 0;
		box-shadow: none;
		border: none;
		background: transparent;
		margin-top: 0;
		border-radius: 50%;
		overflow: hidden;
	}

	.portrait-control-bar .toggle-btn-landscape,
	.portrait-control-bar .toggle-btn-portrait {
		gap: 4px;
		scale: 1.5;
		margin-top: 0;
	}

	.turbo-btn-mobile {
		margin-right: 10px; /* Pushes Turbo away from spin */
	}

	.auto-btn-mobile {
		margin-left: 10px; /* Pushes Auto away from spin */
	}

	.menu-btn-mobile {
		width: 38px;
		height: 38px;
		border: 2px solid white;
		border-radius: 8px; /* Slightly rounded square */
		display: flex;
		align-items: center;
		justify-content: center;
		color: black !important;
		margin-top: 0;
	}
	.menu-btn-mobile svg {
		height: 26px;
		width: 26px;
	}

	/* Mobile Balance */
	.balance-display-mobile {
		padding: 6px 10px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		border-radius: 0 !important; /* Rectangle! */
	}
	.balance-display-mobile .mobile-label {
		font-family: 'Poppins', sans-serif;
		color: var(--pipee-accent-soft);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 1px;
	}
	.balance-display-mobile .mobile-value {
		font-family: 'Poppins', sans-serif;
		font-size: 12px !important;
		line-height: 1;
		margin-top: 2px;
		color: white;
		font-weight: 900;
	}

	/* Mobile Bet Controls */
	.bet-controls-mobile {
		display: flex;
		align-items: center;
		/* gap: 6px; */
		border-radius: 12px 12px 0 0;
	}
	.bet-info-mobile {
		background: transparent;
		min-width: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.bet-info-mobile .mobile-label {
		font-family: 'Poppins', sans-serif;
		color: var(--pipee-accent-soft);
		font-size: 10px !important;
		letter-spacing: 2px;
		font-weight: 700;
		opacity: 0.9;
	}
	.bet-info-mobile .mobile-value {
		font-family: 'Poppins', sans-serif;
		font-size: clamp(11px, 3.5vw, 16px) !important;
		line-height: 1;
		margin-top: 3px;
		color: #ffffff;
		font-weight: 900;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 55vw;
		display: block;
		text-align: center;
	}
	.replay-label {
		color: #ff4444 !important;
	}

	.arrow-btn-mobile {
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}
	.arrow-btn-mobile:active:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50%;
	}
	.arrow-icon-mobile {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-right: 3px solid #ffffff;
		border-bottom: 3px solid #ffffff;
		border-radius: 2px;
		transition: opacity 0.2s;
	}
	.arrow-up {
		transform: rotate(-135deg);
		margin-top: 4px;
	}
	.arrow-down {
		transform: rotate(45deg);
		margin-bottom: 4px;
	}
	.arrow-btn-mobile:disabled .arrow-icon-mobile {
		opacity: 0.3;
	}
	.arrow-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	/* We used the correct material icons for up/down in HTML, no rotation needed here */

	/* -------------------------------------------------------------------------- */
	/*                          DEFAULT/DESKTOP STYLES                            */
	/* -------------------------------------------------------------------------- */
	.feature-buy-container {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	.feature-buy-landscape,
	.feature-buy-portrait {
		position: relative;
		background: transparent;
		padding: 0;
		width: 90px;
		height: 90px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: none;
		user-select: none;
		transition: transform 0.2s;
		overflow: hidden;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.bonus-button-icon-landscape,
	.bonus-button-icon-portrait {
		width: 90px;
		height: 90px;
		display: block;
		aspect-ratio: 1;
		border-radius: 50%;
		object-fit: cover;
		/* Default buy face: black while retaining the source artwork's white mark. */
		filter: grayscale(1) contrast(4.5) brightness(0.92);
	}

	.portrait .feature-buy-landscape,
	.portrait .feature-buy-portrait {
		/* Remove pill styling as per user request to clean up 'rounded meh' */
		width: auto;
		height: auto;
		border-radius: 50%;
		box-shadow: none;
	}
	.feature-buy-landscape:hover,
	.feature-buy-portrait:hover {
		transform: scale(1.05);
		transition: transform 0.2s;
	}
	/* .feature-buy.active {
        background: #e91e63;
        border-color: #c2185b;
        box-shadow: 0 0 15px rgba(233, 30, 99, 0.6);
    } */
	.badge-on {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 12px;
		height: 12px;
		background: #37cc03; /* Match theme green */
		border: 2px solid white;
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(55, 204, 3, 0.8);
		animation: pulse 1.5s infinite;
		z-index: 2;
	}
	.badge-on.multi-hunt {
		background: #ef4444; /* Red for multi-hunt */
		box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
	}
	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1);
			opacity: 0.8;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.feature-buy-landscape.disabled,
	.feature-buy-portrait.disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.fs-label-landscape,
	.fs-label-portrait {
		font-size: 11px;
		color: #fff;
		font-weight: 900;
		letter-spacing: 1px;
		/* text-shadow: 1px 1px 2px rgba(0,0,0,0.8); */
	}

	/* Keep replay labels unchanged while making the active autoplay count legible. */
	.auto-count {
		font-size: 16px;
		line-height: 1;
		letter-spacing: 0;
	}

	.auto-count.infinite-count {
		font-size: 22px;
		transform: translateY(-1px);
	}

	.bet-controls-landscape.disabled,
	.bet-controls-portrait.disabled,
	.bet-controls-mobile.disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.control-bar {
		max-height: 68px;
		background: #000;
		border-radius: 12px;
		padding: 0px 0px 0 12px;
		display: flex;
		align-items: center;
		flex: 1; /* Take remaining space */
		justify-content: space-between;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
		border: 1px solid #333;
		position: relative;
	}

	.inline-win-display {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 180px;
		max-width: 240px;
		padding: 0;
		pointer-events: none;
		z-index: 3;
		text-align: center;
		margin-left: -10px;
	}

	.inline-win-display .label {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 4px;
	}

	.inline-win-display .value {
		font-size: clamp(19px, 2.6vw, 25px);
		font-weight: 900;
		line-height: 1;
		padding-bottom: 0;
		text-shadow:
			0 0 18px var(--pipee-accent-glow),
			2px 2px 0 rgba(0, 0, 0, 0.84);
		white-space: nowrap;
	}

	/* Left Group */
	.left-group {
		display: flex;
		align-items: center;
		gap: 15px;
		flex: 0 1 auto;
	}

	.right-group-landscape {
		display: flex;
		align-items: center;
		gap: 20px;
		flex: 0 1 auto;
	}

	.balance-display {
		display: flex;
		flex-direction: column;
	}
	.label {
		font-family: 'Poppins', sans-serif;
		font-size: 10px;
		color: var(--pipee-accent-soft);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.value {
		font-family: 'Poppins', sans-serif;
		font-size: 20px;
		font-weight: 400;
		color: white;
		background: none;
		-webkit-text-fill-color: initial;
		filter: none;
		line-height: 1.2;
		padding-bottom: 2px;
	}

	/* 3. Toggles - Vertical for Landscape */
	.toggles-landscape {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-right: -20px;
	}
	.toggle-btn-landscape,
	.toggle-btn-portrait {
		background: transparent;
		border: none;
		padding: 0;
		color: #666;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		box-sizing: border-box;
	}
	.toggle-btn-landscape {
		width: 47px;
		height: 47px;
	}
	.toggle-btn-portrait {
		width: 38px;
		height: 38px;
	}
	.toggle-btn-landscape:disabled,
	.toggle-btn-portrait:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.toggle-btn-landscape.active,
	.toggle-btn-portrait.active {
		color: white;
	}

	/* 4. Spin Button */
	.spin-section-landscape {
		position: relative;
		z-index: 10;
		right: -15px;
	}
	.spin-button-landscape,
	.spin-button-portrait {
		width: 93px;
		height: 93px;
		border-radius: 50%;
		background: transparent;
		border: none;
		outline: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.1s;
		padding: 0;
		box-sizing: border-box;
		position: relative;
	}

	.spin-button-landscape::after,
	.spin-button-portrait::after {
		content: '';
		position: absolute;
		top: 6px;
		left: 6px;
		right: 6px;
		bottom: 6px;
		border-radius: 50%;
		border: 4px solid transparent;
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease,
			transform 0.3s ease;
		pointer-events: none;
		opacity: 0;
		transform: scale(1.1);
	}

	.spin-button-landscape.ante-active-landscape::after,
	.spin-button-portrait.ante-active-portrait::after {
		opacity: 1;
		transform: scale(1.1);
		border-color: var(--pipee-accent-soft);
		box-shadow: 0 0 15px var(--pipee-accent-glow);
	}

	.spin-button-landscape.glitch-active-landscape::after,
	.spin-button-portrait.glitch-active-portrait::after {
		opacity: 1;
		transform: scale(1.1);
		border-color: var(--pipee-accent-soft);
		box-shadow: 0 0 15px var(--pipee-accent-glow);
	}

	.spin-button-landscape.multi-active-landscape::after,
	.spin-button-portrait.multi-active-portrait::after {
		opacity: 1;
		transform: scale(1.1);
		border-color: var(--pipee-accent-soft);
		box-shadow: 0 0 15px var(--pipee-accent-glow);
	}

	/* If both are active - Combined effect */
	.spin-button-landscape.ante-active-landscape.multi-active-landscape::after,
	.spin-button-portrait.ante-active-portrait.multi-active-portrait::after {
		border-color: var(--pipee-accent-soft);
		box-shadow: 0 0 15px var(--pipee-accent-glow);
	}

	/* Existing filter logic for icons if needed */
	.spin-button-landscape.ante-active-landscape.multi-active-landscape .spin-icon-landscape,
	.spin-button-portrait.ante-active-portrait.multi-active-portrait .spin-icon-mobile {
		filter: sepia(1) saturate(5) hue-rotate(-20deg) brightness(1.1);
	}

	.spin-button-landscape:active:not(:disabled),
	.spin-button-portrait:active:not(:disabled) {
		transform: scale(0.95);
	}
	.spin-button-landscape:disabled,
	.spin-button-portrait:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.spin-icon-landscape,
	.spin-icon-portrait {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}
	/* .spinning .spin-icon-landscape, .spinning .spin-icon-portrait {
        animation: rotate 0.5s linear infinite; 
    } */
	/* Removing specific free-spin button styling to keep it standard */
	/* .spin-button.free-spin { ... } */
	/* .free-spin-count { ... } */
	.fs-value {
		font-size: 28px;
		font-weight: 900;
		color: #fff;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
	}
	/* @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } */

	/* 5. Bet Controls */
	.right-section {
		display: none; /* Removed in favor of right-group-landscape */
	}
	.bet-controls-landscape,
	.bet-controls-portrait {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.bet-info-landscape,
	.bet-info-portrait {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #000;
		border: 1px solid white !important;
		border-radius: 8px;
		padding: 2px 30px;
		min-width: 90px;
	}

	.bet-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.arrow-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.arrow-btn:disabled {
		opacity: 0.3;
	}

	/* 6. Menu */
	.menu-btn-landscape,
	.menu-btn-portrait {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: color 0.2s;
		padding: 4px;
	}
	.menu-btn-landscape:hover,
	.menu-btn-portrait:hover {
		color: white;
	}

	/* Bet Modal Styles */
	.bet-modal {
		position: absolute;
		bottom: 100px;
		right: 20px;
		width: 320px !important;
		z-index: 1100;
		background: #111;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
		border: 1px solid #333;
		border-radius: 12px;
		padding: 20px;
	}

	.bet-modal .label {
		font-size: 14px;
		border-bottom: 1px solid #333;
		padding-bottom: 15px;
		width: 100%;
		display: block;
		margin-bottom: 15px;
	}

	.bet-options {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		max-height: 250px;
		overflow-y: auto;
		padding-right: 5px;
	}

	.bet-options::-webkit-scrollbar {
		width: 4px;
	}
	.bet-options::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
	}
	.bet-options::-webkit-scrollbar-thumb {
		background: grey;
		border-radius: 4px;
	}

	.bet-opt {
		background: #1a1a1a;
		border: 1px solid #333;
		color: #fff;
		padding: 12px 5px;
		border-radius: 8px;
		font-family: 'Poppins', sans-serif;
		font-size: clamp(10px, 3.2vw, 14px);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bet-mode-badge {
		background: var(--pipee-accent);
		color: #000;
		font-size: 10px;
		font-weight: 800;
		padding: 1px 4px;
		border-radius: 4px;
		vertical-align: middle;
	}

	.bet-value-effective {
		color: var(--pipee-accent-soft) !important;
	}

	.bet-value-base-small {
		font-size: 10px;
		color: #888;
		margin-top: -2px;
	}

	.bet-opt:hover {
		background: #2a2a2a;
		border-color: var(--pipee-accent-soft);
	}

	.bet-opt.active {
		background: var(--pipee-accent);
		color: #000;
		border-color: #fff;
		box-shadow: 0 0 12px var(--pipee-accent-glow);
	}

	.bet-picker-btn-landscape,
	.bet-picker-btn-portrait {
		cursor: pointer !important;
		transition: all 0.2s;
		border: none;
	}

	.bet-picker-hint {
		font-family: 'Poppins', sans-serif;
		font-size: 9px;
		color: var(--pipee-accent-soft);
		text-transform: uppercase;
		margin-top: 4px;
		letter-spacing: 1px;
		font-weight: 800;
	}

	/* 7. Popout Layout Refinements (Stake 800x450 / 400x225) */
	/* --------------------------------------------------------- */
	/* POPOUT L (800x450) - Isolated Layout Styling              */
	/* --------------------------------------------------------- */
	.popout-l .control-bar {
		padding: 6px 12px;
		gap: 10px;
		border-radius: 20px;
		transform: scale(0.85);
		transform-origin: bottom center;
	}

	.popout-l.control-bar-wrapper {
		bottom: 20px;
		width: 95%;
		max-width: 900px;
		gap: 15px;
		transform: translateX(-50%);
	}

	.popout-l .spin-button-landscape {
		width: 100px;
		height: 100px;
	}

	.popout-l .stop-rect-landscape {
		width: 40px;
		height: 40px;
	}

	.popout-l .bet-info-landscape {
		padding: 2px 15px;
		min-width: 70px;
	}

	.popout-l .feature-buy-landscape {
		transform: scale(0.9);
		transform-origin: left bottom;
	}

	.popout-l .feature-buy-landscape-container {
		position: relative;
		left: clamp(36px, 7vw, 55px);
		z-index: 2;
	}

	.popout-l .bet-modal,
	.popout-l .auto-modal,
	.popout-l .menu-overlay {
		position: absolute !important;
		bottom: 120px !important;
		left: 50% !important;
		right: auto !important;
		width: 90% !important;
		max-width: 350px;
		transform: translateX(-50%) scale(0.9) !important;
		z-index: 10005;
	}

	.popout .inline-win-display {
		left: 45%;
		transform: translate(-50%, -50%) scale(0.9);
		transform-origin: center;
	}

	.popout-l .menu-overlay {
		z-index: 10005;
	}

	/* --------------------------------------------------------- */
	/* POPOUT S (400x225) - Isolated Layout Styling              */
	/* --------------------------------------------------------- */

	.popout-s .menu-overlay {
		position: absolute !important;
		transform: scale(0.42) !important;
		width: 250px !important;
		max-width: 250px !important;
		z-index: 10005;
		padding: 8px !important;
		bottom: 28px !important;
		left: 51.8% !important;
		right: auto !important;
		transform-origin: bottom left !important;
	}

	.popout-s .bet-modal {
		position: absolute !important;
		transform: scale(0.42) !important;
		width: 250px !important;
		max-width: 250px !important;
		z-index: 10005;
		padding: 8px !important;
		bottom: -54px !important;
		left: 19.8% !important;
		right: auto !important;
	}

	.popout-s .auto-modal {
		position: absolute !important;
		transform: scale(0.42) !important;
		width: 250px !important;
		max-width: 250px !important;
		z-index: 10005;
		padding: 8px !important;
		bottom: -32px !important;
		right: -3% !important;
		left: auto !important;
	}

	/* Large Overlays (Feature Buy, Info) - Now handled in respective components */
	.popout-s :global(.balance-label) {
		font-size: 10px !important;
	}

	.popout-s :global(.balance-value) {
		font-size: 16px !important;
	}
	.popout-s :global(.bet-label) {
		font-size: 10px !important;
	}
	.popout-s :global(.bet-value) {
		font-size: 16px !important;
	}
	.popout-s :global(.inner-modal-title) {
		font-size: 14px !important;
	}
	.popout-s .auto-opt,
	.popout-s .bet-opt {
		font-size: 14px !important;
	}

	/* Popout S follows Checkmate Chaos: regular wrapper, individually scaled controls. */
	.popout-s.control-bar-wrapper {
		overflow: visible !important;
	}

	.popout-s .feature-buy-landscape-container {
		position: absolute !important;
		left: 24px !important;
		bottom: -5px !important;
		height: 42px !important;
		width: 42px !important;
		overflow: visible !important;
		z-index: 100;
	}

	.popout-s .feature-buy-landscape {
		position: relative !important;
		left: auto !important;
		bottom: auto !important;
		transform: none !important;
		width: 42px !important;
		height: 42px !important;
		overflow: visible !important;
		box-sizing: border-box;
	}

	.popout-s .bonus-button-icon-landscape {
		width: 42px !important;
		height: 42px !important;
		object-fit: cover;
	}

	.control-bar-wrapper.popout-s .feature-buy-landscape .mode-dismiss-btn-landscape {
		bottom: -3px !important;
		padding: 1px 4px !important;
		border-radius: 7px !important;
		font-size: 5px !important;
		letter-spacing: 0.2px !important;
		line-height: 1.2 !important;
	}

	.popout-s .control-bar {
		transform: scale(0.6) !important;
		transform-origin: bottom center;
		padding: 4px 10px !important;
		gap: 8px;
		border-radius: 12px;
		max-height: 45px !important;
		height: auto !important;
		overflow: visible !important;
	}

	.popout-s .spin-button-landscape {
		width: 75px !important;
		height: 75px !important;
		overflow: visible !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	.popout-s .spin-icon-landscape {
		width: 75px !important;
		height: 75px !important;
		object-fit: contain;
	}

	.popout-s .spin-section-landscape {
		right: -36px !important;
		position: relative;
	}

	.popout-s .toggles-landscape {
		margin-right: -30px !important;
	}

	.popout-s .stop-rect-landscape {
		width: 30px !important;
		height: 30px !important;
		display: block !important;
		margin: auto !important;
		overflow: visible !important;
	}

	.popout-s .bet-info-landscape {
		padding: 1px 5px;
		width: 65px !important;
		flex: 0 0 65px !important;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden !important;
	}

	.popout-s .bet-info-landscape .value {
		white-space: nowrap !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		display: block !important;
		max-width: 100% !important;
	}

	.popout-s .bet-controls-landscape {
		transform: translateX(30px);
	}

	.popout-s .arrow-btn {
		width: 16px !important;
		height: 16px !important;
	}

	.popout-s .arrow-icon {
		width: 16px !important;
		height: 16px !important;
	}

	.popout-s .balance-display {
		width: 90px !important;
		flex: 0 0 90px !important;
		overflow: hidden !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: flex-start !important;
	}

	.popout-s .balance-display .value {
		white-space: nowrap !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		display: block !important;
		max-width: 100% !important;
	}

	.popout-s .label {
		font-size: 7px !important;
	}

	.popout-s .value {
		font-size: 14px !important;
	}

	.popout-s .mode-dismiss-btn-landscape {
		width: 90px !important;
		height: 90px !important;
		left: 50% !important;
		top: 50% !important;
		transform: translate(-50%, -50%) !important;
		aspect-ratio: 1 / 1;
	}

	.popout-s .inline-win-display {
		min-width: 160px;
		max-width: 220px;
	}

	.popout-s .inline-win-display .label {
		font-size: 10px;
		letter-spacing: 2px;
	}

	.popout-s .inline-win-display .value {
		font-size: 25px;
	}

	/* --------------------------------------------------------- */
	/*End  POPOUT S (400x225) - Isolated Layout Styling              */
	/* --------------------------------------------------------- */

	.popout .modal-backdrop {
		background: rgba(0, 0, 0, 0.4);
	}

	.popout .balance-display .value {
		font-size: 14px;
	}

	.popout .balance-display .label {
		font-size: 9px;
	}

	.portrait .bet-modal,
	.portrait .auto-modal,
	.portrait .menu-overlay,
	.low .bet-modal,
	.low .auto-modal,
	.low .menu-overlay {
		position: absolute !important;
		bottom: 140px !important;
		left: 50% !important;
		right: auto !important;
		transform: translateX(-50%) !important;
		width: 92% !important;
		max-width: 400px;
		margin: 0 !important;
		z-index: 10002;
	}
	.portrait .bet-modal,
	.low .bet-modal {
		width: 80% !important;
		max-width: 320px;
		padding: 16px;
	}

	/* Menu Overlay */
	.menu-overlay {
		position: absolute;
		bottom: 100px;
		right: 20px;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid #444;
		border-radius: 10px;
		padding: 15px;
		width: 250px;
		color: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
		z-index: 1000;
	}
	.setting-menu-overlay {
		left: 20px;
		right: auto;
	}
	.portrait .setting-menu-overlay,
	.low .setting-menu-overlay {
		left: 12px !important;
		right: auto !important;
		transform: none !important;
		width: calc(80% - 19px) !important;
		max-width: none;
		padding: 12px;
	}
	.menu-content h3 {
		margin: 0 0 15px 0;
		color: var(--pipee-accent-bright);
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
	.info-setting-row {
		cursor: pointer;
	}
	.info-btn {
		background-color: transparent;
		border: none;
		cursor: pointer;
	}
	.mute-btn {
		background: #333;
		color: white;
		border: 1px solid #555;
		padding: 5px 10px;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
	}
	.close-btn {
		width: 100%;
		padding: 8px;
		background: var(--pipee-accent-bright);
		border: none;
		border-radius: 4px;
		font-weight: bold;
		cursor: pointer;
	}
	.stop-rect-landscape,
	.stop-rect-portrait {
		width: 56px;
		height: 56px;
		background: var(--pipee-accent-soft);
		border-radius: 6px;
		transition: transform 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.spin-button-landscape:active .stop-rect-landscape,
	.spin-button-portrait:active .stop-rect-portrait {
		transform: scale(0.9);
	}
	/* Mobile adjustments */
	@media (max-width: 600px) {
		.control-bar-wrapper {
			bottom: 10px;
			width: 100%;
			gap: 5px;
			justify-content: center;
		}

		.feature-buy-landscape,
		.feature-buy-portrait {
			height: 40px;
			font-size: 11px;
			padding: 0 10px;
			border-radius: 10px;
		}

		.portrait-control-bar .feature-buy-landscape,
		.portrait-control-bar .feature-buy-portrait {
			width: 65px;
			height: 65px;
			padding: 0;
			border-radius: 50%;
			flex: 0 0 65px;
		}

		.portrait-control-bar .mode-dismiss-btn-landscape,
		.portrait-control-bar .mode-dismiss-btn-portrait {
			width: 65px;
			height: 65px;
			aspect-ratio: 1;
			border-radius: 50%;
		}

		.mode-dismiss-btn-landscape,
		.mode-dismiss-btn-portrait {
			font-size: 10px !important;
			letter-spacing: 1px;
			font-weight: bold;
		}
		.mode-dismiss-btn-landscape::before,
		.mode-dismiss-btn-portrait::before {
			/* Background SVG handles sizing */
		}

		.stop-rect-landscape,
		.stop-rect-portrait {
			width: 40px;
			height: 40px;
		}

		.auto-count {
			font-size: 14px;
		}

		.auto-count.infinite-count {
			font-size: 19px;
		}

		.control-bar {
			padding: 5px 10px;
			border-radius: 20px;
			width: auto;
			flex: 0 1 auto;
		}
		.balance-display .label {
			font-size: 8px;
		}
		.balance-display .value {
			font-size: 12px;
		}

		.toggles {
			margin-left: 5px;
			gap: 4px;
		}
		.toggle-btn-landscape,
		.toggle-btn-portrait {
			scale: 0.8;
		}

		.spin-section {
			position: relative;
		}

		.spin-button-landscape,
		.spin-button-portrait {
			width: 140px;
			height: 140px;
			border-width: 4px;
		}
		.spin-icon-landscape,
		.spin-icon-portrait {
			width: 30px;
			height: 30px;
		}

		.right-section {
			margin-left: 5px;
			gap: 10px;
		}
		.bet-controls-landscape,
		.bet-controls-portrait {
			min-width: auto;
			padding: 4px 6px;
		}
		.bet-info .label {
			font-size: 8px;
		}
		.bet-info .value {
			font-size: 12px;
		}

		.menu-btn-landscape svg,
		.menu-btn-portrait svg {
			width: 24px;
			height: 24px;
		}

		.auto-stop-indicator-landscape,
		.auto-stop-indicator-portrait {
			width: 90% !important;
			height: 90% !important;
		}
	}

	/* Smallest Mobile adjustments for very narrow screens */
	@media (max-width: 400px) {
		.control-bar {
			padding: 5px 8px;
			gap: 2px;
		}
		.balance-display .value {
			font-size: 11px;
		}
		.bet-info .value {
			font-size: 11px;
		}
		.toggles {
			gap: 2px;
			margin-left: 2px;
		}
		.toggle-btn-landscape,
		.toggle-btn-portrait {
			scale: 0.7;
		}
		.spin-button-landscape,
		.spin-button-portrait {
			width: 54px;
			height: 54px;
			outline-width: 3px;
		}
	}

	/* Stake portrait sizes: 425x812, 375x667, and 320x568 */
	@media (max-width: 425px) {
		.portrait-control-bar {
			padding: 0;
			gap: 10px;
		}

		.portrait-control-bar .top-row {
			padding: 0 15px 0px 15px;
			align-items: center;
		}

		.portrait-control-bar .toggle-btn-landscape,
		.portrait-control-bar .toggle-btn-portrait {
			scale: 1.2;
			margin-top: 0;
		}
		.balance-display-mobile {
			margin-left: 12px;
		}
		.win-display-mobile {
			margin-right: 12px;
		}

		.portrait-control-bar .spin-button-landscape,
		.portrait-control-bar .spin-button-portrait {
			width: clamp(80px, 25vw, 94px);
			height: clamp(80px, 25vw, 94px);
		}

		.portrait-control-bar .bottom-row {
			display: flex !important;
			justify-content: space-between;
			align-items: stretch;
			width: 100%;
			margin-top: 0;
			background-color: transparent !important;
			position: relative;
		}

		.hud-slot-left,
		.hud-slot-center,
		.hud-slot-right {
			width: auto !important;
			min-width: 0;
		}

		.balance-display-mobile,
		.win-display-mobile,
		.bet-controls-mobile {
			width: 100%;
			min-width: 0;
			box-sizing: border-box;
		}

		.balance-display-mobile,
		.win-display-mobile {
			padding: 6px 4px;
		}

		.balance-display-mobile .mobile-label,
		.win-display-mobile .mobile-label,
		.bet-info-mobile .mobile-label {
			font-size: 8.5px !important;
			letter-spacing: 0.5px;
		}

		.balance-display-mobile .mobile-value,
		.win-display-mobile .mobile-value {
			font-size: 11.5px !important;
			white-space: nowrap;
		}

		.bet-controls-mobile {
			padding: 9px 6px 6px;
			justify-content: space-between;
		}

		.bet-info-mobile {
			min-width: 70px;
		}

		.bet-info-mobile .mobile-value {
			font-size: 14.5px !important;
			white-space: nowrap;
		}

		.arrow-btn-mobile {
			width: 22px;
			height: 22px;
			flex: 0 0 22px;
		}
	}

	@media (max-width: 340px) {
		.portrait-control-bar {
			padding: 0;
			gap: 8px;
		}

		.turbo-btn-mobile {
			margin-right: 6px;
		}

		.auto-btn-mobile {
			margin-left: 6px;
		}

		.portrait-control-bar .toggle-btn-landscape,
		.portrait-control-bar .toggle-btn-portrait {
			scale: 1.05;
		}

		.portrait-control-bar .top-row {
			padding: 0 10px 0px 10px;
		}

		.feature-buy-mobile,
		.portrait-control-bar .feature-buy-landscape,
		.portrait-control-bar .feature-buy-portrait,
		.portrait-control-bar .mode-dismiss-btn-landscape,
		.portrait-control-bar .mode-dismiss-btn-portrait {
			width: 58px !important;
			height: 58px !important;
			flex-basis: 58px;
		}

		.menu-btn-mobile {
			width: 34px;
			height: 34px;
		}

		.portrait-control-bar .spin-button-landscape,
		.portrait-control-bar .spin-button-portrait {
			width: 76px;
			height: 76px;
		}

		.portrait-control-bar .bottom-row {
			display: flex !important;
			background-color: transparent !important;
			gap: 0;
		}

		.balance-display-mobile,
		.win-display-mobile {
			padding: 6px 3px;
		}

		.bet-controls-mobile {
			padding: 8px 4px 6px;
		}

		.bet-info-mobile {
			min-width: 66px;
		}

		.bet-info-mobile .mobile-value {
			font-size: 13.5px !important;
		}
	}

	/* Auto Spin Modal */
	.auto-options {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}
	.auto-opt {
		background: #222;
		border: 1px solid #444;
		color: white;
		padding: 10px;
		border-radius: 8px;
		font-weight: bold;
		transition: all 0.2s;
		cursor: pointer;
	}
	.auto-opt:hover {
		background: var(--pipee-accent);
		color: black;
		border-color: var(--pipee-accent-soft);
		transition: all 0.2s;
	}
	.auto-opt.selected {
		background: var(--pipee-accent);
		color: black;
		border-color: white;
		box-shadow: 0 0 15px var(--pipee-accent-glow);
	}
	.auto-confirm-btn {
		width: 100%;
		margin-top: 15px;
		background: var(--pipee-accent);
		color: black;
		border: none;
		padding: 12px;
		border-radius: 8px;
		font-weight: 800;
		cursor: pointer;
		text-transform: uppercase;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
		transition: all 0.2s;
	}
	.auto-confirm-btn:hover {
		background: var(--pipee-accent);
		transform: translateY(-2px);
	}
	.auto-confirm-btn:active {
		transform: translateY(0);
	}
	.auto-confirm-btn:disabled {
		background: #555;
		color: #888;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}
	.auto-modal {
		position: absolute;
		box-sizing: border-box;
		bottom: 110px;
		right: 20px; /* Align with Auto button on the right in new landscape */
		width: 220px !important;
		z-index: 1000;
		background: rgba(20, 20, 20, 0.98);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
		border: 1px solid #444;
		border-radius: 10px;
		padding: 15px;
	}

	.auto-stop-indicator-landscape,
	.auto-stop-indicator-portrait {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 92%;
		height: 92%;
		background: #ffffff;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.4);
		box-sizing: border-box;
	}
	.stop-square-landscape,
	.stop-square-portrait {
		width: 22px;
		height: 22px;
		background: #ff4444;
		border-radius: 4px;
		box-shadow: 0 0 10px rgba(255, 68, 68, 0.4);
		transition: transform 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.stop-square-count {
		font-size: 10px;
		font-weight: 800;
		color: #fff;
		line-height: 1;
		pointer-events: none;
	}
	.spin-button-landscape:active .stop-square-landscape,
	.spin-button-portrait:active .stop-square-portrait {
		transform: scale(0.9);
	}

	.modal-backdrop {
		position: fixed;
		top: -100vh;
		left: -100vw;
		width: 300vw;
		height: 300vh;
		background: transparent;
		z-index: 999;
		cursor: pointer;
	}
	.text-white {
		color: white !important;
	}
	/* The switch - the box around the slider */
	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 24px;
	}

	/* Hide default HTML checkbox */
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	/* The slider */
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
		background-color: var(--pipee-accent);
	}

	input:checked + .slider:before {
		transform: translateX(16px);
		background-color: #000;
	}

	/* Rounded sliders */
	.slider.round {
		border-radius: 34px;
	}

	.slider.round:before {
		border-radius: 50%;
	}

	/* Custom Volume Slider Styling */
	.volume-slider {
		appearance: none;
		-webkit-appearance: none;
		width: 42%;
		height: 6px;
		background: #333; /* Dark track */
		border-radius: 5px;
		outline: none;
		transition: background 0.2s;
		margin-left: 15px;
	}

	/* The Knob (Thumb) */
	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: var(--pipee-accent-soft);
		border: 2px solid #000;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
	}

	.volume-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		background: var(--pipee-accent-soft);
		border: 2px solid #000;
		border-radius: 50%;
		cursor: pointer;
	}

	/* Hover effect */
	.volume-slider:hover {
		background: #444;
	}

	/* Tint filters for active modes */
	.bonus-button-icon-landscape.tint-ante,
	.bonus-button-icon-portrait.tint-ante {
		filter: sepia(1) saturate(4) hue-rotate(80deg) brightness(1.1)
			drop-shadow(0 0 8px rgba(55, 204, 3, 0.9));
		opacity: 0.8;
		transition:
			filter 0.1s,
			opacity 0.3s;
	}
	.bonus-button-icon-landscape.tint-multihunt,
	.bonus-button-icon-portrait.tint-multihunt {
		filter: sepia(1) saturate(6) hue-rotate(-30deg) brightness(1.1)
			drop-shadow(0 0 8px rgba(239, 68, 68, 0.9));
		opacity: 0.8;
		transition:
			filter 0.1s,
			opacity 0.3s;
	}
	.bonus-button-icon-landscape.tint-glitch,
	.bonus-button-icon-portrait.tint-glitch {
		filter: sepia(1) saturate(6) hue-rotate(-30deg) brightness(1.12)
			drop-shadow(0 0 8px var(--pipee-accent-glow));
		opacity: 0.88;
		transition:
			filter 0.1s,
			opacity 0.3s;
	}

	/* Dismiss (×) button */
	.mode-dismiss-btn-landscape,
	.mode-dismiss-btn-portrait {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #dd2626;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 5;
		border-radius: 50%;
		transition:
			background 0.2s,
			transform 0.2s;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 13px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 2px;
		line-height: 1;
	}
	.mode-dismiss-btn-landscape::before,
	.mode-dismiss-btn-portrait::before {
		content: '';
		position: absolute;
		inset: 0;
		background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 20 L80 80 M80 20 L20 80" stroke="%23f74141" stroke-width="14" stroke-linecap="round"/></svg>');
		background-size: 90% 90%;
		background-position: center;
		background-repeat: no-repeat;
		opacity: 0.8;
		z-index: 0;
		pointer-events: none;
	}
	.mode-dismiss-btn-landscape span,
	.mode-dismiss-btn-portrait span {
		position: relative;
		z-index: 1;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		transform: rotate(-10deg);
		pointer-events: none;
	}
	.mode-dismiss-btn-landscape:hover,
	.mode-dismiss-btn-portrait:hover {
		background: #f44336;
	}
	.mode-dismiss-btn-landscape:hover span,
	.mode-dismiss-btn-portrait:hover span {
		transform: scale(1.1) rotate(0deg);
	}
	.mode-dismiss-btn-landscape:active,
	.mode-dismiss-btn-portrait:active {
		transform: scale(0.95);
	}
	.mode-dismiss-btn-landscape.is-spinning-landscape,
	.mode-dismiss-btn-portrait.is-spinning-portrait {
		cursor: default;
		pointer-events: none;
		opacity: 1;
	}
	/* .mode-dismiss-btn-landscape:hover, .mode-dismiss-btn-portrait:hover {
        background: rgba(239, 68, 68, 0.95);
        border-color: #fff;
        transform: translate(-50%, -50%) scale(1.1);
    } */

	.feature-notification-bar {
		position: absolute;
		top: -33px; /* ADJUST THIS LINE TO MOVE BAR UP/DOWN ON DESKTOP */
		left: 50%;
		transform: translateX(-50%);
		width: 900px;
		max-width: 95vw;
		background: black;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		border-radius: 4px;
	}

	.popout .feature-notification-bar {
		max-width: none;
	}

	.notification-text {
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	/* This must follow the shared active-mode rules above. */
	.portrait-control-bar .spin-button-mobile::after,
	.portrait-control-bar .spin-button-mobile.ante-active-portrait::after,
	.portrait-control-bar .spin-button-mobile.glitch-active-portrait::after,
	.portrait-control-bar .spin-button-mobile.multi-active-portrait::after {
		inset: 6px;
		transform: scale(1);
		border-width: 4px;
	}

	.portrait-control-bar .spin-button-mobile.ante-active-portrait::after,
	.portrait-control-bar .spin-button-mobile.glitch-active-portrait::after,
	.portrait-control-bar .spin-button-mobile.multi-active-portrait::after {
		box-shadow: 0 0 7px var(--pipee-accent-glow);
	}

	.portrait-control-bar .mobile-top-actions .toggle-btn-portrait {
		margin-top: 0;
	}

	/* Keep every portrait control on one vertical center across S, M, and L. */
	.portrait-control-bar .top-row > *,
	.portrait-control-bar .mobile-top-actions,
	.portrait-control-bar .spin-section-mobile,
	.portrait-control-bar .feature-buy-portrait,
	.portrait-control-bar .toggle-btn-portrait,
	.portrait-control-bar .menu-btn-portrait {
		align-self: center;
		margin-top: 0;
		margin-bottom: 0;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translate(-50%, -10px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	@media (max-width: 600px) {
		.feature-notification-bar {
			top: -60px;
			height: 25px;
			width: 100vw;
			border-radius: 0;
		}
		.notification-text {
			font-size: 11px;
		}
	}

	/* Reference active state: restrained neon ring. */
	.feature-buy-portrait.active,
	.feature-buy-landscape.active {
		background: #070707;
		border: 1px solid #ffffff;
		border-radius: 50%;
		box-sizing: border-box;
		overflow: visible;
		box-shadow:
			0 0 10px 2px rgba(0, 255, 80, 0.82),
			0 0 20px 3px rgba(0, 255, 80, 0.42);
	}

	.portrait-control-bar .feature-buy-portrait.active {
		z-index: 21;
	}

	.portrait-control-bar .feature-buy-portrait.active .bonus-button-icon-portrait {
		position: relative;
		z-index: 1;
	}

	.feature-buy-portrait.active .bonus-button-icon-portrait,
	.feature-buy-landscape.active .bonus-button-icon-landscape {
		/* Convert the pink source face to black while preserving its white logo. */
		filter: grayscale(1) contrast(4.5) brightness(0.92) !important;
		opacity: 1 !important;
	}

	.mode-dismiss-btn-portrait,
	.mode-dismiss-btn-landscape,
	.popout-s .mode-dismiss-btn-landscape,
	.portrait-control-bar .mode-dismiss-btn-portrait,
	.portrait-control-bar .mode-dismiss-btn-landscape {
		position: absolute;
		top: auto !important;
		left: 50% !important;
		bottom: -4px !important;
		width: auto !important;
		height: auto !important;
		min-width: 0;
		aspect-ratio: auto;
		transform: translateX(-50%) !important;
		background: #00ff50;
		color: #061109;
		border: 0;
		border-radius: 10px !important;
		padding: 2px 7px;
		box-shadow: 0 0 3px rgba(0, 255, 80, 0.35);
		overflow: visible;
		font-family: 'Poppins', sans-serif;
		font-size: 8px !important;
		font-weight: 900;
		letter-spacing: 0.5px;
		line-height: 1;
	}

	.mode-dismiss-btn-portrait::before,
	.mode-dismiss-btn-landscape::before {
		content: none !important;
	}

	.mode-dismiss-btn-portrait span,
	.mode-dismiss-btn-landscape span {
		transform: none !important;
		text-shadow: none;
	}

	.mode-dismiss-btn-portrait:active,
	.mode-dismiss-btn-landscape:active {
		transform: translateX(-50%) scale(0.96) !important;
	}
</style>
