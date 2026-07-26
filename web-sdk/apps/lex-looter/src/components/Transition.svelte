<script lang="ts" module>
	export type EmitterEventTransition = { type: 'transition' };
</script>

<script lang="ts">
	import { Container, Rectangle } from 'pixi-svelte';
	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateUi } from 'state-shared';
	import { getContext } from '../game/context';

	type Props = {
		autoplay?: boolean;
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());

	const ANIM_DURATION_MS = 2000;
	const START_DELAY_MS = 450;
	const PEAK_MS = 1000;

	let transitioning = $state(false);
	const progress = tweened(0, { easing: cubicInOut });
	let jitterSeed = $state(0);
	let autoplayStarted = false;

	let rafHandle = 0;
	function startJitter() {
		const tick = () => {
			jitterSeed = Math.random();
			if (transitioning) {
				rafHandle = requestAnimationFrame(tick);
			}
		};
		rafHandle = requestAnimationFrame(tick);
	}
	function stopJitter() {
		cancelAnimationFrame(rafHandle);
	}

	const playTransition = async () => {
		await waitForTimeout(START_DELAY_MS);
		transitioning = true;
		stateUi.transitioning = true;
		startJitter();
		await progress.set(1, { duration: PEAK_MS });

		// Play glitch sound at peak while the transition is strongest.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_glitch_tv', forcePlay: true });
		await waitForTimeout(100);

		props.oncomplete?.();

		await progress.set(0, { duration: ANIM_DURATION_MS - PEAK_MS });
		transitioning = false;
		stateUi.transitioning = false;
		stopJitter();
	};

	context.eventEmitter.subscribeOnMount({
		transition: playTransition,
		stopButtonClick: () => {
			transitioning = false;
			stateUi.transitioning = false;
			stopJitter();
		},
	});

	$effect(() => {
		if (!props.autoplay || autoplayStarted) return;
		autoplayStarted = true;
		playTransition();
	});

	$effect(() => {
		stateUi.transitionProgress = $progress;
	});

	const THEME_COLORS = {
		boardShadow: 0x07141d,
		lexGreen: 0x00ff50,
		cloverGreen: 0x00e701,
		coinGold: 0xffd24a,
		softHighlight: 0xf4ffe8,
	};
	const GLITCH_COLORS = [
		THEME_COLORS.lexGreen,
		THEME_COLORS.coinGold,
		THEME_COLORS.softHighlight,
		THEME_COLORS.boardShadow,
		THEME_COLORS.cloverGreen,
	];

	// Scanline Layer: Subtle horizontal texture
	const scanlines = $derived.by(() => {
		const p = $progress;
		if (p <= 0.05) return [];
		const layers = [];
		const spacing = 6;
		const count = Math.floor(canvasSizes.height / spacing);
		for (let i = 0; i < count; i += 2) {
			layers.push({
				x: 0,
				y: i * spacing,
				width: canvasSizes.width,
				height: 1,
				backgroundColor: THEME_COLORS.boardShadow,
				backgroundAlpha: 0.18 * p,
			});
		}
		return layers;
	});
	const spectralLayers = $derived.by(() => {
		const p = $progress;
		if (p <= 0.02) return [];

		const layers = [];
		const count = Math.floor(60 * p);
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed + i * 0.17) % 1;
			const color = GLITCH_COLORS[i % GLITCH_COLORS.length];

			// Very wide, very thin horizontal "slices"
			const w = canvasSizes.width * (0.4 + s * 0.8);
			const h = 1 + s * 12;

			layers.push({
				x: (canvasSizes.width - w) * 0.5 + (s - 0.5) * 200 * p,
				y: ((s * 13) % 1) * canvasSizes.height - h * 0.5,
				width: w,
				height: h,
				backgroundColor: color,
				backgroundAlpha: (0.12 + s * 0.4) * p,
			});
		}
		return layers;
	});

	// Corrupted Signal Layer: Dense primary blocks
	const corruptionLayers = $derived.by(() => {
		const p = $progress;
		if (p <= 0.1) return [];

		const layers = [];
		const count = 25;
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed + i * 0.11) % 1;
			const w = (s > 0.5 ? 40 + s * 150 : canvasSizes.width * 0.6) * p * 1.5;
			const h = s > 0.5 ? canvasSizes.height * 0.2 : 5 + s * 80;
			const color =
				i % 3 === 0
					? THEME_COLORS.boardShadow
					: i % 3 === 1
						? THEME_COLORS.lexGreen
						: THEME_COLORS.coinGold;

			layers.push({
				x: ((s * 19) % 1) * canvasSizes.width - w * 0.5,
				y: ((s * 23) % 1) * canvasSizes.height - h * 0.5,
				width: w,
				height: h,
				backgroundColor: color,
				backgroundAlpha: 0.4 * p,
			});
		}
		return layers;
	});

	// Glass Shard Layer: Frosted semi-transparent "panes" and "glares"
	const glassPanes = $derived.by(() => {
		const p = $progress;
		if (p <= 0.05) return [];

		const layers = [];
		const count = 12;
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed * (i + 13)) % 1;
			const w = 150 + s * 600;
			const h = 100 + s * 400;

			// Main glass pane
			layers.push({
				x: ((s * 43) % 1) * canvasSizes.width - w * 0.5,
				y: ((s * 31) % 1) * canvasSizes.height - h * 0.5,
				width: w,
				height: h,
				backgroundColor: THEME_COLORS.softHighlight,
				backgroundAlpha: 0.1 * p,
				borderColor: THEME_COLORS.lexGreen,
				borderWidth: 1.5,
				borderAlpha: 0.3 * p,
				borderRadius: 2,
			});

			if (i % 3 === 0) {
				layers.push({
					x: ((s * 17) % 1) * canvasSizes.width - w * 0.3,
					y: ((s * 29) % 1) * canvasSizes.height,
					width: w * 0.9,
					height: 2,
					backgroundColor: THEME_COLORS.coinGold,
					backgroundAlpha: 0.42 * p,
				});
			}
		}
		return layers;
	});
</script>

{#if transitioning}
	<Container zIndex={10000}>
		<!-- Scanline Overlay -->
		{#each scanlines as line}
			<Rectangle {...line} />
		{/each}

		<!-- Glass Panes Layer -->
		{#each glassPanes as pane}
			<Rectangle {...pane} />
		{/each}

		<!-- Sliced Spectral Blocks (Cyan/Red/Yellow split) -->
		{#each spectralLayers as layer}
			<Rectangle {...layer} />
		{/each}

		<!-- Heavy Corruption Blocks (including shatter-like fragments) -->
		{#each corruptionLayers as layer}
			<Rectangle {...layer} />
		{/each}

		<!-- Rapid Signal-Loss Flash -->
		<Rectangle
			x={0}
			y={((jitterSeed * 17) % 1) * canvasSizes.height}
			width={canvasSizes.width}
			height={1 + jitterSeed * 15}
			backgroundColor={THEME_COLORS.softHighlight}
			backgroundAlpha={0.34 * $progress}
		/>
	</Container>
{/if}
