<script lang="ts">
	import { stateBet, stateBetDerived, stateSound } from 'state-shared';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';

	const context = getContext();

	let uiVisible = $state(true);
	let counterVisible = $state(false);
	let current = $state(0);
	let total = $state(0);
	let isMenuOpen = $state(false);
	let onFadeComplete = $state(() => {});

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isFreeSpin = $derived(context.stateGame.gameType === 'freegame');
	const isPopoutS = $derived(layoutType === 'popout' && canvasSizes.width <= 500);
	const isShortLandscape = $derived(canvasSizes.height <= 450 && layoutType === 'popout');
	const show = $derived(uiVisible && isFreeSpin && counterVisible);
	const freeSpinProgressText = $derived(`${current} / ${total}`);
	const totalWinFormatted = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const balanceFormatted = $derived(numberToCurrencyString(stateBet.balanceAmount));
	const betFormatted = $derived(
		numberToCurrencyString(stateBet.wageredBetAmount || stateBet.betAmount),
	);
	const volume = $derived(stateSound.volumeValueMaster / 100);
	const isMuted = $derived(stateSound.volumeValueMaster === 0);
	const isMusicMuted = $derived(stateSound.volumeValueMusic === 0);

	const freeSpinProgressFontSize = $derived(
		freeSpinProgressText.length > 9 ? '10px' : freeSpinProgressText.length > 7 ? '12px' : '14px',
	);
	const desktopFreeSpinProgressFontSize = $derived(
		isPopoutS
			? freeSpinProgressText.length > 9
				? '8px'
				: freeSpinProgressText.length > 7
					? '9px'
					: '10px'
			: freeSpinProgressText.length > 9
				? '12px'
				: freeSpinProgressText.length > 7
					? '15px'
					: '18px',
	);
	const balanceFontSize = $derived(
		isPopoutS
			? balanceFormatted.length > 16
				? '7px'
				: balanceFormatted.length > 14
					? '8px'
					: balanceFormatted.length > 12
						? '9px'
						: '10px'
			: undefined,
	);
	const winFontSize = $derived(
		isPopoutS
			? totalWinFormatted.length > 16
				? '8px'
				: totalWinFormatted.length > 14
					? '9px'
					: totalWinFormatted.length > 12
						? '10px'
						: totalWinFormatted.length > 10
							? '11px'
							: '12px'
			: isShortLandscape
				? totalWinFormatted.length > 12
					? '16px'
					: totalWinFormatted.length > 8
						? '19px'
						: '22px'
				: totalWinFormatted.length > 12
					? '20px'
					: totalWinFormatted.length > 8
						? '24px'
						: '28px',
	);
	const mobileWinFontSize = $derived(
		isPopoutS
			? totalWinFormatted.length > 16
				? '8px'
				: totalWinFormatted.length > 14
					? '9px'
					: totalWinFormatted.length > 12
						? '10px'
						: '11px'
			: totalWinFormatted.length > 12
				? '15px'
				: totalWinFormatted.length > 9
					? '17px'
					: totalWinFormatted.length >= 7
						? '20px'
						: '23px',
	);

	const toggleTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
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

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (counterVisible = true),
		freeSpinCounterHide: () => {
			counterVisible = false;
			current = 0;
			total = 0;
			isMenuOpen = false;
		},
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
		uiShow: async () => {
			if (!uiVisible) {
				uiVisible = true;
				await waitForResolve((resolve) => (onFadeComplete = resolve));
			}
		},
		uiHide: async () => {
			if (uiVisible) {
				uiVisible = false;
				await waitForResolve((resolve) => (onFadeComplete = resolve));
			}
		},
	});
</script>

{#if isFreeSpin}
	<div
		class="control-bar-wrapper {layoutType}"
		class:show
		class:popout-s={isPopoutS}
		ontransitionend={() => onFadeComplete()}
	>
		{#if layoutType === 'portrait'}
			<div class="portrait-control-bar">
				<div class="top-row">
					<div class="bonus-count-display-mobile-wrapper">
						<div class="bonus-count-display-mobile">
							<span class="label">{context.i18nDerived.freeSpins()}</span>
							<span class="value" style:font-size={freeSpinProgressFontSize}
								>{freeSpinProgressText}</span
							>
						</div>
					</div>

					<div class="total-win-display-mobile">
						<span class="label">{context.i18nDerived.win()}</span>
						<span class="value" style:font-size={mobileWinFontSize}>{totalWinFormatted}</span>
					</div>

					<div class="mobile-right-group">
						<button
							class="toggle-btn turbo-btn-mobile"
							class:active={stateBet.isTurbo}
							onclick={toggleTurbo}
							aria-label={context.i18nDerived.turbo()}
						>
							<img
								src={stateBet.isTurbo
									? 'assets/sprites/controlBar/turboActive.png'
									: 'assets/sprites/controlBar/turbo.png'}
								alt={context.i18nDerived.turbo()}
								class="toggle-icon toggle-icon-mobile"
								draggable="false"
							/>
						</button>

						<button
							class="menu-btn menu-btn-mobile"
							onclick={toggleMenu}
							aria-label={context.i18nDerived.menu()}
						>
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								width="28"
								height="28"
								aria-hidden="true"
							>
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
						<div class="bet-info-mobile">
							<span class="mobile-label">{context.i18nDerived.bet()}</span>
							<span class="mobile-value" style:font-size={balanceFontSize}>{betFormatted}</span>
						</div>
					</div>

					<div class="hud-slot-right"></div>
				</div>
			</div>
		{:else}
			<div class="control-bar">
				<div class="left-group">
					<div class="balance-display">
						<span class="label">{context.i18nDerived.balance()}</span>
						<span class="value" style:font-size={balanceFontSize}>{balanceFormatted}</span>
					</div>

					<div class="bet-info">
						<span class="label">{context.i18nDerived.bet()}</span>
						<span class="value" style:font-size={balanceFontSize}>{betFormatted}</span>
					</div>
				</div>

				<div class="total-win-display">
					<span class="label">{context.i18nDerived.win()}</span>
					<div class="value pulse">
						<span class="win-value-main" style:font-size={winFontSize}>{totalWinFormatted}</span>
					</div>
				</div>

				<div class="right-section">
					<div class="bonus-count-display">
						<span class="label">{context.i18nDerived.freeSpins()}</span>
						<span class="value" style:font-size={desktopFreeSpinProgressFontSize}
							>{freeSpinProgressText}</span
						>
					</div>

					<button
						class="toggle-btn"
						class:active={stateBet.isTurbo}
						onclick={toggleTurbo}
						aria-label={context.i18nDerived.turbo()}
					>
						<img
							src={stateBet.isTurbo
								? 'assets/sprites/controlBar/turboActive.png'
								: 'assets/sprites/controlBar/turbo.png'}
							alt={context.i18nDerived.turbo()}
							class="toggle-icon"
							draggable="false"
						/>
					</button>

					<button class="menu-btn" onclick={toggleMenu} aria-label={context.i18nDerived.menu()}>
						<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
							<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
						</svg>
					</button>
				</div>
			</div>
		{/if}

		{#if isMenuOpen}
			<button class="modal-backdrop" aria-label="Close menu" onclick={toggleMenu}></button>
			<div class="menu-overlay settings-modal">
				<div class="menu-content">
					<h3 class="text-white label">{context.i18nDerived.settings()}</h3>
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
{/if}

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

	.portrait-control-bar {
		background: linear-gradient(180deg, #222 0%, #111 100%);
		width: 100%;
		padding: 0 15px 12px;
		box-sizing: border-box;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: 0 -5px 30px rgba(0, 0, 0, 0.8);
	}

	.top-row {
		top: -21px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-top: 10px;
	}

	.hud-slot-left,
	.hud-slot-center,
	.hud-slot-right {
		flex: 1;
		display: flex;
		align-items: center;
	}

	.hud-slot-left {
		justify-content: flex-start;
	}

	.hud-slot-center {
		justify-content: center;
	}

	.hud-slot-right {
		justify-content: flex-end;
	}

	.mobile-right-group {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 1;
	}

	.control-bar {
		max-height: 68px;
		background: rgba(10, 10, 10, 0.95);
		border-radius: 12px;
		padding: 8px 24px;
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
	.right-section {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.left-group {
		gap: 25px;
	}

	.right-section {
		gap: 8px;
		justify-content: flex-end;
	}

	.balance-display,
	.bet-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.bet-info {
		align-items: center;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid white;
		border-radius: 8px;
		padding: 6px 16px;
		min-width: 90px;
	}

	.label {
		font-family: 'Poppins', sans-serif;
		font-size: 10px;
		color: #fed697;
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.value {
		font-family: 'Poppins', sans-serif;
		font-size: 20px;
		font-weight: 400;
		color: white;
		line-height: 1.2;
		padding-bottom: 2px;
	}

	.toggle-btn {
		background: transparent;
		border: none;
		color: #666;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 0;
	}

	.toggle-icon {
		width: 32px;
		height: 32px;
		object-fit: contain;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0);
	}

	.toggle-btn.active {
		color: white;
	}

	.total-win-display {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 200px;
	}

	.total-win-display .label {
		font-size: 12px;
		letter-spacing: 4px;
		font-weight: 700;
	}

	.total-win-display .value {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.win-value-main {
		font-family: 'Bungee', cursive;
		color: #ffffff;
		text-shadow: 2px 2px 0 #000;
		filter: url(#bungee-3d-filter);
		white-space: nowrap;
		display: inline-block;
		line-height: 1.1;
	}

	.total-win-display-mobile {
		flex: 1 1 auto;
		min-width: 0;
		max-width: min(42vw, 170px);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 100;
		background-color: rgba(0, 0, 0, 0.6);
		border-radius: 8px;
		padding: 4px 8px;
		margin: 0 4px;
	}

	.total-win-display-mobile .label {
		font-size: 10px;
		letter-spacing: 2px;
		margin-bottom: -2px;
	}

	.total-win-display-mobile .value {
		font-family: 'Bungee', cursive;
		color: #fff;
		text-shadow: 2px 2px 0 #000;
		filter: url(#bungee-3d-filter);
		line-height: 1;
		max-width: 100%;
		white-space: nowrap;
	}

	.bonus-count-display,
	.bonus-count-display-mobile {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 8px;
	}

	.bonus-count-display {
		padding: 4px 12px;
		min-width: 80px;
	}

	.bonus-count-display .label,
	.bonus-count-display-mobile .label {
		font-size: 8px;
		letter-spacing: 2px;
		margin-bottom: -2px;
	}

	.bonus-count-display .value,
	.bonus-count-display-mobile .value {
		font-family: 'Bungee', cursive;
		color: #fff;
		white-space: nowrap;
	}

	.bonus-count-display-mobile-wrapper {
		display: flex;
		flex: 0 0 auto;
		min-width: 0;
	}

	.bonus-count-display-mobile {
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.6);
		padding: 4px 8px;
		max-width: 112px;
	}

	.menu-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: color 0.2s;
		padding: 4px;
	}

	.menu-btn:hover {
		color: white;
	}

	.menu-btn-mobile {
		width: 38px;
		height: 38px;
		border: 2px solid white;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		margin-top: -10px;
	}

	.toggle-icon-mobile {
		width: 38px;
		height: 38px;
		background: #fff;
	}

	.balance-display-mobile {
		padding: 10px 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.balance-display-mobile .mobile-label,
	.bet-info-mobile .mobile-label {
		font-family: 'Poppins', sans-serif;
		color: #fed697;
		font-size: 8px;
		letter-spacing: 2px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.balance-display-mobile .mobile-label {
		color: white;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 1px;
	}

	.balance-display-mobile .mobile-value,
	.bet-info-mobile .mobile-value {
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		line-height: 1;
		margin-top: 3px;
		color: #ffffff;
		font-weight: 900;
	}

	.bet-info-mobile {
		background: rgba(15, 15, 15, 0.95);
		border-radius: 25px;
		padding: 6px 20px;
		min-width: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
		border: 1px solid white;
	}

	.menu-overlay {
		position: absolute;
		bottom: 150px;
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

	@media (max-height: 450px) and (orientation: landscape) {
		.total-win-display {
			left: 56%;
		}

		.balance-display .value,
		.bet-info .value {
			font-size: 9.6px;
		}

		.bonus-count-display .value,
		.bonus-count-display-mobile .value {
			font-size: 8.8px;
		}

		.total-win-display-mobile .value {
			font-size: 16px;
		}
	}

	@media (max-width: 600px) {
		.control-bar-wrapper {
			bottom: 10px;
			width: 100%;
			gap: 5px;
			justify-content: center;
		}

		.control-bar {
			padding: 5px 10px;
			border-radius: 20px;
			width: auto;
			flex: 0 1 auto;
		}
	}

	@media (max-width: 360px) {
		.portrait-control-bar {
			padding: 0 8px 10px;
		}

		.total-win-display-mobile {
			padding: 2px 6px;
			margin: 0 2px;
			max-width: 110px;
		}

		.total-win-display-mobile .value {
			font-size: 20px;
		}

		.bonus-count-display-mobile {
			padding: 2px 4px;
			max-width: 90px;
		}

		.bonus-count-display-mobile .value {
			font-size: 11px;
		}

		.toggle-icon-mobile,
		.menu-btn-mobile {
			width: 32px;
			height: 32px;
		}

		.hud-slot-right {
			display: none;
		}

		.bet-info-mobile {
			padding: 4px 10px;
			min-width: 80px;
		}
	}

	.popout-s .control-bar {
		transform: scale(0.6);
		transform-origin: bottom center;
		padding: 4px 10px;
		gap: 8px;
		border-radius: 16px;
		overflow: visible;
		height: auto;
		max-height: 45px;
	}

	.popout-s .label {
		font-size: 7px;
	}

	.popout-s .value {
		font-size: 14px;
	}

	.popout-s .balance-display {
		width: 70px;
		flex: 0 0 70px;
		overflow: hidden;
		align-items: center;
		padding: 0;
	}

	.popout-s .bet-info {
		width: 60px;
		flex: 0 0 60px;
		padding: 0;
		min-width: unset;
		border: none;
	}

	.popout-s .total-win-display {
		position: relative;
		left: auto;
		top: auto;
		transform: none;
		width: 80px;
		min-width: unset;
		margin: 0;
	}

	.popout-s .bonus-count-display {
		width: 60px;
		flex: 0 0 60px;
		margin: 0;
	}

	.popout-s .toggle-btn {
		width: 32px;
		height: 32px;
		align-items: center;
		justify-content: center;
	}
</style>
