<script lang="ts">
	import { Container, Graphics, Sprite, SpriteSheet } from 'pixi-svelte';
	import type { Graphics as PixiGraphics } from 'pixi.js';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import Transition from './Transition.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const LOGO_WIDTH = 500;
	const LOGO_HEIGHT = 395;

	let loadingType = $state<'start' | 'transition'>('start');
	let smoothProgress = $state(0);
	const targetProgress = $derived(
		context.stateApp.loaded ? 1 : Math.max(0, Math.min(1, context.stateApp.loadingProgress / 100)),
	);

	$effect(() => {
		let rafId: number;
		const update = () => {
			if (smoothProgress < targetProgress) {
				smoothProgress = Math.min(smoothProgress + 0.005, targetProgress);
			} else if (smoothProgress > targetProgress) {
				smoothProgress = targetProgress;
			}

			if (smoothProgress < 1 || !context.stateApp.loaded) {
				rafId = requestAnimationFrame(update);
			}
		};
		rafId = requestAnimationFrame(update);
		return () => cancelAnimationFrame(rafId);
	});

	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const barWidth = $derived(Math.min(600, Math.max(280, mainLayout.width * 0.5)));
	const barHeight = $derived(Math.min(32, Math.max(18, mainLayout.height * 0.04)));
	const markerSize = $derived(barHeight * 2.9);
	const barY = 250;

	const COLOR_BASE = 0xb9ffd2;
	const COLOR_PROGRESS = 0x00ff50;
	const COLOR_BORDER = 0x06351b;

	const drawProgressBar = (g: PixiGraphics) => {
		g.clear();
		g.lineStyle(3, COLOR_BORDER, 0.9);
		g.beginFill(COLOR_BASE);
		g.drawRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2);
		g.endFill();

		if (smoothProgress > 0.01) {
			g.beginFill(COLOR_PROGRESS);
			g.drawRoundedRect(
				-barWidth / 2 + 3,
				-barHeight / 2 + 3,
				(barWidth - 6) * smoothProgress,
				barHeight - 6,
				(barHeight - 6) / 2,
			);
			g.endFill();
		}
	};

	const markerScale = $derived(markerSize / 469);
</script>

<!-- loading progress -->
<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.5}
		>
			<SpriteSheet
				key="logoLex"
				y={-110}
				width={LOGO_WIDTH}
				height={LOGO_HEIGHT}
				anchor={0.5}
				animationSpeed={1}
				play
				loop={false}
			/>
			{#if !context.stateApp.loaded}
				<Container y={barY}>
					<Graphics draw={drawProgressBar} />
					<Container x={-barWidth / 2 + barWidth * smoothProgress}>
						<Sprite key="cloneClover.png" anchor={0.5} scale={markerScale} />
					</Container>
				</Container>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'transition')} />
</FadeContainer>

<!-- transition between the loading screen and the game -->
<FadeContainer show={loadingType === 'transition'}>
	<Transition autoplay oncomplete={props.onloaded} />
</FadeContainer>
