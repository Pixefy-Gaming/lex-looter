<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { Rectangle, SpriteSheet } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();
	const backgroundBlur = new PIXI.BlurFilter({ strength: 6, quality: 4 });
	const BACKGROUND_BLUR_OVERSCAN = 24;
	const backgroundProps = $derived({
		x: context.stateLayoutDerived.canvasSizes().width * 0.5,
		y: context.stateLayoutDerived.canvasSizes().height * 0.5,
		width: context.stateLayoutDerived.canvasSizes().width + BACKGROUND_BLUR_OVERSCAN * 2,
		height: context.stateLayoutDerived.canvasSizes().height + BACKGROUND_BLUR_OVERSCAN * 2,
	});
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
		filters={[backgroundBlur]}
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
		filters={[backgroundBlur]}
		play
		loop
	/>
</FadeContainer>
