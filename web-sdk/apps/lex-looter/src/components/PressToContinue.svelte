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
</script>

<MainContainer alignVertical="bottom">
	<Container x={mainLayout.width * 0.5} y={mainLayout.height - 34}>
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
