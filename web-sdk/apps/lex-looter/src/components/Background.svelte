<script lang="ts">
	import { Rectangle, SpriteSheet } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();
	const backgroundProps = $derived({
		x: context.stateLayoutDerived.canvasSizes().width * 0.5,
		y: context.stateLayoutDerived.canvasSizes().height * 0.5,
		width: context.stateLayoutDerived.canvasSizes().width,
		height: context.stateLayoutDerived.canvasSizes().height,
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
	<SpriteSheet key="baseBackground" {...backgroundProps} anchor={0.5} animationSpeed={0.4} play loop />
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
