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
	const boardScale = $derived(isPopoutS ? 1.1 : 1);
	const boardY = $derived(context.stateGameDerived.boardLayout().y + (isPopoutS ? 60 : 0));
</script>

<Container
	x={context.stateGameDerived.boardLayout().x}
	y={boardY}
	pivot={context.stateGameDerived.boardLayout().pivot}
	scale={boardScale}
>
	{@render props.children()}
</Container>
