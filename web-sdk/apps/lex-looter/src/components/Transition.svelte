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

	type TransitionProfile = {
		scanlineSpacing: number;
		spectralCount: number;
		spectralOffset: number;
		spectralHeight: number;
		corruptionCount: number;
		corruptionWidth: number;
		corruptionHeight: number;
		glassCount: number;
		glassMinWidth: number;
		glassMaxWidth: number;
		glassMinHeight: number;
		glassMaxHeight: number;
		alphaScale: number;
		flashHeight: number;
	};

	const getTransitionProfile = (width: number, height: number): TransitionProfile => {
		const portrait = height > width;

		if (width <= 320) {
			return {
				scanlineSpacing: 10,
				spectralCount: 20,
				spectralOffset: 52,
				spectralHeight: 5,
				corruptionCount: 9,
				corruptionWidth: 56,
				corruptionHeight: 34,
				glassCount: 4,
				glassMinWidth: 64,
				glassMaxWidth: 180,
				glassMinHeight: 52,
				glassMaxHeight: 150,
				alphaScale: 0.72,
				flashHeight: 7,
			};
		}

		if (portrait && width <= 375) {
			return {
				scanlineSpacing: 9,
				spectralCount: 24,
				spectralOffset: 62,
				spectralHeight: 6,
				corruptionCount: 11,
				corruptionWidth: 64,
				corruptionHeight: 40,
				glassCount: 5,
				glassMinWidth: 76,
				glassMaxWidth: 220,
				glassMinHeight: 60,
				glassMaxHeight: 180,
				alphaScale: 0.76,
				flashHeight: 8,
			};
		}

		if (portrait && width >= 390 && width <= 425 && height >= 760) {
			return {
				scanlineSpacing: 7,
				spectralCount: 34,
				spectralOffset: 84,
				spectralHeight: 8,
				corruptionCount: 16,
				corruptionWidth: 86,
				corruptionHeight: 56,
				glassCount: 8,
				glassMinWidth: 96,
				glassMaxWidth: 300,
				glassMinHeight: 82,
				glassMaxHeight: 260,
				alphaScale: 0.86,
				flashHeight: 10,
			};
		}

		if (portrait && width <= 425) {
			return {
				scanlineSpacing: 8,
				spectralCount: 28,
				spectralOffset: 72,
				spectralHeight: 7,
				corruptionCount: 13,
				corruptionWidth: 72,
				corruptionHeight: 48,
				glassCount: 6,
				glassMinWidth: 88,
				glassMaxWidth: 260,
				glassMinHeight: 72,
				glassMaxHeight: 220,
				alphaScale: 0.8,
				flashHeight: 9,
			};
		}

		if (width <= 400 && height <= 300) {
			return {
				scanlineSpacing: 9,
				spectralCount: 18,
				spectralOffset: 48,
				spectralHeight: 5,
				corruptionCount: 8,
				corruptionWidth: 52,
				corruptionHeight: 28,
				glassCount: 3,
				glassMinWidth: 60,
				glassMaxWidth: 170,
				glassMinHeight: 42,
				glassMaxHeight: 110,
				alphaScale: 0.68,
				flashHeight: 6,
			};
		}

		if (width <= 800 && height <= 500) {
			return {
				scanlineSpacing: 8,
				spectralCount: 34,
				spectralOffset: 96,
				spectralHeight: 8,
				corruptionCount: 15,
				corruptionWidth: 90,
				corruptionHeight: 56,
				glassCount: 7,
				glassMinWidth: 100,
				glassMaxWidth: 320,
				glassMinHeight: 80,
				glassMaxHeight: 220,
				alphaScale: 0.84,
				flashHeight: 10,
			};
		}

		if (width <= 1024 && height <= 650) {
			return {
				scanlineSpacing: 7,
				spectralCount: 44,
				spectralOffset: 140,
				spectralHeight: 10,
				corruptionCount: 20,
				corruptionWidth: 120,
				corruptionHeight: 68,
				glassCount: 9,
				glassMinWidth: 120,
				glassMaxWidth: 420,
				glassMinHeight: 88,
				glassMaxHeight: 280,
				alphaScale: 0.92,
				flashHeight: 12,
			};
		}

		return {
			scanlineSpacing: 6,
			spectralCount: 60,
			spectralOffset: 200,
			spectralHeight: 12,
			corruptionCount: 25,
			corruptionWidth: 150,
			corruptionHeight: 80,
			glassCount: 12,
			glassMinWidth: 150,
			glassMaxWidth: 600,
			glassMinHeight: 100,
			glassMaxHeight: 400,
			alphaScale: 1,
			flashHeight: 15,
		};
	};

	const transitionProfile = $derived(getTransitionProfile(canvasSizes.width, canvasSizes.height));

	// Scanline Layer: Subtle horizontal texture
	const scanlines = $derived.by(() => {
		const p = $progress;
		if (p <= 0.05) return [];
		const layers = [];
		const spacing = transitionProfile.scanlineSpacing;
		const count = Math.floor(canvasSizes.height / spacing);
		for (let i = 0; i < count; i += 2) {
			layers.push({
				x: 0,
				y: i * spacing,
				width: canvasSizes.width,
				height: 1,
				backgroundColor: THEME_COLORS.boardShadow,
				backgroundAlpha: 0.18 * p * transitionProfile.alphaScale,
			});
		}
		return layers;
	});
	const spectralLayers = $derived.by(() => {
		const p = $progress;
		if (p <= 0.02) return [];

		const layers = [];
		const count = Math.floor(transitionProfile.spectralCount * p);
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed + i * 0.17) % 1;
			const color = GLITCH_COLORS[i % GLITCH_COLORS.length];

			// Very wide, very thin horizontal "slices"
			const w = canvasSizes.width * (0.4 + s * 0.8);
			const h = 1 + s * transitionProfile.spectralHeight;

			layers.push({
				x: (canvasSizes.width - w) * 0.5 + (s - 0.5) * transitionProfile.spectralOffset * p,
				y: ((s * 13) % 1) * canvasSizes.height - h * 0.5,
				width: w,
				height: h,
				backgroundColor: color,
				backgroundAlpha: (0.12 + s * 0.4) * p * transitionProfile.alphaScale,
			});
		}
		return layers;
	});

	// Corrupted Signal Layer: Dense primary blocks
	const corruptionLayers = $derived.by(() => {
		const p = $progress;
		if (p <= 0.1) return [];

		const layers = [];
		const count = transitionProfile.corruptionCount;
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed + i * 0.11) % 1;
			const w =
				(s > 0.5 ? 40 + s * transitionProfile.corruptionWidth : canvasSizes.width * 0.6) * p * 1.5;
			const h = s > 0.5 ? canvasSizes.height * 0.2 : 5 + s * transitionProfile.corruptionHeight;
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
				backgroundAlpha: 0.4 * p * transitionProfile.alphaScale,
			});
		}
		return layers;
	});

	// Glass Shard Layer: Frosted semi-transparent "panes" and "glares"
	const glassPanes = $derived.by(() => {
		const p = $progress;
		if (p <= 0.05) return [];

		const layers = [];
		const count = transitionProfile.glassCount;
		for (let i = 0; i < count; i++) {
			const s = (jitterSeed * (i + 13)) % 1;
			const w = transitionProfile.glassMinWidth + s * transitionProfile.glassMaxWidth;
			const h = transitionProfile.glassMinHeight + s * transitionProfile.glassMaxHeight;

			// Main glass pane
			layers.push({
				x: ((s * 43) % 1) * canvasSizes.width - w * 0.5,
				y: ((s * 31) % 1) * canvasSizes.height - h * 0.5,
				width: w,
				height: h,
				backgroundColor: THEME_COLORS.softHighlight,
				backgroundAlpha: 0.1 * p * transitionProfile.alphaScale,
				borderColor: THEME_COLORS.lexGreen,
				borderWidth: 1.5,
				borderAlpha: 0.3 * p * transitionProfile.alphaScale,
				borderRadius: 2,
			});

			if (i % 3 === 0) {
				layers.push({
					x: ((s * 17) % 1) * canvasSizes.width - w * 0.3,
					y: ((s * 29) % 1) * canvasSizes.height,
					width: w * 0.9,
					height: 2,
					backgroundColor: THEME_COLORS.coinGold,
					backgroundAlpha: 0.42 * p * transitionProfile.alphaScale,
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
			height={1 + jitterSeed * transitionProfile.flashHeight}
			backgroundColor={THEME_COLORS.softHighlight}
			backgroundAlpha={0.34 * $progress * transitionProfile.alphaScale}
		/>
	</Container>
{/if}
