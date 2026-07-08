<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { BOARD_SIZES } from '../game/constants';
	import {
		CANVAS_HEIGHT,
		CANVAS_WIDTH,
		notationToPixelCenter,
		type PixelPoint,
	} from '../game/notation';
	import type { LexCornerKey, LexObjectName } from '../game/typesBookEvent';

	type Props = {
		betAmount?: number;
		highMultMode?: boolean;
		noBoomActive?: boolean;
		onCornerHit?: (data: { payout: number; multiplier: number }) => void;
		onComplete?: (data: { payout: number }) => void;
	};

	const _props: Props = $props();

	const context = getContext();
	const parentCtx = getContextParent();

	const W = CANVAS_WIDTH;
	const H = CANVAS_HEIGHT;
	const CELL_SIZE = 20;
	const BALL_SIZE = 35;
	const OBJ_SIZE = 30;
	const ESCAPE_OBJ_SIZE = 44;
	const CORNER_SIZE = 58;
	const CORNER_TAB_WIDTH = 42;
	const CORNER_TAB_HEIGHT = 28;
	const MAX_BOUNCES = 40;
	const NORMAL_SPEED_PER_SECOND = 1100;
	const TURBO_SPEED_PER_SECOND = 1900;

	const LEX_ASSETS = {
		lex: '/assets/lex/runtime/lex-main.png',
		cloneBall: '/assets/lex/runtime/lex-clone.png',
		slayer: '/assets/lex/runtime/slayer.png',
		halve: '/assets/lex/runtime/blue-blob.png',
		escape: '/assets/lex/runtime/escape.png',
		cloneOrb: '/assets/lex/runtime/clone-orb.png',
		coin: '/assets/lex/runtime/coin.png',
		diamond: '/assets/lex/runtime/diamond.png',
		chest: '/assets/lex/runtime/chest.png',
		heart: '/assets/lex/runtime/heart.png',
	} as const;

	const root = new PIXI.Container();
	const hudLayer = new PIXI.Container();
	const objectLayer = new PIXI.Container();
	const ballLayer = new PIXI.Container();
	const _SCALE = Math.min(BOARD_SIZES.width / W, BOARD_SIZES.height / H);
	root.scale.set(_SCALE);
	root.x = Math.round((BOARD_SIZES.width - W * _SCALE) / 2);
	root.y = Math.round((BOARD_SIZES.height - H * _SCALE) / 2);

	const bg = new PIXI.Graphics();
	const drawBoardSurface = () => {
		bg.clear();
		bg.rect(0, 0, W, H);
		bg.fill({ color: 0x101417 });
		for (let row = 0; row < H / CELL_SIZE; row += 1) {
			for (let col = 0; col < W / CELL_SIZE; col += 1) {
				const x = col * CELL_SIZE;
				const y = row * CELL_SIZE;
				const shade = (row + col) % 2 === 0 ? 0x161b1f : 0x12171b;
				bg.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 2);
				bg.fill({ color: shade, alpha: 0.98 });
				bg.stroke({ color: 0x050708, alpha: 0.75, width: 1 });
				if ((row * 7 + col * 11) % 17 === 0) {
					bg.moveTo(x + 4, y + 12);
					bg.lineTo(x + 10, y + 8);
					bg.lineTo(x + 15, y + 13);
					bg.stroke({ color: 0x2a3035, alpha: 0.45, width: 1 });
				}
			}
		}
		bg.rect(0, 0, W, H);
		bg.stroke({ color: 0xffffff, alpha: 0.9, width: 2 });
	};
	drawBoardSurface();
	root.addChild(bg);

	type CornerState = {
		key: LexCornerKey;
		boxX: number;
		boxY: number;
		gfx: PIXI.Graphics;
		chest: PIXI.Graphics;
		label: PIXI.Text;
	};

	const cornerStates: CornerState[] = [
		{ key: 'tl', boxX: 0, boxY: 0 },
		{ key: 'tr', boxX: W - CORNER_SIZE, boxY: 0 },
		{ key: 'bl', boxX: 0, boxY: H - CORNER_SIZE },
		{ key: 'br', boxX: W - CORNER_SIZE, boxY: H - CORNER_SIZE },
	].map((corner) => {
		const gfx = new PIXI.Graphics();
		const chest = new PIXI.Graphics();
		const label = new PIXI.Text({
			text: 'NONE',
			style: { fill: 0x07110b, fontSize: 15, fontWeight: '900' },
		});
		label.anchor.set(0.5);
		root.addChild(gfx);
		root.addChild(chest);
		root.addChild(label);
		return { ...corner, gfx, chest, label };
	});

	const logoText = new PIXI.Text({
		text: 'LEX\nLOOTER',
		style: {
			fill: 0x00ff4a,
			fontSize: 42,
			fontWeight: '900',
			lineHeight: 34,
			align: 'center',
			stroke: { color: 0x5e00a8, width: 5 },
			dropShadow: { color: 0x000000, distance: 3, blur: 2, alpha: 0.8 },
		},
	});
	logoText.anchor.set(0.5);
	logoText.rotation = -0.08;
	logoText.x = 145;
	logoText.y = -42;
	hudLayer.addChild(logoText);

	const valueText = new PIXI.Text({
		text: '$0.00',
		style: {
			fill: 0xffffff,
			fontSize: 34,
			fontWeight: '900',
			stroke: { color: 0x000000, width: 4 },
		},
	});
	valueText.anchor.set(0.5, 0);
	valueText.x = W / 2;
	valueText.y = -62;
	hudLayer.addChild(valueText);

	const stealthPill = new PIXI.Graphics();
	hudLayer.addChild(stealthPill);

	const bounceText = new PIXI.Text({
		text: `0 / ${MAX_BOUNCES} STEALTH`,
		style: {
			fill: 0xffffff,
			fontSize: 19,
			fontWeight: '900',
			stroke: { color: 0x000000, width: 3 },
		},
	});
	bounceText.anchor.set(0.5, 0);
	bounceText.x = W / 2;
	bounceText.y = -21;
	hudLayer.addChild(bounceText);

	const metaText = new PIXI.Text({
		text: '',
		style: { fill: 0xffffff, fontSize: 12, fontWeight: 'bold' },
	});
	metaText.anchor.set(0.5, 0);
	metaText.x = W / 2;
	metaText.y = 6;
	hudLayer.addChild(metaText);

	root.addChild(objectLayer);
	root.addChild(ballLayer);
	root.addChild(hudLayer);

	const heartHud = [0, 1, 2].map((index) => {
		const heart = new PIXI.Text({
			text: '♥',
			style: {
				fill: 0xff2738,
				fontSize: 34,
				fontWeight: '900',
				stroke: { color: 0xffffff, width: 3 },
			},
		});
		heart.anchor.set(0.5);
		heart.x = W / 2 + 145 + index * 40;
		heart.y = -38;
		hudLayer.addChild(heart);
		return heart;
	});

	let app: PIXI.Application | undefined;
	let textures: Partial<Record<keyof typeof LEX_ASSETS, PIXI.Texture>> = {};
	let mainBall: PIXI.Sprite | PIXI.Graphics | undefined;
	let cloneDisplays: Record<
		string,
		{
			display: PIXI.Sprite | PIXI.Graphics;
			currentPathKey: string;
			pathTargets: PixelPoint[];
		}
	> = {};
	let objectContainers: Record<string, PIXI.Container> = {};
	let renderedRoundSerial = 0;
	let currentPathKey = '';
	let pathTargets: PixelPoint[] = [];

	const formatMoney = (amount: number) => `$${(amount / 100).toFixed(2)}`;

	const smoothTexture = (texture: PIXI.Texture | undefined) => {
		if (!texture) return;
		const source = texture.source as { scaleMode?: string } | undefined;
		if (source) source.scaleMode = 'linear';
	};

	const setDisplayCenter = (display: PIXI.Sprite | PIXI.Graphics, point: PixelPoint) => {
		display.x = point.x - display.width / 2;
		display.y = point.y - display.height / 2;
	};

	const getDisplayCenter = (display: PIXI.Sprite | PIXI.Graphics): PixelPoint => {
		return {
			x: display.x + display.width / 2,
			y: display.y + display.height / 2,
		};
	};

	const updateBounceText = () => {
		bounceText.text = `${Math.min(context.stateGame.lex.mainBounces, MAX_BOUNCES)} / ${MAX_BOUNCES} STEALTH`;
	};

	const updateHud = () => {
		stealthPill.clear();
		stealthPill.roundRect(W / 2 - 78, -28, 156, 40, 20);
		stealthPill.fill({ color: 0x151515, alpha: 0.95 });
		stealthPill.stroke({ color: 0x00ff4a, width: 2, alpha: 0.95 });
		const shieldCount = Math.min(context.stateGame.lex.shieldCount, heartHud.length);
		heartHud.forEach((heart, index) => {
			heart.alpha = index < shieldCount ? 1 : 0.35;
			heart.style.fill = index < shieldCount ? 0xff2738 : 0xffffff;
		});
	};

	const drawCorner = (corner: CornerState, multiplier: number | null) => {
		let fillColor = 0x20242a;
		let textColor = 0x444444;
		let text = 'NONE';

		if (multiplier !== null) {
			text = `${multiplier}x`;
			if (multiplier >= 5) {
				fillColor = 0x00ff4a;
				textColor = 0x031009;
			} else if (multiplier >= 2) {
				fillColor = 0x00ff4a;
				textColor = 0x031009;
			} else {
				fillColor = 0xd66b83;
				textColor = 0x18040a;
			}
		}

		const isRight = corner.key === 'tr' || corner.key === 'br';
		const tabX = isRight ? W : -CORNER_TAB_WIDTH;
		const tabY = corner.key === 'tl' || corner.key === 'tr' ? 0 : H - CORNER_TAB_HEIGHT;
		const chestX = isRight ? W - 30 : 30;
		const chestY = corner.key === 'tl' || corner.key === 'tr' ? 20 : H - 20;

		corner.gfx.clear();
		corner.gfx.rect(tabX, tabY, CORNER_TAB_WIDTH, CORNER_TAB_HEIGHT);
		corner.gfx.fill({ color: fillColor, alpha: 0.95 });
		corner.gfx.stroke({ color: 0x080808, width: 2 });
		corner.label.text = text;
		corner.label.style.fill = textColor;
		corner.label.x = tabX + CORNER_TAB_WIDTH / 2;
		corner.label.y = tabY + CORNER_TAB_HEIGHT / 2;

		corner.chest.clear();
		corner.chest.roundRect(chestX - 16, chestY - 12, 32, 24, 2);
		corner.chest.fill({ color: 0x8a4c1e, alpha: 0.96 });
		corner.chest.stroke({ color: 0xffc36a, width: 2, alpha: 0.8 });
		corner.chest.rect(chestX - 14, chestY - 4, 28, 5);
		corner.chest.fill({ color: 0x4b2a12, alpha: 0.9 });
		corner.chest.rect(chestX - 3, chestY - 11, 6, 22);
		corner.chest.fill({ color: 0xffd06a, alpha: 0.75 });
	};

	const fitSprite = (sprite: PIXI.Sprite, maxWidth: number, maxHeight: number) => {
		const scale = Math.min(maxWidth / sprite.texture.width, maxHeight / sprite.texture.height);
		sprite.width = sprite.texture.width * scale;
		sprite.height = sprite.texture.height * scale;
	};

	const createFallbackBall = (color: number) => {
		const ball = new PIXI.Graphics();
		ball.circle(BALL_SIZE / 2, BALL_SIZE / 2, BALL_SIZE / 2);
		ball.fill({ color });
		return ball;
	};

	const createBall = (isClone: boolean, notation = context.stateGame.lex.lexNotation) => {
		const texture = isClone ? textures.cloneBall : textures.lex;
		const ball = texture
			? new PIXI.Sprite(texture)
			: createFallbackBall(isClone ? 0x00e701 : 0xffffff);
		if (ball instanceof PIXI.Sprite) {
			smoothTexture(ball.texture);
			fitSprite(ball, BALL_SIZE, BALL_SIZE);
		}
		ball.alpha = isClone ? 0.9 : 1;
		setDisplayCenter(ball, notationToPixelCenter(notation));
		ballLayer.addChild(ball);
		return ball;
	};

	const objectStyle: Record<LexObjectName, { color: number; label: string }> = {
		coin: { color: 0xffd24a, label: '+$' },
		diamond: { color: 0x4dffb8, label: '5x' },
		blue_blob: { color: 0x4aa3ff, label: '-50%' },
		chest: { color: 0xb87836, label: 'CHEST' },
		escape: { color: 0xc28a4b, label: 'EXIT' },
		slayer: { color: 0xff3d3d, label: 'SLAYER' },
		clone_orb: { color: 0x00e701, label: 'CLONE' },
		heart: { color: 0xff5a7a, label: 'HEART' },
	};

	const createObjectContainer = (object: LexObjectName) => {
		const container = new PIXI.Container();
		const texture =
			object === 'coin'
				? textures.coin
				: object === 'diamond'
					? textures.diamond
					: object === 'chest'
						? textures.chest
						: object === 'heart'
							? textures.heart
							: object === 'slayer'
								? textures.slayer
								: object === 'blue_blob'
									? textures.halve
									: object === 'escape'
										? textures.escape
										: object === 'clone_orb'
											? textures.cloneOrb
											: undefined;

		if (texture) {
			smoothTexture(texture);
			const sprite = new PIXI.Sprite(texture);
			sprite.anchor.set(0.5);
			const spriteSize = object === 'escape' || object === 'slayer' ? ESCAPE_OBJ_SIZE : OBJ_SIZE;
			fitSprite(sprite, spriteSize, spriteSize);
			container.addChild(sprite);
			return container;
		}

		const style = objectStyle[object];
		const gfx = new PIXI.Graphics();
		gfx.roundRect(-OBJ_SIZE / 2, -OBJ_SIZE / 2, OBJ_SIZE, OBJ_SIZE, 6);
		gfx.fill({ color: style.color, alpha: 0.95 });
		gfx.stroke({ color: 0xffffff, alpha: 0.45, width: 2 });
		container.addChild(gfx);

		const label = new PIXI.Text({
			text: style.label,
			style: { fill: 0x07141d, fontSize: style.label.length > 4 ? 8 : 12, fontWeight: 'bold' },
		});
		label.anchor.set(0.5);
		container.addChild(label);
		return container;
	};

	const setObjectPosition = (container: PIXI.Container, notation: string, x: number, y: number) => {
		const point = notation ? notationToPixelCenter(notation) : { x: x * W, y: y * H };
		container.x = point.x;
		container.y = point.y;
	};

	const renderObjects = () => {
		const activeObjects = context.stateGame.lex.activeObjects;
		for (const objectId of Object.keys(objectContainers)) {
			if (!activeObjects[objectId]) {
				objectContainers[objectId].destroy({ children: true });
				delete objectContainers[objectId];
			}
		}

		for (const activeObject of Object.values(activeObjects)) {
			let container = objectContainers[activeObject.objectId];
			if (!container) {
				container = createObjectContainer(activeObject.object);
				objectContainers[activeObject.objectId] = container;
				objectLayer.addChild(container);
			}
			container.alpha = activeObject.resolved ? 0.15 : 1;
			container.scale.set(activeObject.resolved ? 1.35 : 1);
			setObjectPosition(container, activeObject.notation, activeObject.x, activeObject.y);
		}
	};

	const renderBalls = () => {
		if (renderedRoundSerial !== context.stateGame.lex.roundSerial) {
			renderedRoundSerial = context.stateGame.lex.roundSerial;
			currentPathKey = '';
			pathTargets = [];
			mainBall?.destroy();
			mainBall = undefined;
			for (const clone of Object.values(cloneDisplays)) clone.display.destroy();
			cloneDisplays = {};
		}

		if (context.stateGame.lex.mainAlive) {
			if (!mainBall) mainBall = createBall(false);
			if (pathTargets.length === 0) {
				setDisplayCenter(mainBall, notationToPixelCenter(context.stateGame.lex.lexNotation));
			}
		} else if (mainBall) {
			mainBall.destroy();
			mainBall = undefined;
		}

		const clones = context.stateGame.lex.clones;
		for (const cloneId of Object.keys(cloneDisplays)) {
			if (!clones[cloneId]) {
				cloneDisplays[cloneId].display.destroy();
				delete cloneDisplays[cloneId];
			}
		}
		for (const clone of Object.values(clones)) {
			if (!cloneDisplays[clone.id]) {
				cloneDisplays[clone.id] = {
					display: createBall(true, clone.notation),
					currentPathKey: '',
					pathTargets: [],
				};
			}
		}
	};

	const queueLexPath = () => {
		const path = context.stateGame.lex.lexPath?.length
			? context.stateGame.lex.lexPath
			: [context.stateGame.lex.lexNotation];
		const pathKey = `${context.stateGame.lex.roundSerial}:${path.join('>')}`;
		if (pathKey === currentPathKey) return;

		currentPathKey = pathKey;
		const targets = path.map((notation) => notationToPixelCenter(notation));
		if (!mainBall) {
			pathTargets = targets;
			return;
		}

		const currentCenter = getDisplayCenter(mainBall);
		pathTargets = targets.filter((target, index) => {
			if (index > 0) return true;
			return Math.hypot(target.x - currentCenter.x, target.y - currentCenter.y) > 1;
		});
	};

	const queueClonePaths = () => {
		for (const clone of Object.values(context.stateGame.lex.clones)) {
			const cloneDisplay = cloneDisplays[clone.id];
			if (!cloneDisplay) continue;
			const path = clone.path?.length ? clone.path : [clone.notation];
			const pathKey = `${context.stateGame.lex.roundSerial}:${clone.id}:${path.join('>')}`;
			if (pathKey === cloneDisplay.currentPathKey) continue;

			cloneDisplay.currentPathKey = pathKey;
			const targets = path.map((notation) => notationToPixelCenter(notation));
			const currentCenter = getDisplayCenter(cloneDisplay.display);
			cloneDisplay.pathTargets = targets.filter((target, index) => {
				if (index > 0) return true;
				return Math.hypot(target.x - currentCenter.x, target.y - currentCenter.y) > 1;
			});
		}
	};

	const renderFromBookState = () => {
		const lex = context.stateGame.lex;
		valueText.text = formatMoney(lex.tumbleValue);
		updateBounceText();
		updateHud();
		metaText.text = lex.roundEnded
			? `${lex.roundEndReason ?? 'roundEnd'} | WIN ${formatMoney(lex.totalWin)}`
			: '';

		for (const corner of cornerStates) drawCorner(corner, lex.corners[corner.key]);
		if (lex.roundEnded && lex.roundEndReason === 'cornerHit') {
			const winningCorner = cornerStates.find((corner) => corner.key === lex.corner);
			if (winningCorner) winningCorner.gfx.stroke({ color: 0xffffff, width: 5, alpha: 0.95 });
		}
		renderObjects();
		renderBalls();
		queueLexPath();
		queueClonePaths();
	};

	const moveDisplayTowardTargets = (
		display: PIXI.Sprite | PIXI.Graphics,
		targets: PixelPoint[],
		speed: number,
	) => {
		if (targets.length === 0) return;

		const target = targets[0];
		const current = getDisplayCenter(display);
		const dx = target.x - current.x;
		const dy = target.y - current.y;
		const distance = Math.hypot(dx, dy);
		if (distance <= speed) {
			setDisplayCenter(display, target);
			targets.shift();
			return;
		}

		display.x += (dx / distance) * speed;
		display.y += (dy / distance) * speed;
	};

	const tick = (ticker: PIXI.Ticker) => {
		const baseSpeed = stateBet.isTurbo ? TURBO_SPEED_PER_SECOND : NORMAL_SPEED_PER_SECOND;
		const speed = baseSpeed * (ticker.deltaMS / 1000);
		if (mainBall) moveDisplayTowardTargets(mainBall, pathTargets, speed);
		for (const clone of Object.values(cloneDisplays)) {
			moveDisplayTowardTargets(clone.display, clone.pathTargets, speed);
		}
	};

	$effect(() => {
		context.stateGame.lex.roundSerial;
		context.stateGame.lex.lexNotation;
		context.stateGame.lex.lexPath;
		context.stateGame.lex.tumbleValue;
		context.stateGame.lex.mainBounces;
		context.stateGame.lex.mainAlive;
		context.stateGame.lex.cloneCount;
		context.stateGame.lex.shieldCount;
		context.stateGame.lex.roundEnded;
		context.stateGame.lex.totalWin;
		context.stateGame.lex.corner;
		context.stateGame.lex.lastResolvedObjectId;
		context.stateGame.lex.activeObjects;
		context.stateGame.lex.clones;
		context.stateGame.lex.corners;
		renderFromBookState();
	});

	onMount(async () => {
		app = context.stateApp.pixiApplication;
		if (!app) return;

		try {
			const loaded = await PIXI.Assets.load(Object.values(LEX_ASSETS));
			textures = {
				lex: loaded[LEX_ASSETS.lex],
				cloneBall: loaded[LEX_ASSETS.cloneBall],
				slayer: loaded[LEX_ASSETS.slayer],
				halve: loaded[LEX_ASSETS.halve],
				escape: loaded[LEX_ASSETS.escape],
				cloneOrb: loaded[LEX_ASSETS.cloneOrb],
				coin: loaded[LEX_ASSETS.coin],
				diamond: loaded[LEX_ASSETS.diamond],
				chest: loaded[LEX_ASSETS.chest],
				heart: loaded[LEX_ASSETS.heart],
			};
			Object.values(textures).forEach(smoothTexture);
		} catch (error) {
			console.warn('Lex assets failed to load; using fallback drawings.', error);
			textures = {};
		}

		mainBall?.destroy();
		mainBall = undefined;
		for (const clone of Object.values(cloneDisplays)) clone.display.destroy();
		cloneDisplays = {};

		renderFromBookState();
		app.ticker.add(tick);
	});

	onDestroy(() => {
		if (app) app.ticker.remove(tick);
		mainBall?.destroy();
		for (const clone of Object.values(cloneDisplays)) clone.display.destroy();
		for (const container of Object.values(objectContainers)) container.destroy({ children: true });
		cloneDisplays = {};
		objectContainers = {};
	});

	parentCtx.addToParent(root);
</script>
