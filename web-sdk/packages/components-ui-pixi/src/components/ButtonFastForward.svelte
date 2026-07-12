<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import UiButton from './UiButton.svelte';
	import { UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(context.stateXstateDerived.isIdle() || stateBet.isSpaceHold);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'skipLexPlayback' });
	};
</script>

<UiButton {...props} {sizes} {onpress} {disabled} icon="fastForward" />
