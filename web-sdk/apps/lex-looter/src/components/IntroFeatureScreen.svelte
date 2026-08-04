<script lang="ts">
	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import type { Graphics as PixiGraphics } from 'pixi.js';
	import { ResponsiveText } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		oncontinue: () => void;
	};

	type FeatureCard = {
		title: string;
		body: string;
		accent: number;
		icon: 'bonus' | 'wild' | 'max';
	};

	const props: Props = $props();
	const context = getContext();
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const layoutType = $derived(context.stateLayoutDerived.layoutType());

	const cards: FeatureCard[] = [
		{
			title: 'BUILD VALUE',
			body: 'LEX BOUNCES ADD TUMBLE VALUE\nCORNER CHESTS REFRESH EACH BOUNCE',
			accent: 0x00ff50,
			icon: 'bonus',
		},
		{
			title: 'OBJECTS',
			body: 'COLLECT COINS, GEMS, CHESTS AND HEARTS\nWATCH SLAYER AND BLUE BLOB',
			accent: 0x8a2cff,
			icon: 'wild',
		},
		{
			title: 'FEATURE MODES',
			body: 'EXTRA LIFE, START CLONE, LUCKY LEX\nMAX WIN UP TO 4,500x',
			accent: 0xffd24a,
			icon: 'max',
		},
	];

	const isPortrait = $derived(layoutType === 'portrait' || canvasSizes.height > canvasSizes.width);
	const isPopout = $derived(!isPortrait && canvasSizes.width <= 800);
	const contentWidth = $derived(
		isPortrait ? Math.min(mainLayout.width * 0.78, 620) : Math.min(mainLayout.width * 0.82, 1120),
	);
	const cardGap = $derived(isPortrait ? 26 : isPopout ? 24 : 30);
	const cardWidth = $derived(isPortrait ? contentWidth : (contentWidth - cardGap * 2) / 3);
	const cardHeight = $derived(
		isPortrait
			? Math.min(270, Math.max(235, mainLayout.height * 0.18))
			: isPopout
				? 250
				: Math.min(292, Math.max(258, mainLayout.height * 0.32)),
	);
	const cardsStartX = $derived(isPortrait ? 0 : -contentWidth / 2 + cardWidth / 2);
	const cardsStartY = $derived(isPortrait ? 430 : 360);
	const cardStepX = $derived(cardWidth + cardGap);
	const cardStepY = $derived(cardHeight + (isPortrait ? 30 : 0));
	const logoWidth = $derived(
		isPortrait ? Math.min(260, Math.max(210, mainLayout.width * 0.33)) : isPopout ? 170 : 250,
	);
	const logoHeight = $derived(logoWidth * (568 / 833));
	const logoY = $derived(isPortrait ? 165 : isPopout ? 112 : 125);
	const iconY = $derived(isPortrait ? -36 : -46);
	const titleY = $derived(isPortrait ? 42 : 50);
	const bodyY = $derived(isPortrait ? cardHeight / 2 - 44 : cardHeight / 2 - 42);
	const titleSize = $derived(isPortrait ? 46 : isPopout ? 42 : 48);
	const bodySize = $derived(isPortrait ? 22 : isPopout ? 19 : 21);
	const maxWinSize = $derived(isPortrait ? 72 : isPopout ? 70 : 78);
	const iconScale = $derived(isPortrait ? 1.12 : isPopout ? 0.98 : 1.08);
	let idleTime = $state(0);
	const cardIdleOffset = (index: number) => Math.sin(idleTime * 0.0026 + index * 0.85) * 5;
	const cardIdleScale = (index: number) =>
		1 + (Math.sin(idleTime * 0.0026 + index * 0.85) + 1) * 0.006;

	$effect(() => {
		let rafId = 0;
		const tick = (time: number) => {
			idleTime = time;
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	const drawCard = (g: PixiGraphics, card: FeatureCard) => {
		g.clear();
		g.lineStyle(3, card.accent, 0.95);
		g.beginFill(0x06130d, 0.93);
		g.drawRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);
		g.endFill();

		g.lineStyle(0);
		g.beginFill(card.accent, 0.88);
		g.drawRect(-cardWidth / 2, -cardHeight / 2, cardWidth, 14);
		g.drawRect(-cardWidth / 2, cardHeight / 2 - 14, cardWidth, 14);
		g.endFill();

		g.beginFill(0xffffff, 0.15);
		g.drawRect(-cardWidth / 2 + 14, -cardHeight / 2 + 26, cardWidth - 28, 2);
		g.endFill();
	};
</script>

<MainContainer>
	<Sprite
		key="logo.png"
		x={mainLayout.width * 0.5}
		y={logoY}
		width={logoWidth}
		height={logoHeight}
		anchor={0.5}
	/>

	{#each cards as card, index}
		<Container
			x={mainLayout.width * 0.5 + cardsStartX + (isPortrait ? 0 : index * cardStepX)}
			y={cardsStartY + (isPortrait ? index * cardStepY : 0) + cardIdleOffset(index)}
			scale={cardIdleScale(index)}
		>
			<Graphics draw={(g) => drawCard(g, card)} />

			{#if card.icon === 'bonus'}
				<Container y={iconY} scale={iconScale}>
					<Sprite key="cloneClover.png" x={-58} width={70} height={70} anchor={0.5} />
					<Sprite key="cloneClover.png" y={-12} width={86} height={86} anchor={0.5} />
					<Sprite key="cloneClover.png" x={58} width={70} height={70} anchor={0.5} />
				</Container>
			{:else if card.icon === 'wild'}
				<Container y={iconY} scale={iconScale}>
					<Sprite key="coin.png" x={-74} y={5} width={58} height={58} anchor={0.5} />
					<Sprite key="chest.png" width={92} height={92} anchor={0.5} />
					<Sprite key="diamond.png" x={74} y={5} width={58} height={58} anchor={0.5} />
				</Container>
			{:else}
				<Container y={iconY + 4}>
					<ResponsiveText
						anchor={0.5}
						text="4,500x"
						maxWidth={cardWidth * 0.78}
						style={{
							fontFamily: 'Jersey 25',
							fontSize: maxWinSize,
							fontWeight: '900',
							fill: 0xffd24a,
							stroke: { color: 0x101000, width: 5 },
							align: 'center',
							letterSpacing: 0,
						}}
					/>
				</Container>
			{/if}

			<ResponsiveText
				anchor={0.5}
				y={titleY}
				text={card.title}
				maxWidth={cardWidth * 0.82}
				style={{
					fontFamily: 'Jersey 25',
					fontSize: titleSize,
					fontWeight: '900',
					fill: card.accent,
					stroke: { color: 0x00140b, width: 4 },
					align: 'center',
					letterSpacing: 0,
				}}
			/>
			<ResponsiveText
				anchor={0.5}
				y={bodyY}
				text={card.body}
				maxWidth={cardWidth * 0.82}
				style={{
					fontFamily: 'Jersey 25',
					fontSize: bodySize,
					fontWeight: '900',
					fill: 0xffffff,
					stroke: { color: 0x000000, width: 2 },
					align: 'center',
					letterSpacing: 0,
				}}
			/>
		</Container>
	{/each}
</MainContainer>

<PressToContinue onpress={props.oncontinue} />
