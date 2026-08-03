<script lang="ts">
	import { onMount } from 'svelte';
	import { stateConfig, stateUrlDerived } from 'state-shared';
	import { getContext } from '../game/context';

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
	const isSocial = $derived(stateConfig.jurisdiction?.socialCasino || stateUrlDerived.social());
	const costUnitLabel = $derived(isSocial ? 'play cost' : 'bet cost');
	const resultLabel = $derived(isSocial ? 'result' : 'win');
	const finalResultLabel = $derived(isSocial ? 'final result' : 'cash payout');
	const featureActionLabel = $derived(isSocial ? 'activate' : 'buy');
	const maxResultLabel = $derived(isSocial ? 'Max Result' : 'Max Win');
	const symbolIconSize = $derived(isPopoutS ? 28 : 42);

	let { onClose } = $props<{ onClose: () => void }>();
	let currentPage = $state(0);
	const totalPages = 5;

	type SpriteFrame = {
		x: number;
		y: number;
		w: number;
		h: number;
	};

	type SpriteSheet = {
		w: number;
		h: number;
	};

	const objectRows = [
		{
			key: 'LEX',
			name: 'Lex',
			image: 'assets/lex/character/lexMain.png',
			frame: { x: 0, y: 324, w: 15, h: 26 },
			sheet: { w: 16, h: 812 },
			effect:
				'The main adventurer. Each wall bounce builds the tumble value and refreshes the corner chests.',
		},
		{
			key: 'CLONE',
			name: 'Clone',
			image: 'assets/lex/character/lexClone.png',
			frame: { x: 0, y: 324, w: 15, h: 26 },
			sheet: { w: 16, h: 790 },
			effect:
				'A duplicate ball with 15 hits. Clone bounces add value, and an expired clone adds a final bonus.',
		},
		{
			key: 'ORB',
			name: 'Clone Orb',
			image: 'assets/lex/runtime/clone-orb.png',
			effect: 'Spawns a new Clone at the collection point.',
		},
		{
			key: 'EXIT',
			name: 'Escape Ladder',
			image: 'assets/lex/runtime/escape.png',
			effect: 'Awards the current tumble value and ends the round.',
		},
		{
			key: 'BLOB',
			name: 'Blue Blob',
			image: 'assets/lex/character/lexBlueBlob.png',
			frame: { x: 0, y: 134, w: 23, h: 23 },
			sheet: { w: 23, h: 157 },
			effect: 'Cuts the current tumble value by 50%.',
		},
		{
			key: 'SLAY',
			name: 'Slayer',
			image: 'assets/lex/character/lexSlayer.png',
			frame: { x: 516, y: 1433, w: 516, h: 516 },
			sheet: { w: 1032, h: 1952 },
			effect:
				'Destroys the ball that hits it. A heart shield blocks the next Slayer hit against Lex.',
		},
		{
			key: 'COIN',
			name: 'Gold Coin',
			image: 'assets/lex/runtime/coin.png',
			effect: 'Adds 0.5x of the selected cost to the tumble value.',
		},
		{
			key: 'GEM',
			name: 'Green Gem',
			image: 'assets/lex/runtime/diamond.png',
			effect: 'Adds 5x of the selected cost to the tumble value.',
		},
		{
			key: 'HEART',
			name: 'Red Heart',
			image: 'assets/lex/runtime/heart.png',
			effect: 'Grants one shield charge against Slayer.',
		},
		{
			key: 'CHEST',
			name: 'Mystery Chest',
			image: 'assets/lex/runtime/chest.png',
			effect: 'Applies a random multiplier to the current tumble value.',
		},
	];

	function getSpriteFrameStyle(row: { image: string; frame?: SpriteFrame; sheet?: SpriteSheet }) {
		if (!row.frame || !row.sheet) return '';

		const scale = Math.min(symbolIconSize / row.frame.w, symbolIconSize / row.frame.h);
		const renderedFrameWidth = row.frame.w * scale;
		const renderedFrameHeight = row.frame.h * scale;
		const backgroundX = -row.frame.x * scale + (symbolIconSize - renderedFrameWidth) / 2;
		const backgroundY = -row.frame.y * scale + (symbolIconSize - renderedFrameHeight) / 2;

		return [
			`background-image: url(${row.image})`,
			`background-size: ${row.sheet.w * scale}px ${row.sheet.h * scale}px`,
			`background-position: ${backgroundX}px ${backgroundY}px`,
		].join('; ');
	}

	const modeRows = [
		{
			title: 'Base',
			cost: '1x',
			rtp: '96.50%',
			maxWin: '35x',
			detail:
				'Standard Lex Looter round. One Lex ball starts in the arena, corners use the base multiplier profile, and all regular objects may appear.',
		},
		{
			title: 'No Slayer',
			cost: '3x',
			rtp: '96.50%',
			maxWin: '5,000x',
			detail:
				'Feature mode with improved corner multipliers. Slayer is delayed out of play for the round, while escape is disabled.',
		},
		{
			title: 'Start Clone',
			cost: '50x',
			rtp: '96.50%',
			maxWin: '5,000x',
			detail:
				'Feature mode that begins with Lex and one Clone already active. Corner multipliers are stronger and escape is disabled.',
		},
		{
			title: 'Lucky Lex',
			cost: '100x',
			rtp: '96.50%',
			maxWin: '5,000x',
			detail:
				'Feature mode that starts with a Clone and stronger visible corner multipliers starting from 5x.',
		},
	];

	const controlRows = $derived([
		`Press Play or the spin control to start a Base round at the selected ${costUnitLabel}.`,
		'Use the left and right amount arrows to lower or raise the selected cost.',
		`Open the feature menu to ${featureActionLabel} No Slayer, Start Clone, or Lucky Lex.`,
		'Auto Play opens a confirmation step before it starts.',
		'Turbo speeds up Lex movement and round reveals while it is active.',
		'Sound and music can both be toggled from the main controls and settings menu.',
		`Replay displays the mode, cost, multiplier, and ${resultLabel} before playback starts.`,
	]);

	const payoutRows = [
		{
			title: 'Corner Chest',
			detail:
				'If Lex reaches a live corner chest, the round awards tumble value times the corner multiplier.',
		},
		{
			title: 'Escape Ladder',
			detail: 'Collecting the ladder awards the tumble value immediately.',
		},
		{
			title: 'Bounce Limit',
			detail:
				'At 40 Lex wall bounces, the round reaches STEALTH and awards the current tumble value.',
		},
		{
			title: 'All Balls Lost',
			detail: 'If Slayer removes every active ball and no shield saves Lex, the round ends at 0.',
		},
	];

	const disclaimer = $derived(
		isSocial
			? 'Malfunction voids all awards and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Awards are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026.'
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
		onclick={(event) => event.stopPropagation()}
	>
		<button class="close-btn" onclick={onClose}>×</button>

		<div class="modal-body">
			{#if currentPage === 0}
				<div class="page-content">
					<div class="page-header">
						<h2>Lex Looter</h2>
						<p>Build a tumble value, dodge danger, and claim a result before the arena turns on you.</p>
					</div>

					<div class="scroll-container">
						<div class="info-card">
							<p>
								Lex bounces around a walled arena. Each Lex wall bounce adds value to the running
								tumble amount and refreshes the four corner chest multipliers.
							</p>
							<p>
								For the first 5 Lex bounces, corner chests stay inactive so the tumble value has
								time to grow.
							</p>
							<p>
								Clone balls can join the round, add their own bounce value, and keep the action
								alive while they remain on the board.
							</p>
						</div>

						<div class="table-card">
							<div class="table-head overview-grid">
								<span>Value Source</span>
								<span>Award</span>
							</div>
							<div class="overview-grid table-row">
								<span>Lex wall bounce</span>
								<span>+0.12x of {costUnitLabel}</span>
							</div>
							<div class="overview-grid table-row">
								<span>Clone wall bounce</span>
								<span>+0.08x of {costUnitLabel}</span>
							</div>
							<div class="overview-grid table-row">
								<span>Clone expires after 15 hits</span>
								<span>+0.50x of {costUnitLabel}</span>
							</div>
						</div>
					</div>
				</div>
			{:else if currentPage === 1}
				<div class="page-content">
					<div class="page-header">
						<h2>Objects</h2>
						<p>Collect treasures, watch the hazards, and use shields to survive Slayer.</p>
					</div>

					<div class="scroll-container">
						<div class="table-card">
							<div class="table-head object-grid">
								<span>Object</span>
								<span>Effect</span>
							</div>

							{#each objectRows as row}
								<div class="object-grid table-row">
									<span class="symbol-name">
										<span
											class="symbol-image"
											style:width={`${symbolIconSize}px`}
											style:height={`${symbolIconSize}px`}
											style:flex-basis={`${symbolIconSize}px`}
										>
											{#if row.frame}
												<span
													class="sprite-frame"
													style:width={`${symbolIconSize}px`}
													style:height={`${symbolIconSize}px`}
													style={getSpriteFrameStyle(row)}
												></span>
											{:else}
												<img src={row.image} alt="" />
											{/if}
										</span>
										<span>{row.name}</span>
									</span>
									<span class="note">{row.effect}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else if currentPage === 2}
				<div class="page-content">
					<div class="page-header">
						<h2>{isSocial ? 'Results' : 'Wins'}</h2>
						<p>A round ends when Lex claims a result, reaches STEALTH, or loses every active ball.</p>
					</div>

					<div class="scroll-container">
						<div class="list-card">
							{#each payoutRows as row}
								<div class="list-row">
									<strong>{row.title}</strong>
									<span>{row.detail}</span>
								</div>
							{/each}
						</div>

						<div class="info-card">
							<p>
								Low corner multipliers are shown in red. Favourable corner multipliers use the game
								green.
							</p>
							<p>
								The result popup shows the final result, effective multiplier, and
								{finalResultLabel} before the next round begins.
							</p>
						</div>
					</div>
				</div>
			{:else if currentPage === 3}
				<div class="page-content">
					<div class="page-header">
						<h2>Modes</h2>
						<p>Every mode runs at 96.50% RTP. Maximum results are listed per mode.</p>
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
										<span>{maxResultLabel} {mode.maxWin}</span>
									</div>
									<p>{mode.detail}</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
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
							<p>English is the supported language for this build.</p>
							<p>{disclaimer}</p>
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
					{#each Array.from({ length: totalPages }, (_value, index) => index) as index}
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
	.modal-overlay {
		--pipee-accent: #00ff50;
		--pipee-accent-bright: #00ff50;
		--pipee-accent-soft: #00ff50;
		--pipee-accent-soft-rgb: 0, 255, 80;
		--lex-green-rgb: 0, 255, 80;
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 30000;
		font-family: var(--lex-looter-ui-font);
		padding: clamp(8px, 2.5vh, 24px);
		box-sizing: border-box;
	}

	.modal-overlay * {
		box-sizing: border-box;
	}

	.modal-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: min(800px, calc(100vw - 24px));
		height: min(650px, calc(100dvh - 24px));
		padding: clamp(22px, 4vh, 40px) clamp(14px, 4vw, 40px) clamp(12px, 2.5vh, 20px);
		overflow: hidden;
		border-radius: clamp(12px, 2vw, 20px);
		background: #000;
		color: #fff;
	}

	.modal-overlay.portrait .modal-wrapper {
		width: min(395px, calc(100vw - 16px));
		max-width: none;
		height: calc(100dvh - 16px);
		max-height: none;
		padding: 24px 10px 10px;
	}

	.close-btn {
		position: absolute;
		top: clamp(8px, 2vh, 20px);
		right: clamp(8px, 2vh, 20px);
		z-index: 100;
		width: clamp(28px, 5.5vh, 36px);
		height: clamp(28px, 5.5vh, 36px);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		font-size: clamp(18px, 4vh, 24px);
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		color: #fff;
		background: rgba(var(--lex-green-rgb), 0.14);
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
		margin-bottom: clamp(8px, 2.5vh, 20px);
		text-align: center;
	}

	h2 {
		width: 100%;
		margin: 0 0 clamp(6px, 1.5vh, 12px);
		overflow-wrap: break-word;
		color: var(--pipee-accent-soft);
		font-family: var(--lex-looter-ui-font);
		font-size: clamp(18px, 5vh, 32px);
		letter-spacing: 0;
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
	.list-row,
	.table-row,
	.table-head {
		line-height: 1.45;
	}

	.page-header p {
		margin: 0;
		color: rgba(255, 255, 255, 0.78);
	}

	.scroll-container {
		width: 100%;
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: clamp(8px, 2vh, 16px);
		min-height: 0;
		padding: clamp(4px, 1.5vh, 10px) clamp(6px, 2vw, 15px);
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
	.mode-card {
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
	}

	.table-card,
	.info-card,
	.list-card {
		max-width: 700px;
		padding: clamp(10px, 2vh, 16px) clamp(10px, 2vw, 18px);
	}

	.info-card {
		text-align: center;
	}

	.info-card p {
		margin: 0 0 10px;
		color: rgba(255, 255, 255, 0.9);
	}

	.info-card p:last-child {
		margin-bottom: 0;
	}

	.overview-grid,
	.object-grid {
		display: grid;
		gap: 12px;
		align-items: center;
	}

	.overview-grid {
		grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
	}

	.object-grid {
		grid-template-columns: minmax(170px, 0.85fr) minmax(0, 1.6fr);
	}

	.table-head {
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--pipee-accent-soft);
		font-family: var(--lex-looter-ui-font);
		font-size: 0.75rem;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.table-row {
		padding: clamp(7px, 1.8vh, 11px) 0;
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
		background: transparent;
		border: none;
		overflow: hidden;
		filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
	}

	.symbol-image img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
	}

	.sprite-frame {
		display: block;
		flex: 0 0 auto;
		background-repeat: no-repeat;
		image-rendering: pixelated;
	}

	.note {
		color: rgba(255, 255, 255, 0.66);
	}

	.mode-grid {
		width: 100%;
		max-width: 700px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(8px, 2vh, 14px);
	}

	.mode-card {
		padding: clamp(10px, 2vh, 16px);
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
		background: rgba(var(--lex-green-rgb), 0.15);
		color: var(--pipee-accent);
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
		gap: clamp(6px, 1.5vh, 10px);
	}

	.list-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: clamp(7px, 1.5vh, 10px) clamp(8px, 2vw, 12px);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.9);
	}

	.list-row strong {
		color: var(--pipee-accent-soft);
	}

	.navigation-bar {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(18px, 4vw, 30px);
		margin-top: clamp(8px, 2.5vh, 28px);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(5px, 1.8vh, 10px);
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
		gap: clamp(8px, 2vw, 12px);
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
			width: min(395px, calc(100vw - 16px));
			height: calc(100dvh - 16px);
			padding: 24px 12px 12px;
		}

		.overview-grid,
		.object-grid {
			grid-template-columns: 1fr;
		}

		.mode-grid {
			grid-template-columns: 1fr;
		}

		.table-card,
		.info-card,
		.list-card,
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
		padding: clamp(4px, 2vh, 10px);
	}

	.modal-overlay.popout .modal-wrapper {
		width: min(860px, calc(100vw - 16px));
		height: calc(100dvh - 16px);
		max-width: none;
		max-height: none;
		padding: clamp(10px, 3vh, 24px) clamp(12px, 3vw, 24px) clamp(8px, 2vh, 16px);
		border-radius: clamp(10px, 2vw, 20px);
	}

	.modal-overlay.popout .page-header {
		margin-bottom: clamp(6px, 2vh, 12px);
	}

	.modal-overlay.popout h2 {
		font-size: clamp(18px, 5.5vh, 30px);
	}

	.modal-overlay.popout .scroll-container {
		gap: clamp(6px, 2vh, 12px);
		padding: 4px 8px 0;
	}

	.modal-overlay.popout .object-grid {
		grid-template-columns: minmax(155px, 0.8fr) minmax(0, 1.7fr);
	}

	.modal-overlay.popout .mode-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.modal-overlay.popout .navigation-bar {
		margin-top: clamp(5px, 2vh, 14px);
	}

	.modal-overlay.popout-s {
		background: rgba(0, 0, 0, 0.75);
		padding: 4px;
		overflow: hidden;
	}

	.modal-overlay.popout-s .modal-wrapper {
		width: calc(100vw - 8px);
		height: calc(100dvh - 8px);
		max-width: none;
		max-height: none;
		padding: 8px 8px 4px;
		border-radius: 10px;
	}

	.modal-overlay.popout-s .close-btn {
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		font-size: 16px;
	}

	.modal-overlay.popout-s .modal-body {
		min-height: 0;
	}

	.modal-overlay.popout-s h2 {
		margin-bottom: 3px;
		font-size: clamp(13px, 8vh, 17px);
		line-height: 1;
	}

	.modal-overlay.popout-s .page-header {
		margin-bottom: 4px;
		padding: 0 24px;
	}

	.modal-overlay.popout-s .page-header p {
		font-size: clamp(8px, 4vh, 10px);
		line-height: 1.15;
	}

	.modal-overlay.popout-s .scroll-container {
		gap: 5px;
		padding: 2px 4px;
	}

	.modal-overlay.popout-s .table-card,
	.modal-overlay.popout-s .info-card,
	.modal-overlay.popout-s .list-card,
	.modal-overlay.popout-s .mode-card {
		border-radius: 8px;
		padding: 6px;
	}

	.modal-overlay.popout-s .overview-grid,
	.modal-overlay.popout-s .object-grid,
	.modal-overlay.popout-s .table-row,
	.modal-overlay.popout-s .info-card,
	.modal-overlay.popout-s .list-row,
	.modal-overlay.popout-s .mode-card {
		font-size: clamp(8px, 3.8vh, 10px);
		line-height: 1.18;
	}

	.modal-overlay.popout-s .table-head {
		padding-bottom: 5px;
	}

	.modal-overlay.popout-s .table-row {
		padding: 5px 0;
	}

	.modal-overlay.popout-s .info-card p {
		margin-bottom: 5px;
	}

	.modal-overlay.popout-s .list-card {
		gap: 4px;
	}

	.modal-overlay.popout-s .list-row {
		padding: 5px 6px;
		border-radius: 7px;
	}

	.modal-overlay.popout-s .symbol-name {
		gap: 6px;
	}

	.modal-overlay.popout-s .symbol-image {
		width: 28px;
		height: 28px;
		flex-basis: 28px;
	}

	.modal-overlay.popout-s .object-grid {
		grid-template-columns: 1fr;
	}

	.modal-overlay.popout-s .mode-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 5px;
	}

	.modal-overlay.popout-s .mode-top,
	.modal-overlay.popout-s .mode-stats {
		gap: 5px;
	}

	.modal-overlay.popout-s .mode-top {
		margin-bottom: 4px;
	}

	.modal-overlay.popout-s .mode-stats {
		margin-bottom: 5px;
		font-size: clamp(7px, 3.4vh, 9px);
	}

	.modal-overlay.popout-s h3 {
		font-size: clamp(9px, 4vh, 11px);
	}

	.modal-overlay.popout-s .mode-cost {
		padding: 2px 5px;
		font-size: clamp(7px, 3.4vh, 9px);
	}

	.modal-overlay.popout-s .navigation-bar {
		gap: 16px;
		margin-top: 3px;
	}

	.modal-overlay.popout-s .nav-btn svg {
		width: 22px;
		height: 22px;
	}

	.modal-overlay.popout-s .dot {
		width: 6px;
		height: 6px;
	}
</style>
