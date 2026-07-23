<script lang="ts">
	import { onMount } from 'svelte';
	import { stateConfig } from 'state-shared';
	import { getContext } from '../game/context';
	import config from '../game/config';

	const context = getContext();
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isStakePopoutViewport = $derived.by(() => {
		const ratio = canvasSizes.width / Math.max(canvasSizes.height, 1);
		return canvasSizes.width <= 900 && canvasSizes.height <= 520 && ratio >= 1.55;
	});
	const isScaledPopout = $derived(layoutType === 'popout' || isStakePopoutViewport);
	const isPopoutS = $derived(isScaledPopout && canvasSizes.width <= 500);
	const isPopoutL = $derived(isScaledPopout && canvasSizes.width > 500);
	const popoutModalScale = $derived(
		isScaledPopout ? Math.min(1, canvasSizes.width / 960, canvasSizes.height / 540) : 1,
	);
	const isSocial = $derived(stateConfig.jurisdiction?.socialCasino);
	const costUnitLabel = $derived(isSocial ? 'play cost' : 'bet cost');
	const symbolIconSize = $derived(isPopoutS ? 28 : 42);

	let { onClose } = $props<{ onClose: () => void }>();
	let currentPage = $state(0);
	const totalPages = 5;

	const SYMBOL_META = {
		W: {
			name: 'Wild',
			frame: 'Wild_00000.png',
			note: 'Substitutes for all regular symbols.',
		},
		H1: {
			name: 'Coin',
			frame: 'Coin_00000.png',
			note: 'Highest regular symbol.',
		},
		H2: {
			name: 'Bear',
			frame: 'Bear_00000.png',
			note: 'High symbol.',
		},
		H3: {
			name: 'Shiba',
			frame: 'Shiba_00000.png',
			note: 'High symbol.',
		},
		H4: {
			name: 'Pig',
			frame: 'Pig_00000.png',
			note: 'High symbol.',
		},
		L1: {
			name: 'Kola',
			frame: 'Kola_00000.png',
			note: 'Low symbol.',
		},
		L2: {
			name: 'Chick',
			frame: 'Chick_00000.png',
			note: 'Low symbol.',
		},
		L3: {
			name: 'Lollipop',
			frame: 'Lolipop_00000.png',
			note: 'Low symbol.',
		},
		L4: {
			name: 'Heart',
			frame: 'Heart_00000.png',
			note: 'Low symbol.',
		},
		L5: {
			name: 'Star',
			frame: 'Star_00000.png',
			note: 'Low symbol.',
		},
		S: {
			name: 'Scatter',
			frame: 'Scatter_00000.png',
			note: 'Triggers capsule features.',
		},
	} as const;

	const symbolOrder = ['W', 'H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5', 'S'] as const;

	function getPaytableValue(symbolKey: keyof typeof SYMBOL_META, count: 3 | 4 | 5) {
		if (symbolKey === 'S') {
			if (count === 3) return 'Capsules';
			if (count === 4) return 'Super';
			return 'Hidden Bonus';
		}

		const symbolConfig = config.symbols[symbolKey as keyof typeof config.symbols];
		if (!symbolConfig) return '—';
		const paytable = 'paytable' in symbolConfig ? symbolConfig.paytable : [];
		if (!Array.isArray(paytable)) return '—';
		const value = paytable.find((entry) => `${count}` in entry)?.[`${count}` as '3' | '4' | '5'];
		return typeof value === 'number' ? `${value}x` : '—';
	}

	const symbolRows = symbolOrder.map((symbolKey) => ({
		key: symbolKey,
		...SYMBOL_META[symbolKey],
		combo3: getPaytableValue(symbolKey, 3),
		combo4: getPaytableValue(symbolKey, 4),
		combo5: getPaytableValue(symbolKey, 5),
	}));

	const modeRows = [
		{
			title: 'Base',
			cost: '1x',
			rtp: '96.50%',
			maxWin: '15,000x',
			detail:
				'Standard line spins where winning outcomes may upgrade a low symbol or add a wild. Scatters trigger capsule features, with occasional inline Glitch events.',
		},
		{
			title: 'Extra Chance',
			cost: '3x',
			rtp: '96.50%',
			maxWin: '15,000x',
			detail:
				'At 3x cost, increases capsule-feature access and the standard-play high-symbol and wild enhancement chances while retaining inline Glitch events.',
		},
		{
			title: 'Capsules',
			cost: '100x',
			rtp: '96.50%',
			maxWin: '15,000x',
			detail:
				'Direct 10-spin feature. Positive claw picks add wilds or multiplier rewards before play, with accumulated wilds capped at 15.',
		},
		{
			title: 'Super Capsules',
			cost: '250x',
			rtp: '96.50%',
			maxWin: '15,000x',
			detail:
				'Direct 14-spin feature with stronger claw rewards than Capsules and accumulated wilds capped at 15.',
		},
		{
			title: 'Glitch Machine',
			cost: '50x',
			rtp: '96.50%',
			maxWin: '15,000x',
			detail:
				'A single glitch spin with 3-15 injected wilds and a 1x-100x global multiplier. No scatters can land.',
		},
	];

	const controlRows = [
		'Press the spin button, or the space bar when enabled, to start the next round.',
		'Use the left and right amount arrows to lower or raise the selected play cost.',
		'Tap the play-cost display to open the full play-cost selection list.',
		'Open Feature Modes to arm Extra Chance or Glitch Machine, or to start Capsules and Super Capsules directly.',
		'Feature mode changes above 2x cost always require confirmation before they begin.',
		'Auto Play always opens a confirmation step before it starts.',
		'Turbo speeds up reel, feature, and result sequences while it is active.',
		'Sound and music can both be toggled from the main controls and settings menu.',
		'When skip is available during long reveals or feature sequences, tap the active skip control to fast-forward.',
		'Replay displays the mode, base cost, real cost, multiplier, and final result before playback starts, and it can be started again after the event ends.',
	];

	const disclaimer = $derived(
		isSocial
			? 'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026.'
			: 'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Stake Engine.',
	);

	function nextPage() {
		if (currentPage < totalPages - 1) currentPage += 1;
	}

	function prevPage() {
		if (currentPage > 0) currentPage -= 1;
	}

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-overlay {layoutType}"
	class:popout={isScaledPopout}
	class:popout-s={isPopoutS}
	class:popout-l={isPopoutL}
	onclick={onClose}
>
	<div
		class="modal-wrapper"
		style:transform={isScaledPopout ? `scale(${popoutModalScale})` : undefined}
		style:transform-origin={isScaledPopout ? 'center' : undefined}
		onclick={(event) => event.stopPropagation()}
	>
		<button class="close-btn" onclick={onClose}>×</button>

		<div class="modal-body">
			{#if currentPage === 0}
				<div class="page-content">
					<div class="page-header">
						<h2>Symbol Values</h2>
						<p>All awards are shown as multipliers of the {costUnitLabel}.</p>
					</div>

					<div class="scroll-container">
						<div class="table-card">
							<div class="table-head paytable-grid">
								<span>Symbol</span>
								<span>3</span>
								<span>4</span>
								<span>5</span>
								<span>Notes</span>
							</div>

							{#each symbolRows as row}
								<div class="paytable-grid table-row">
									<span class="symbol-name">
										<span
											class="symbol-image"
											style:width={`${symbolIconSize}px`}
											style:height={`${symbolIconSize}px`}
											style:flex-basis={`${symbolIconSize}px`}
										>
											{row.key}
										</span>
										<span>{row.name}</span>
									</span>
									<span>{row.combo3}</span>
									<span>{row.combo4}</span>
									<span>{row.combo5}</span>
									<span class="note">{row.note}</span>
								</div>
							{/each}
						</div>

						<div class="info-card compact">
							<p>
								Wild substitutes for every regular symbol and also awards its own 4 and 5 of a kind.
							</p>
							<p>Scatter symbols do not substitute and instead trigger the capsule features.</p>
						</div>
					</div>
				</div>
			{:else if currentPage === 1}
				<div class="page-content">
					<div class="page-header">
						<h2>How To Win</h2>
						<p>Pipee Capsule uses a 5x5 reel set with 15 fixed lines.</p>
					</div>

					<div class="scroll-container">
						<div class="info-card">
							<p>
								Winning combinations land from left to right on adjacent reels starting on reel 1.
							</p>
							<p>The layout includes 5 straight rows, 8 zigzag lines, and 2 full diagonals.</p>
							<p>
								3 scatters start Capsules with 10 spins. 4 scatters start Super Capsules with 14
								spins. 5 scatters reveal the hidden 14-spin bonus.
							</p>
						</div>

						<div class="table-card">
							<div class="table-head">
								<span>Line Patterns</span>
							</div>
							<div class="payline-text-wrap">
								<div class="payline-text">
									5 straight rows, 8 zigzag lines, and 2 full diagonals.
								</div>
							</div>
							<p class="helper-text">
								Row 1 is the top visible row. Row 5 is the bottom visible row.
							</p>
						</div>
					</div>
				</div>
			{:else if currentPage === 2}
				<div class="page-content">
					<div class="page-header">
						<h2>Modes</h2>
						<p>Every live mode runs at 96.50% RTP with a 15,000x maximum win.</p>
					</div>

					<div class="scroll-container">
						<div class="mode-grid">
							{#each modeRows as mode}
								<div class="mode-card">
									<div class="mode-top">
										<h3>{mode.title}</h3>
										<span class="mode-cost">{mode.cost}</span>
									</div>
									<div class="mode-stats">
										<span>RTP {mode.rtp}</span>
										<span>Max Win {mode.maxWin}</span>
									</div>
									<p>{mode.detail}</p>
								</div>
							{/each}
						</div>

						<div class="info-card">
							<p>
								Capsule-style features use a claw map with positive wild or multiplier rewards. The
								collected values are accumulated before the spins begin.
							</p>
							<p>
								Only the hidden five-scatter bonus upgrades every low symbol to a weighted high
								symbol. It starts with at least 2 wilds and caps accumulated wilds at 7.
							</p>
							<p>
								Capsule features cannot retrigger. Glitch Machine is a one-round mode with 3-15
								injected wilds and a 1x-100x global multiplier for that reveal.
							</p>
						</div>
					</div>
				</div>
			{:else if currentPage === 3}
				<div class="page-content">
					<div class="page-header">
						<h2>Controls</h2>
						<p>Every interactive button used in play is listed below.</p>
					</div>

					<div class="scroll-container">
						<div class="list-card">
							{#each controlRows as row}
								<div class="list-row">{row}</div>
							{/each}
						</div>

						<div class="info-card">
							<p>
								The main play display always shows the selected play cost, including any active mode
								multiplier.
							</p>
							<p>
								Replay intro also shows the base cost and the real cost side by side for higher-cost
								modes.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="page-content">
					<div class="page-header">
						<h2>Game Info</h2>
						<p>Reference details for approval, rules, and player messaging.</p>
					</div>

					<div class="scroll-container">
						<div class="info-card">
							<p>
								Base, Extra Chance, Capsules, Super Capsules, and Glitch Machine all return 96.50%
								over time.
							</p>
							<p>The advertised maximum win is 15,000x in every available mode.</p>
							<p>English is the supported language for this build.</p>
						</div>

						<div class="disclaimer-card">
							{disclaimer}
						</div>
					</div>
				</div>
			{/if}

			<div class="navigation-bar">
				<button
					class="nav-btn"
					onclick={prevPage}
					disabled={currentPage === 0}
					aria-label="Previous Page"
				>
					<svg viewBox="0 0 24 24" width="24" height="24">
						<path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
					</svg>
				</button>

				<div class="page-indicators">
					{#each Array(totalPages) as _, index}
						<div class="dot" class:active={index === currentPage}></div>
					{/each}
				</div>

				<button
					class="nav-btn"
					onclick={nextPage}
					disabled={currentPage === totalPages - 1}
					aria-label="Next Page"
				>
					<svg viewBox="0 0 24 24" width="24" height="24">
						<path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
					</svg>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@font-face {
		font-family: 'cherryBomb';
		src: url('assets/fonts/cherryBomb/CherryBombOne-Regular.ttf') format('truetype');
		font-weight: 400;
		font-style: normal;
		font-display: swap;
	}

	.modal-overlay {
		--pipee-accent: #e61e73;
		--pipee-accent-bright: #ff4fa2;
		--pipee-accent-soft: #ff9bcf;
		--pipee-accent-soft-rgb: 255, 155, 207;
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 30000;
		font-family: 'Poppins', sans-serif;
	}

	.modal-overlay * {
		box-sizing: border-box;
	}

	.modal-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 800px;
		height: 85vh;
		max-height: 650px;
		padding: 40px 40px 20px;
		overflow: hidden;
		border-radius: 20px;
		background: #000;
		color: #fff;
	}

	.modal-overlay.portrait .modal-wrapper {
		width: 76vw;
		height: 72vh;
		max-height: none;
		padding: 24px 12px 12px;
	}

	.close-btn {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 100;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		font-size: 24px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		color: #fff;
		background: rgba(var(--pipee-accent-soft-rgb), 0.12);
	}

	.modal-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
	}

	.page-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 0;
		overflow: hidden;
		animation: fadeIn 0.3s ease-out;
	}

	.page-header {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 20px;
		text-align: center;
	}

	h2 {
		width: 100%;
		margin: 0 0 12px;
		overflow-wrap: break-word;
		color: var(--pipee-accent-soft);
		font-family: 'cherryBomb', sans-serif;
		font-size: clamp(18px, 6vw, 32px);
		letter-spacing: 1px;
		text-align: center;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	h3 {
		margin: 0;
		color: #fff;
		font-size: 1.05rem;
	}

	.page-header p,
	.info-card p,
	.mode-card p,
	.helper-text,
	.disclaimer-card,
	.list-row,
	.table-row,
	.table-head {
		line-height: 1.55;
	}

	.page-header p,
	.helper-text {
		margin: 0;
		color: rgba(255, 255, 255, 0.78);
	}

	.scroll-container {
		width: 100%;
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		min-height: 0;
		padding: 10px 15px;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.scroll-container::-webkit-scrollbar {
		display: none;
	}

	.table-card,
	.info-card,
	.list-card,
	.disclaimer-card,
	.mode-card {
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
	}

	.table-card,
	.info-card,
	.list-card,
	.disclaimer-card {
		max-width: 700px;
		padding: 16px 18px;
	}

	.info-card {
		text-align: center;
	}

	.info-card.compact p,
	.info-card p {
		margin: 0 0 10px;
		color: rgba(255, 255, 255, 0.9);
	}

	.info-card p:last-child {
		margin-bottom: 0;
	}

	.paytable-grid {
		display: grid;
		grid-template-columns: 1.3fr 0.6fr 0.6fr 0.6fr 1.8fr;
		gap: 10px;
		align-items: center;
	}

	.table-head {
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--pipee-accent-soft);
		font-family: 'Bungee', cursive;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.table-row {
		padding: 11px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.88);
	}

	.table-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.symbol-name {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		color: #fff;
		font-weight: 700;
	}

	.symbol-image {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		flex: 0 0 42px;
		border-radius: 8px;
		background: rgba(var(--pipee-accent-soft-rgb), 0.14);
		border: 1px solid rgba(var(--pipee-accent-soft-rgb), 0.4);
		color: var(--pipee-accent-soft);
		font-weight: 900;
		font-size: 12px;
		filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
	}

	.note {
		color: rgba(255, 255, 255, 0.66);
	}

	.payline-text-wrap {
		display: flex;
		justify-content: center;
		width: 100%;
		margin-top: 14px;
	}

	.payline-text {
		width: min(100%, 760px);
		padding: 18px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(var(--pipee-accent-soft-rgb), 0.18);
		color: rgba(255, 255, 255, 0.82);
		text-align: center;
		font-weight: 700;
	}

	.mode-grid {
		width: 100%;
		max-width: 700px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.mode-card {
		padding: 16px;
	}

	.mode-top,
	.mode-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.mode-top {
		margin-bottom: 8px;
	}

	.mode-cost {
		padding: 4px 10px;
		border: 1px solid rgba(var(--pipee-accent-soft-rgb), 0.22);
		border-radius: 999px;
		background: rgba(var(--pipee-accent-soft-rgb), 0.15);
		color: var(--pipee-accent-soft);
		font-size: 0.85rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.mode-stats {
		margin-bottom: 10px;
		color: rgba(255, 255, 255, 0.74);
		font-size: 0.88rem;
	}

	.mode-card p {
		margin: 0;
		color: rgba(255, 255, 255, 0.86);
	}

	.list-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.list-row {
		padding: 10px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.9);
	}

	.disclaimer-card {
		border-color: rgba(var(--pipee-accent-soft-rgb), 0.2);
		background: linear-gradient(
			90deg,
			transparent,
			rgba(var(--pipee-accent-soft-rgb), 0.1),
			transparent
		);
		color: rgba(255, 255, 255, 0.88);
		text-align: center;
	}

	.navigation-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 30px;
		margin-top: 28px;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
		border: none;
		background: none;
		color: #888;
		cursor: pointer;
		transition: all 0.2s;
	}

	.nav-btn:hover:not(:disabled) {
		color: var(--pipee-accent-soft);
		transform: scale(1.1);
	}

	.nav-btn:disabled {
		cursor: not-allowed;
		opacity: 0.3;
	}

	.page-indicators {
		display: flex;
		gap: 12px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		transition: all 0.3s;
	}

	.dot.active {
		background: var(--pipee-accent-soft);
		box-shadow: 0 0 10px rgba(var(--pipee-accent-soft-rgb), 0.5);
		transform: scale(1.3);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 760px) {
		.modal-wrapper {
			padding: 24px 14px 16px;
		}

		.modal-overlay.portrait .modal-wrapper {
			width: 76vw;
			height: 72vh;
			padding: 24px 12px 12px;
		}

		.paytable-grid {
			grid-template-columns: minmax(112px, 1fr) 0.6fr 0.6fr 0.6fr;
		}

		.paytable-grid .note {
			grid-column: 1 / -1;
			padding-top: 4px;
		}

		.mode-grid {
			grid-template-columns: 1fr;
		}

		.table-card,
		.info-card,
		.list-card,
		.disclaimer-card,
		.mode-card {
			padding-left: 14px;
			padding-right: 14px;
		}

		.navigation-bar {
			gap: 22px;
			margin-top: 18px;
		}
	}

	.modal-overlay.popout {
		overflow: hidden;
	}

	.modal-overlay.popout .modal-wrapper {
		width: 860px;
		height: 460px;
		max-width: none;
		max-height: none;
		padding: 24px 24px 16px;
		border-radius: 20px;
	}

	.modal-overlay.popout .page-header {
		margin-bottom: 12px;
	}

	.modal-overlay.popout h2 {
		font-size: 30px;
	}

	.modal-overlay.popout .scroll-container {
		gap: 12px;
		padding: 4px 8px 0;
	}

	.modal-overlay.popout .paytable-grid {
		grid-template-columns: 1.3fr 0.6fr 0.6fr 0.6fr 1.8fr;
	}

	.modal-overlay.popout .paytable-grid .note {
		grid-column: auto;
		padding-top: 0;
	}

	.modal-overlay.popout .mode-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.modal-overlay.popout .navigation-bar {
		margin-top: 14px;
	}

	.modal-overlay.popout-s {
		background: rgba(0, 0, 0, 0.75);
		padding: 0;
		overflow: visible;
	}

	.modal-overlay.popout-s .modal-wrapper {
		width: 250%;
		height: 145vh;
		max-width: none;
		max-height: none;
		padding: 20px 20px 10px;
		border-radius: 30px;
	}

	.modal-overlay.popout-s h2 {
		margin-bottom: 8px;
		font-size: 22px;
	}

	.modal-overlay.popout-s .page-header {
		margin-bottom: 8px;
	}

	.modal-overlay.popout-s .scroll-container {
		padding: 5px 10px;
	}

	.modal-overlay.popout-s .table-card,
	.modal-overlay.popout-s .info-card,
	.modal-overlay.popout-s .list-card,
	.modal-overlay.popout-s .disclaimer-card,
	.modal-overlay.popout-s .mode-card {
		padding: 10px;
	}

	.modal-overlay.popout-s .paytable-grid,
	.modal-overlay.popout-s .table-row,
	.modal-overlay.popout-s .info-card,
	.modal-overlay.popout-s .list-row,
	.modal-overlay.popout-s .mode-card,
	.modal-overlay.popout-s .disclaimer-card {
		font-size: 11px;
	}

	.modal-overlay.popout-s .symbol-name {
		gap: 6px;
	}

	.modal-overlay.popout-s .symbol-image {
		width: 28px;
		height: 28px;
		flex-basis: 28px;
	}

	.modal-overlay.popout-s .navigation-bar {
		gap: 20px;
		margin-top: 12px;
	}

	.modal-overlay.popout-s .nav-btn svg {
		width: 32px;
		height: 32px;
	}
</style>
