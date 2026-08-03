<script lang="ts">
	import { Rectangle, SpriteSheet } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();
	const BACKGROUND_RATIO = 800 / 436;
	const BACKGROUND_BLUR_OVERSCAN = 120;
	const backgroundProps = $derived(
		getCoverBackgroundProps(context.stateLayoutDerived.canvasSizes()),
	);

	function getCoverBackgroundProps(canvasSizes: { width: number; height: number }) {
		const targetWidth = canvasSizes.width + BACKGROUND_BLUR_OVERSCAN * 2;
		const targetHeight = canvasSizes.height + BACKGROUND_BLUR_OVERSCAN * 2;
		const targetRatio = targetWidth / Math.max(targetHeight, 1);
		const backgroundWidth =
			targetRatio > BACKGROUND_RATIO ? targetWidth : targetHeight * BACKGROUND_RATIO;
		const backgroundHeight =
			targetRatio > BACKGROUND_RATIO ? targetWidth / BACKGROUND_RATIO : targetHeight;

		return {
			x: canvasSizes.width * 0.5,
			y: canvasSizes.height * 0.5,
			width: backgroundWidth,
			height: backgroundHeight,
		};
	}
	const activateBonusSelected = $derived(
		!['BASE', 'base', undefined].includes(stateBet.activeBetModeKey),
	);
	const showActivateBackground = $derived(
		context.stateLayout.showLoadingScreen ||
			context.stateGame.gameType === 'freegame' ||
			activateBonusSelected,
	);
	const showBaseBackground = $derived(
		!context.stateLayout.showLoadingScreen &&
			context.stateGame.gameType === 'basegame' &&
			!activateBonusSelected,
	);
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	<SpriteSheet
		key="baseBackground"
		{...backgroundProps}
		anchor={0.5}
		animationSpeed={0.4}
		play
		loop
	/>
</FadeContainer>

<FadeContainer show={showActivateBackground} duration={SECOND} zIndex={-1}>
	<SpriteSheet
		key="activateBackground"
		{...backgroundProps}
		anchor={0.5}
		animationSpeed={0.4}
		play
		loop
	/>
</FadeContainer>
