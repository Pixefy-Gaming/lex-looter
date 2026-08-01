<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const canvasRatio = $derived(canvasSizes.width / Math.max(canvasSizes.height, 1));
	const isPopoutS = $derived(
		context.stateLayoutDerived.layoutType() === 'landscape' &&
			canvasSizes.width <= 500 &&
			canvasSizes.height <= 260 &&
			canvasRatio >= 1.55,
	);
	const isPopoutL = $derived(
		context.stateLayoutDerived.layoutType() === 'landscape' &&
			canvasSizes.width > 500 &&
			canvasSizes.width <= 900 &&
			canvasSizes.height <= 520 &&
			canvasRatio >= 1.55,
	);
	const boardScale = $derived(isPopoutS ? 1.1 : isPopoutL ? 1.14 : 1);
	const boardX = $derived(context.stateGameDerived.boardLayout().x);
	const boardY = $derived(
		context.stateGameDerived.boardLayout().y + (isPopoutS ? 60 : isPopoutL ? 52 : 0),
	);
</script>

<Container
	x={boardX}
	y={boardY}
	pivot={context.stateGameDerived.boardLayout().pivot}
	scale={boardScale}
>
	{@render props.children()}
</Container>
