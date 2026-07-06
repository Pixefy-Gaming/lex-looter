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
	const BALL_SIZE = 35;
	const OBJ_SIZE = 44;
	const ESCAPE_OBJ_SIZE = 64;
	const CORNER_SIZE = 58;
	const MAX_BOUNCES = 40;

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
	const objectLayer = new PIXI.Container();
	const ballLayer = new PIXI.Container();
	const _SCALE = Math.min(BOARD_SIZES.width / W, BOARD_SIZES.height / H);
	root.scale.set(_SCALE);
	root.x = Math.round((BOARD_SIZES.width - W * _SCALE) / 2);
	root.y = Math.round((BOARD_SIZES.height - H * _SCALE) / 2);

	const bg = new PIXI.Graphics();
	bg.rect(0, 0, W, H);
	bg.fill({ color: 0x07141d });
	bg.stroke({ color: 0x2f4553, width: 4 });
	root.addChild(bg);

	type CornerState = {
		key: LexCornerKey;
		boxX: number;
		boxY: number;
		gfx: PIXI.Graphics;
		label: PIXI.Text;
	};

	const cornerStates: CornerState[] = [
		{ key: 'tl', boxX: 0, boxY: 0 },
		{ key: 'tr', boxX: W - CORNER_SIZE, boxY: 0 },
		{ key: 'bl', boxX: 0, boxY: H - CORNER_SIZE },
		{ key: 'br', boxX: W - CORNER_SIZE, boxY: H - CORNER_SIZE },
	].map((corner) => {
		const gfx = new PIXI.Graphics();
		const label = new PIXI.Text({
			text: 'NONE',
			style: { fill: 0x666666, fontSize: 13, fontWeight: 'bold' },
		});
		label.anchor.set(0.5);
		root.addChild(gfx);
		root.addChild(label);
		return { ...corner, gfx, label };
	});

	const valueText = new PIXI.Text({
		text: '$0.00',
		style: { fill: 0x00e701, fontSize: 26, fontWeight: 'bold' },
	});
	valueText.anchor.set(0.5, 0);
	valueText.x = W / 2;
	valueText.y = 12;
	root.addChild(valueText);

	const bounceText = new PIXI.Text({
		text: `0 / ${MAX_BOUNCES} STEALTH`,
		style: { fill: 0xb1bad3, fontSize: 14 },
	});
	bounceText.anchor.set(0.5, 0);
	bounceText.x = W / 2;
	bounceText.y = 44;
	root.addChild(bounceText);

	const metaText = new PIXI.Text({
		text: '',
		style: { fill: 0xffffff, fontSize: 13, fontWeight: 'bold' },
	});
	metaText.anchor.set(0.5, 0);
	metaText.x = W / 2;
	metaText.y = 66;
	root.addChild(metaText);

	root.addChild(objectLayer);
	root.addChild(ballLayer);

	let app: PIXI.Application | undefined;
	let textures: Partial<Record<keyof typeof LEX_ASSETS, PIXI.Texture>> = {};
	let mainBall: PIXI.Sprite | PIXI.Graphics | undefined;
	let cloneBalls: (PIXI.Sprite | PIXI.Graphics)[] = [];
	let objectContainers: Record<string, PIXI.Container> = {};
	let renderedRoundSerial = 0;
	let currentPathKey = '';
	let pathTargets: PixelPoint[] = [];

	const formatMoney = (amount: number) => `$${(amount / 100).toFixed(2)}`;

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

	const drawCorner = (corner: CornerState, multiplier: number | null) => {
		let borderColor = 0x2f4553;
		let fillColor = 0x1a2c38;
		let textColor = 0x666666;
		let text = 'NONE';

		if (multiplier !== null) {
			text = `${multiplier}x`;
			if (multiplier >= 5) {
				borderColor = 0xffd700;
				fillColor = 0x1a1500;
				textColor = 0xffd700;
			} else if (multiplier >= 2) {
				borderColor = 0x00e701;
				fillColor = 0x082010;
				textColor = 0x00e701;
			} else {
				borderColor = 0xff4d4d;
				fillColor = 0x2a0808;
				textColor = 0xff4d4d;
			}
		}

		corner.gfx.clear();
		corner.gfx.roundRect(corner.boxX, corner.boxY, CORNER_SIZE, CORNER_SIZE, 4);
		corner.gfx.fill({ color: fillColor, alpha: 0.95 });
		corner.gfx.stroke({ color: borderColor, width: 2 });
		corner.label.text = text;
		corner.label.style.fill = textColor;
		corner.label.x = corner.boxX + CORNER_SIZE / 2;
		corner.label.y = corner.boxY + CORNER_SIZE / 2;
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

	const createBall = (isClone: boolean) => {
		const texture = isClone ? textures.cloneBall : textures.lex;
		const ball = texture ? new PIXI.Sprite(texture) : createFallbackBall(isClone ? 0x00e701 : 0xffffff);
		if (ball instanceof PIXI.Sprite) {
			fitSprite(ball, BALL_SIZE, BALL_SIZE);
		}
		setDisplayCenter(ball, notationToPixelCenter(context.stateGame.lex.lexNotation));
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
			for (const clone of cloneBalls) clone.destroy();
			cloneBalls = [];
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

		while (cloneBalls.length < context.stateGame.lex.cloneCount) {
			cloneBalls.push(createBall(true));
		}
		while (cloneBalls.length > context.stateGame.lex.cloneCount) {
			cloneBalls.pop()?.destroy();
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

	const renderFromBookState = () => {
		const lex = context.stateGame.lex;
		valueText.text = formatMoney(lex.tumbleValue);
		updateBounceText();
		metaText.text = lex.roundEnded
			? `${lex.roundEndReason ?? 'roundEnd'} | WIN ${formatMoney(lex.totalWin)}`
			: `${lex.mode || 'waiting'} | clones ${lex.cloneCount} | shields ${lex.shieldCount}`;

		for (const corner of cornerStates) drawCorner(corner, lex.corners[corner.key]);
		if (lex.roundEnded && lex.roundEndReason === 'cornerHit') {
			const winningCorner = cornerStates.find((corner) => corner.key === lex.corner);
			if (winningCorner) winningCorner.gfx.stroke({ color: 0xffffff, width: 5, alpha: 0.95 });
		}
		renderObjects();
		renderBalls();
		queueLexPath();
	};

	const tick = () => {
		if (mainBall && pathTargets.length > 0) {
			const target = pathTargets[0];
			const current = getDisplayCenter(mainBall);
			const dx = target.x - current.x;
			const dy = target.y - current.y;
			const distance = Math.hypot(dx, dy);
			const speed = stateBet.isTurbo ? 72 : 42;
			if (distance <= speed) {
				setDisplayCenter(mainBall, target);
				pathTargets.shift();
			} else {
				mainBall.x += (dx / distance) * speed;
				mainBall.y += (dy / distance) * speed;
			}
		}

		const center = mainBall
			? getDisplayCenter(mainBall)
			: notationToPixelCenter(context.stateGame.lex.lexNotation);
		cloneBalls.forEach((clone, index) => {
			const angle = performance.now() / 360 + index * 1.8;
			setDisplayCenter(clone, {
				x: center.x + Math.cos(angle) * (28 + index * 5),
				y: center.y + Math.sin(angle) * (22 + index * 4),
			});
		});
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
		} catch (error) {
			console.warn('Lex assets failed to load; using fallback drawings.', error);
			textures = {};
		}

		mainBall?.destroy();
		mainBall = undefined;
		for (const clone of cloneBalls) clone.destroy();
		cloneBalls = [];

		renderFromBookState();
		app.ticker.add(tick);
	});

	onDestroy(() => {
		if (app) app.ticker.remove(tick);
		mainBall?.destroy();
		for (const clone of cloneBalls) clone.destroy();
		for (const container of Object.values(objectContainers)) container.destroy({ children: true });
		cloneBalls = [];
		objectContainers = {};
	});

	parentCtx.addToParent(root);
</script>
