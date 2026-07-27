<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Container } from 'pixi-svelte';
	import { ResponsiveText } from 'components-pixi';

	import { getContext } from '../game/context';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	let pulseTime = $state(0);
	const pulse = $derived((Math.sin(pulseTime * 0.0032) + 1) * 0.5);
	const pulseScale = $derived(1 + pulse * 0.025);
	const pulseAlpha = $derived(0.78 + pulse * 0.22);

	$effect(() => {
		let rafId = 0;
		const tick = (time: number) => {
			pulseTime = time;
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});
</script>

<MainContainer alignVertical="bottom">
	<Container
		x={mainLayout.width * 0.5}
		y={mainLayout.height - 56}
		scale={pulseScale}
		alpha={pulseAlpha}
	>
		<ResponsiveText
			anchor={{ x: 0.5, y: 1 }}
			text="PRESS ANYWHERE TO CONTINUE"
			maxWidth={mainLayout.width * 0.86}
			style={{
				fontFamily: 'Jersey 25',
				fontSize: 22,
				fontWeight: '900',
				fill: 0xffffff,
				stroke: { color: 0x000000, width: 1 },
				align: 'center',
				letterSpacing: 0,
			}}
		/>
	</Container>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
