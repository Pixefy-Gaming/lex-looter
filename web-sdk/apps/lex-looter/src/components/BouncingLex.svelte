<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextParent } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import assets from '../game/assets';
	import { BOARD_SIZES } from '../game/constants';
	import { createCollisionReactionController } from '../animation/collisionReaction';
	import { createCornerAnticipationController } from '../animation/cornerAnticipation';
	import { createHeartHudAnimationController, type HeartHudSlot } from '../animation/heart';
	import { createCashNumberPopController } from '../animation/cashNumberPop';
	import { createObjectSpawnAnimationController } from '../animation/objectSpawn';
	import { createObjectResolveAnimationController } from '../animation/objectResolve';
	import { createPickupBurstController } from '../animation/pickupBurst';
	import { createLexTrailController } from '../animation/trail';
	import {
		CANVAS_HEIGHT,
		CANVAS_WIDTH,
		notationToPixelCenter,
		type PixelPoint,
	} from '../game/notation';
	import type { LexCornerKey, LexObjectName, LexRoundEndReason } from '../game/typesBookEvent';

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
	const CORNER_TAB_OUTSET = 5;
	const CORNER_CHEST_WIDTH = 32;
	const CORNER_CHEST_HEIGHT = 24;
	const CORNER_HITBOX_WIDTH = CELL_SIZE * 1.5;
	const CORNER_HITBOX_HEIGHT = CELL_SIZE * 1.1;
	const MAX_BOUNCES = 40;
	const NORMAL_SPEED_PER_SECOND = 2200;
	const TURBO_SPEED_PER_SECOND = 5200;
	const NORMAL_CHARACTER_ANIMATION_SPEED = 0.3;
	const TURBO_CHARACTER_ANIMATION_SPEED = 0.48;
	const CHARACTER_MAX_LEAN = 0.16;
	const CHARACTER_LEAN_LERP = 0.22;
	const CHARACTER_SETTLE_LERP = 0.14;
	const LEX_FONT_FAMILY = 'Jersey 25';
	const BOARD_ART_CROP = {
		x: 335,
		y: 335,
		width: 2688,
		height: 1680,
	};
	const BOARD_FRAME_OUTSET_X = 92;
	const BOARD_FRAME_OUTSET_Y = 56;
	const LEX_ASSETS = {
		lex: assets.lexMain.src,
		board: assets.lexBoard.src,
		boardFrame: assets.lexBoardFrame.src,
		gameAsset: assets.lexGameAsset.src,
		cloneBall: assets.lexClone.src,
		slayer: assets.lexSlayer.src,
		halve: assets.lexBlueBlob.src,
		escape: assets.lexEscape.src,
		cloneOrb: assets.lexCloneOrb.src,
		coin: assets.lexCoin.src,
		diamond: assets.lexDiamond.src,
		chest: assets.lexChest.src,
		heart: assets.lexHeart.src,
	} as const;
	const ROUND_END_REASON_LABELS: Record<LexRoundEndReason, string> = {
		cornerHit: 'Corner Hit',
		escape: 'Escaped',
		bounceLimit: 'Bounce Limit Hit',
		slayer: 'Slayed',
		allBallsLost: 'All Balls Lost',
		safetyStop: 'Safety Stop',
	};
	type LexDisplay = PIXI.Sprite | PIXI.AnimatedSprite | PIXI.Graphics;

	const root = new PIXI.Container();
	const hudLayer = new PIXI.Container();
	const objectLayer = new PIXI.Container();
	const effectLayer = new PIXI.Container();
	const ballLayer = new PIXI.Container();
	const trailLayer = new PIXI.Container();
	const CANVAS_Y_OFFSET = -35;
	const _SCALE = Math.min(BOARD_SIZES.width / W, BOARD_SIZES.height / H);
	root.scale.set(_SCALE);
	root.x = Math.round((BOARD_SIZES.width - W * _SCALE) / 2);
	root.y = Math.round((BOARD_SIZES.height - H * _SCALE) / 2) + CANVAS_Y_OFFSET;

	const bg = new PIXI.Container();
	const bgFallback = new PIXI.Graphics();
	let boardSprite: PIXI.Sprite | undefined;
	let boardFrameSprite: PIXI.Sprite | undefined;
	const boardFrameSoftBlur = new PIXI.BlurFilter({ strength: 1.15, quality: 3 });
	const drawBoardFallback = () => {
		bgFallback.clear();
		bgFallback.rect(0, 0, W, H);
		bgFallback.fill({ color: 0x101417 });
	};
	drawBoardFallback();
	bg.addChild(bgFallback);
	root.addChild(bg);

	type CornerState = {
		key: LexCornerKey;
		boxX: number;
		boxY: number;
		gfx: PIXI.Graphics;
		chest: PIXI.Sprite;
		hitbox: PIXI.Graphics;
		label: PIXI.Text;
	};

	const cornerStates: CornerState[] = [
		{ key: 'tl', boxX: 0, boxY: 0 },
		{ key: 'tr', boxX: W - CORNER_SIZE, boxY: 0 },
		{ key: 'bl', boxX: 0, boxY: H - CORNER_SIZE },
		{ key: 'br', boxX: W - CORNER_SIZE, boxY: H - CORNER_SIZE },
	].map((corner) => {
		const gfx = new PIXI.Graphics();
		const chest = new PIXI.Sprite();
		chest.anchor.set(0.5);
		const hitbox = new PIXI.Graphics();
		hitbox.visible = false;
		const label = new PIXI.Text({
			text: 'NONE',
			style: { fill: 0x07110b, fontFamily: LEX_FONT_FAMILY, fontSize: 12, fontWeight: '900' },
		});
		label.anchor.set(0.5);
		root.addChild(gfx);
		root.addChild(chest);
		root.addChild(hitbox);
		root.addChild(label);
		return { ...corner, gfx, chest, hitbox, label };
	});

	const logoContainer = new PIXI.Container();
	const logoFallbackText = new PIXI.Text({
		text: 'LEX\nLOOTER',
		style: {
			fill: 0x00ff4a,
			fontFamily: LEX_FONT_FAMILY,
			fontSize: 42,
			fontWeight: '900',
			lineHeight: 34,
			align: 'center',
			stroke: { color: 0x5e00a8, width: 5 },
			dropShadow: { color: 0x000000, distance: 3, blur: 2, alpha: 0.8 },
		},
	});
	logoFallbackText.anchor.set(0.5);
	logoContainer.rotation = -0.08;
	logoContainer.x = 145;
	logoContainer.y = -42;
	logoContainer.addChild(logoFallbackText);
	hudLayer.addChild(logoContainer);

	const valueText = new PIXI.Text({
		text: '$0.00',
		style: {
			fill: 0xffffff,
			fontFamily: LEX_FONT_FAMILY,
			fontSize: 34,
			fontWeight: '900',
			stroke: { color: 0x000000, width: 1 },
		},
	});
	valueText.anchor.set(0.5, 0);
	valueText.x = W / 2;
	valueText.y = -70;
	hudLayer.addChild(valueText);

	const stealthPill = new PIXI.Graphics();
	hudLayer.addChild(stealthPill);

	const bounceText = new PIXI.Text({
		text: `0 / ${MAX_BOUNCES} STEALTH`,
		style: {
			fill: 0xffffff,
			fontFamily: LEX_FONT_FAMILY,
			fontSize: 19,
			fontWeight: '900',
			stroke: { color: 0x000000, width: 1 },
		},
	});
	bounceText.anchor.set(0.5, 0);
	bounceText.x = W / 2;
	bounceText.y = -18;
	hudLayer.addChild(bounceText);

	const metaText = new PIXI.Text({
		text: '',
		style: { fill: 0xffffff, fontFamily: LEX_FONT_FAMILY, fontSize: 12, fontWeight: 'bold' },
	});
	metaText.anchor.set(0.5, 0);
	metaText.x = W / 2;
	metaText.y = 14;
	hudLayer.addChild(metaText);

	ballLayer.addChild(trailLayer);

	root.addChild(objectLayer);
	root.addChild(effectLayer);
	root.addChild(ballLayer);
	root.addChild(hudLayer);

	const heartHud: HeartHudSlot[] = [0, 1, 2].map((index) => {
		const heartSlot = new PIXI.Container();
		const baseLayer = new PIXI.Container();
		const effectLayer = new PIXI.Container();
		heartSlot.x = W / 2 + 145 + index * 40;
		heartSlot.y = -24;
		heartSlot.addChild(baseLayer);
		heartSlot.addChild(effectLayer);
		hudLayer.addChild(heartSlot);
		return { container: heartSlot, baseLayer, effectLayer };
	});

	let app: PIXI.Application | undefined;
	let textures: Partial<Record<keyof typeof LEX_ASSETS, PIXI.Texture>> = {};
	let lexSheet: PIXI.Spritesheet | undefined;
	let cloneSheet: PIXI.Spritesheet | undefined;
	let blueBlobSheet: PIXI.Spritesheet | undefined;
	let slayerSheet: PIXI.Spritesheet | undefined;
	let normalizedSlayerTextures: PIXI.Texture[] = [];
	let gameAssetSheet: PIXI.Spritesheet | undefined;
	let mainBall: LexDisplay | undefined;
	let cloneDisplays: Record<
		string,
		{
			display: LexDisplay;
			animationName: string;
			currentPathKey: string;
			pathTargets: PixelPoint[];
		}
	> = {};
	let objectContainers: Record<string, PIXI.Container> = {};
	let objectRenderStates: Record<string, string> = {};
	let renderedRoundSerial = 0;
	let currentPathKey = '';
	let pathTargets: PixelPoint[] = [];
	let currentLexAnimation = 'unarmed_run_front';

	const formatMoney = (amount: number) => `$${(amount / 100).toFixed(2)}`;

	const smoothTexture = (texture: PIXI.Texture | undefined) => {
		if (!texture) return;
		const source = texture.source as { scaleMode?: string } | undefined;
		if (source) source.scaleMode = 'linear';
	};

	const clearContainer = (container: PIXI.Container) => {
		for (const child of container.removeChildren()) child.destroy();
	};

	const renderBoardArt = () => {
		boardSprite?.destroy();
		boardSprite = undefined;
		const texture = textures.board;
		if (!texture) return;

		const croppedTexture = new PIXI.Texture({
			source: texture.source,
			frame: new PIXI.Rectangle(
				BOARD_ART_CROP.x,
				BOARD_ART_CROP.y,
				BOARD_ART_CROP.width,
				BOARD_ART_CROP.height,
			),
		});
		smoothTexture(croppedTexture);
		boardSprite = new PIXI.Sprite(croppedTexture);
		boardSprite.width = W;
		boardSprite.height = H;
		bg.addChild(boardSprite);
	};

	const renderBoardFrame = () => {
		boardFrameSprite?.destroy();
		boardFrameSprite = undefined;
		const texture = textures.boardFrame;
		if (!texture) return;

		boardFrameSprite = new PIXI.Sprite(texture);
		boardFrameSprite.anchor.set(0.5);
		boardFrameSprite.x = W / 2;
		boardFrameSprite.y = H / 2;
		boardFrameSprite.width = W + BOARD_FRAME_OUTSET_X * 2;
		boardFrameSprite.height = H + BOARD_FRAME_OUTSET_Y * 2;
		boardFrameSprite.filters = [boardFrameSoftBlur];

		smoothTexture(boardFrameSprite.texture);
		bg.addChildAt(boardFrameSprite, 0);
	};

	const createHeartDisplay = (filled: boolean) => {
		const texture = filled
			? (gameAssetSheet?.textures['heart.png'] ?? textures.heart)
			: gameAssetSheet?.textures['noHeart.png'];
		if (texture) {
			const sprite = new PIXI.Sprite(texture);
			sprite.anchor.set(0.5);
			smoothTexture(sprite.texture);
			fitSprite(sprite, 34, 34);
			return sprite;
		}

		const fallback = new PIXI.Graphics();
		fallback.circle(0, 0, 13);
		fallback.fill({ color: filled ? 0xff2738 : 0x2b2b2b, alpha: filled ? 0.95 : 0.45 });
		if (!filled) fallback.stroke({ color: 0xffffff, alpha: 0.18, width: 2 });
		return fallback;
	};

	const renderHeartHudAssets = () => {
		const shieldCount = Math.min(context.stateGame.lex.shieldCount, heartHud.length);
		for (const [index, heartSlot] of heartHud.entries()) {
			clearContainer(heartSlot.baseLayer);
			const baseDisplay = createHeartDisplay(index < shieldCount);
			const hidingForGain = heartHudAnimation.isGainHidingSlot(index);
			heartSlot.baseLayer.alpha = hidingForGain ? 0 : 1;
			heartSlot.baseLayer.addChild(baseDisplay);
		}
	};

	const setDisplayCenter = (display: LexDisplay, point: PixelPoint) => {
		if (display instanceof PIXI.Sprite || display instanceof PIXI.AnimatedSprite) {
			display.anchor.set(0.5);
			display.x = point.x;
			display.y = point.y;
			return;
		}
		display.x = point.x - display.width / 2;
		display.y = point.y - display.height / 2;
	};

	const getDisplayCenter = (display: LexDisplay): PixelPoint => {
		if (display instanceof PIXI.Sprite || display instanceof PIXI.AnimatedSprite) {
			return {
				x: display.x,
				y: display.y,
			};
		}
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
		stealthPill.roundRect(W / 2 - 100, -28, 200, 40, 20);
		stealthPill.fill({ color: 0x151515, alpha: 0.95 });
		stealthPill.stroke({ color: 0x00ff4a, width: 2, alpha: 0.95 });
		renderHeartHudAssets();
	};

	const formatSignedMoney = (amount: number) =>
		amount < 0 ? `-${formatMoney(Math.abs(amount))}` : `+${formatMoney(amount)}`;

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

		const isTop = corner.key === 'tl' || corner.key === 'tr';
		const isRight = corner.key === 'tr' || corner.key === 'br';
		const chestX = isRight ? W - CORNER_CHEST_WIDTH : 0;
		const chestY = isTop ? 0 : H - CORNER_CHEST_HEIGHT;
		const hitboxX = isRight ? W - CORNER_HITBOX_WIDTH : 0;
		const hitboxY = isTop ? 0 : H - CORNER_HITBOX_HEIGHT;
		const tabX = isRight ? W + CORNER_TAB_OUTSET : -CORNER_TAB_WIDTH - CORNER_TAB_OUTSET;
		const tabY = chestY + (CORNER_CHEST_HEIGHT - CORNER_TAB_HEIGHT) / 2;

		corner.gfx.clear();
		corner.gfx.rect(tabX, tabY, CORNER_TAB_WIDTH, CORNER_TAB_HEIGHT);
		corner.gfx.fill({ color: fillColor, alpha: 0.95 });
		corner.gfx.stroke({ color: 0x080808, width: 2 });
		corner.label.text = text;
		corner.label.style.fill = textColor;
		corner.label.x = tabX + CORNER_TAB_WIDTH / 2;
		corner.label.y = tabY + CORNER_TAB_HEIGHT / 2;

		const chestTexture = gameAssetSheet?.textures['chest.png'] ?? textures.chest;
		if (chestTexture) {
			corner.chest.visible = true;
			corner.chest.texture = chestTexture;
			smoothTexture(corner.chest.texture);
			fitSprite(corner.chest, CORNER_CHEST_WIDTH, CORNER_CHEST_HEIGHT);
			corner.chest.x = chestX + CORNER_CHEST_WIDTH / 2;
			corner.chest.y = chestY + CORNER_CHEST_HEIGHT / 2;
		} else {
			corner.chest.visible = false;
		}

		corner.hitbox.clear();
		corner.hitbox.rect(hitboxX, hitboxY, CORNER_HITBOX_WIDTH, CORNER_HITBOX_HEIGHT);
	};

	const fitSprite = (
		sprite: PIXI.Sprite | PIXI.AnimatedSprite,
		maxWidth: number,
		maxHeight: number,
	) => {
		const scale = Math.min(maxWidth / sprite.texture.width, maxHeight / sprite.texture.height);
		sprite.width = sprite.texture.width * scale;
		sprite.height = sprite.texture.height * scale;
	};

	const renderLogoAsset = () => {
		const logoTexture = gameAssetSheet?.textures['logo.png'];
		if (!logoTexture) return;

		for (const child of logoContainer.removeChildren()) child.destroy();
		const logoSprite = new PIXI.Sprite(logoTexture);
		logoSprite.anchor.set(0.5);
		smoothTexture(logoSprite.texture);
		fitSprite(logoSprite, 205, 135);
		logoContainer.addChild(logoSprite);
	};

	const createFallbackBall = (color: number) => {
		const ball = new PIXI.Graphics();
		ball.circle(BALL_SIZE / 2, BALL_SIZE / 2, BALL_SIZE / 2);
		ball.fill({ color });
		return ball;
	};

	const getCharacterAnimationSpeed = () =>
		stateBet.isTurbo ? TURBO_CHARACTER_ANIMATION_SPEED : NORMAL_CHARACTER_ANIMATION_SPEED;

	const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

	const setMovementLean = (display: LexDisplay, dx: number, dy: number, isClone: boolean) => {
		const distance = Math.hypot(dx, dy);
		if (distance <= 0) return;
		const horizontalLean = (dx / distance) * CHARACTER_MAX_LEAN;
		const verticalLean = (dy / distance) * CHARACTER_MAX_LEAN * 0.45;
		const targetRotation = horizontalLean - verticalLean;
		display.rotation = lerp(display.rotation, targetRotation, CHARACTER_LEAN_LERP);
		display.skew.x = lerp(display.skew.x, horizontalLean * (isClone ? 0.28 : 0.36), 0.18);
	};

	const settleMovementLean = (display: LexDisplay) => {
		display.rotation = lerp(display.rotation, 0, CHARACTER_SETTLE_LERP);
		display.skew.x = lerp(display.skew.x, 0, CHARACTER_SETTLE_LERP);
	};

	const getRunTextures = (
		sheet: PIXI.Spritesheet | undefined,
		animationName = 'unarmed_run_front',
	) => {
		if (!sheet) return [];
		const animations = sheet.data?.animations as Record<string, string[]> | undefined;
		const frameNames = animations?.[animationName];
		if (frameNames?.length) {
			return frameNames
				.map((frameName) => sheet.textures[frameName])
				.filter((texture): texture is PIXI.Texture => Boolean(texture));
		}
		return Object.entries(sheet.textures)
			.filter(([name]) => name.startsWith(animationName))
			.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
			.map(([, texture]) => texture);
	};

	const getSheetAnimationTextures = (
		sheet: PIXI.Spritesheet | undefined,
		animationName: string,
	) => {
		if (!sheet) return [];
		const animations = sheet.data?.animations as Record<string, string[]> | undefined;
		const frameNames = animations?.[animationName];
		if (frameNames?.length) {
			return frameNames
				.map((frameName) => sheet.textures[frameName])
				.filter((texture): texture is PIXI.Texture => Boolean(texture));
		}
		return Object.entries(sheet.textures)
			.filter(([name]) => name.startsWith(animationName))
			.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
			.map(([, texture]) => texture);
	};

	const normalizeAnimationTextures = (animationTextures: PIXI.Texture[]) => {
		if (animationTextures.length === 0) return [];

		const maxWidth = Math.max(...animationTextures.map((texture) => texture.orig.width));
		const maxHeight = Math.max(...animationTextures.map((texture) => texture.orig.height));

		return animationTextures.map((texture) => {
			const width = texture.orig.width;
			const height = texture.orig.height;
			const trim = new PIXI.Rectangle(
				(maxWidth - width) / 2,
				(maxHeight - height) / 2,
				width,
				height,
			);
			const normalizedTexture = new PIXI.Texture({
				source: texture.source,
				frame: texture.frame,
				orig: new PIXI.Rectangle(0, 0, maxWidth, maxHeight),
				trim,
				rotate: texture.rotate,
			});
			smoothTexture(normalizedTexture);
			return normalizedTexture;
		});
	};

	const getLexAnimationForDelta = (dx: number, dy: number) => {
		if (Math.abs(dx) >= Math.abs(dy)) {
			return dx < 0 ? 'unarmed_run_left' : 'unarmed_run_right';
		}
		return dy < 0 ? 'unarmed_run_back' : 'unarmed_run_front';
	};

	const setLexAnimation = (animationName: string) => {
		if (!(mainBall instanceof PIXI.AnimatedSprite)) return;
		if (currentLexAnimation === animationName) return;
		const runTextures = getRunTextures(lexSheet, animationName);
		if (runTextures.length === 0) return;
		currentLexAnimation = animationName;
		mainBall.textures = runTextures;
		mainBall.gotoAndPlay(0);
		fitSprite(mainBall, BALL_SIZE, BALL_SIZE);
	};

	const setCloneAnimation = (cloneId: string, animationName: string) => {
		const clone = cloneDisplays[cloneId];
		if (!clone || !(clone.display instanceof PIXI.AnimatedSprite)) return;
		if (clone.animationName === animationName) return;
		const runTextures = getRunTextures(cloneSheet, animationName);
		if (runTextures.length === 0) return;
		clone.animationName = animationName;
		clone.display.textures = runTextures;
		clone.display.gotoAndPlay(0);
		fitSprite(clone.display, BALL_SIZE, BALL_SIZE);
	};

	const createBall = (isClone: boolean, notation = context.stateGame.lex.lexNotation) => {
		const runTextures = getRunTextures(isClone ? cloneSheet : lexSheet);
		const texture = isClone ? textures.cloneBall : textures.lex;
		const ball =
			runTextures.length > 0
				? new PIXI.AnimatedSprite(runTextures)
				: texture
					? new PIXI.Sprite(texture)
					: createFallbackBall(isClone ? 0x00e701 : 0xffffff);
		if (ball instanceof PIXI.Sprite) {
			smoothTexture(ball.texture);
			fitSprite(ball, BALL_SIZE, BALL_SIZE);
		}
		if (ball instanceof PIXI.AnimatedSprite) {
			ball.animationSpeed = getCharacterAnimationSpeed();
			ball.play();
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

	const createObjectContainer = (object: LexObjectName, resolved = false) => {
		const container = new PIXI.Container();
		const animatedTextures =
			object === 'blue_blob'
				? getSheetAnimationTextures(blueBlobSheet, 'Frame')
				: object === 'slayer' && resolved
					? normalizedSlayerTextures
					: [];
		const gameAssetObjectTextures: Partial<Record<LexObjectName, PIXI.Texture>> = {
			coin: gameAssetSheet?.textures['coin.png'],
			diamond: gameAssetSheet?.textures['diamond.png'],
			chest: gameAssetSheet?.textures['chest.png'],
			escape: gameAssetSheet?.textures['escape.png'],
			clone_orb: gameAssetSheet?.textures['cloneClover.png'],
		};
		const texture =
			object === 'coin'
				? (gameAssetObjectTextures.coin ?? textures.coin)
				: object === 'diamond'
					? (gameAssetObjectTextures.diamond ?? textures.diamond)
					: object === 'chest'
						? (gameAssetObjectTextures.chest ?? textures.chest)
						: object === 'heart'
							? textures.heart
							: object === 'slayer'
								? textures.slayer
								: object === 'blue_blob'
									? textures.halve
									: object === 'escape'
										? (gameAssetObjectTextures.escape ?? textures.escape)
										: object === 'clone_orb'
											? (gameAssetObjectTextures.clone_orb ?? textures.cloneOrb)
											: undefined;

		if (animatedTextures.length > 0) {
			const sprite = new PIXI.AnimatedSprite(animatedTextures);
			sprite.anchor.set(0.5);
			sprite.animationSpeed = object === 'slayer' ? 0.28 : 0.18;
			sprite.loop = object !== 'slayer';
			sprite.play();
			const spriteSize = object === 'slayer' ? ESCAPE_OBJ_SIZE * 1.45 : OBJ_SIZE;
			fitSprite(sprite, spriteSize, spriteSize);
			container.addChild(sprite);
			return container;
		}

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
			style: {
				fill: 0x07141d,
				fontFamily: LEX_FONT_FAMILY,
				fontSize: style.label.length > 4 ? 8 : 12,
				fontWeight: 'bold',
			},
		});
		label.anchor.set(0.5);
		container.addChild(label);
		return container;
	};

	const setObjectPosition = (
		container: PIXI.Container,
		notation: string,
		x?: number,
		y?: number,
	) => {
		const point = notation
			? notationToPixelCenter(notation)
			: { x: (x ?? 0.5) * W, y: (y ?? 0.5) * H };
		container.x = point.x;
		container.y = point.y;
	};

	const getObjectPoint = (notation: string, x?: number, y?: number): PixelPoint =>
		notation ? notationToPixelCenter(notation) : { x: (x ?? 0.5) * W, y: (y ?? 0.5) * H };

	const getShieldAnimationSourcePoint = (): PixelPoint => {
		const activeObject = context.stateGame.lex.lastResolvedObjectId
			? context.stateGame.lex.activeObjects[context.stateGame.lex.lastResolvedObjectId]
			: undefined;
		if (activeObject?.object === 'heart') {
			return getObjectPoint(activeObject.notation, activeObject.x, activeObject.y);
		}
		if (mainBall) return getDisplayCenter(mainBall);
		return { x: W / 2, y: H / 2 };
	};

	const heartHudAnimation = createHeartHudAnimationController({
		heartHud,
		hudLayer,
		createHeartDisplay,
		getSourcePoint: getShieldAnimationSourcePoint,
		getShieldCount: () => context.stateGame.lex.shieldCount,
		getRoundSerial: () => context.stateGame.lex.roundSerial,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const lexTrailAnimation = createLexTrailController({
		layer: trailLayer,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const pickupBurstAnimation = createPickupBurstController({
		layer: effectLayer,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const cashNumberPopAnimation = createCashNumberPopController({
		layer: effectLayer,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const objectSpawnAnimation = createObjectSpawnAnimationController({
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const objectResolveAnimation = createObjectResolveAnimationController({
		layer: effectLayer,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const collisionReactionAnimation = createCollisionReactionController({
		layer: effectLayer,
		boardWidth: W,
		boardHeight: H,
		getDisplay: () => mainBall,
		getPoint: () => notationToPixelCenter(context.stateGame.lex.lexNotation),
		getBounceCount: () => context.stateGame.lex.mainBounces,
		getRoundSerial: () => context.stateGame.lex.roundSerial,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const cornerAnticipationAnimation = createCornerAnticipationController({
		layer: effectLayer,
		targets: cornerStates.map((corner) => ({
			key: corner.key,
			chest: corner.chest,
			label: corner.label,
			gfx: corner.gfx,
			point: {
				x: corner.key === 'tr' || corner.key === 'br' ? W : 0,
				y: corner.key === 'bl' || corner.key === 'br' ? H : 0,
			},
		})),
		getLexPoint: () =>
			mainBall
				? getDisplayCenter(mainBall)
				: notationToPixelCenter(context.stateGame.lex.lexNotation),
		getMultiplier: (key) => context.stateGame.lex.corners[key],
		isRoundActive: () => context.stateGame.lex.mainAlive && !context.stateGame.lex.roundEnded,
		isTurbo: () => stateBet.isTurbo,
		isSkipPlayback: () => context.stateGame.lexSkipPlayback,
	});

	const queuePickupBurstAnimation = () => {
		const objectId = context.stateGame.lex.lastResolvedObjectId;
		if (!objectId) return;

		const activeObject = context.stateGame.lex.activeObjects[objectId];
		if (!activeObject?.resolved) return;
		if (activeObject.object === 'slayer' || activeObject.object === 'escape') return;

		pickupBurstAnimation.queue({
			objectId,
			roundSerial: context.stateGame.lex.roundSerial,
			object: activeObject.object,
			point: getObjectPoint(activeObject.notation, activeObject.x, activeObject.y),
		});
	};

	const queueCashNumberPopAnimation = () => {
		const resolvedObject = context.stateGame.lex.lastResolvedObject;
		if (!resolvedObject) return;

		let amount = 0;
		let tint = 0xfff1a8;
		if (resolvedObject.result === 'collect') {
			amount = resolvedObject.amount;
			tint = resolvedObject.object === 'diamond' ? 0x9dffe0 : 0xfff1a8;
		} else if (resolvedObject.result === 'halve') {
			amount = resolvedObject.delta;
			tint = 0xff6868;
		} else if (resolvedObject.result === 'cashout') {
			amount = resolvedObject.totalWin;
			tint = 0xffffff;
		} else if (
			resolvedObject.result === 'destroy' &&
			resolvedObject.object === 'slayer' &&
			resolvedObject.remainingBalls === 0
		) {
			amount = -context.stateGame.lex.tumbleValue;
			tint = 0xff6868;
		}

		if (amount === 0) return;

		const collectorAt = resolvedObject.collectorAt ?? resolvedObject.lexAt;
		cashNumberPopAnimation.queue({
			id: `${resolvedObject.objectId}:${resolvedObject.result}`,
			roundSerial: context.stateGame.lex.roundSerial,
			point: notationToPixelCenter(collectorAt),
			label: formatSignedMoney(amount),
			tint,
		});
	};

	const queueBounceCashNumberPopAnimation = () => {
		const lex = context.stateGame.lex;
		if (lex.mainBounces <= 0 || lex.tumbleValue <= 0) return;

		cashNumberPopAnimation.queue({
			id: `bounce:${lex.mainBounces}`,
			roundSerial: lex.roundSerial,
			point: notationToPixelCenter(lex.lexNotation),
			label: formatMoney(lex.tumbleValue),
			tint: 0xffffff,
		});
	};

	const queueCloneBounceCashNumberPopAnimation = () => {
		const lex = context.stateGame.lex;
		if (lex.tumbleValue <= 0) return;

		for (const cloneBounce of lex.lastCloneBounces) {
			cashNumberPopAnimation.queue({
				id: `clone-bounce:${cloneBounce.id}:${cloneBounce.serial}`,
				roundSerial: lex.roundSerial,
				point: notationToPixelCenter(cloneBounce.notation),
				label: formatMoney(lex.tumbleValue),
				tint: 0xd7fff4,
			});
		}
	};

	const shouldHideMainLexForEscape = () => {
		const objectId = context.stateGame.lex.lastResolvedObjectId;
		const activeObject = objectId ? context.stateGame.lex.activeObjects[objectId] : undefined;
		return activeObject?.resolved === true && activeObject.object === 'escape';
	};

	const renderObjects = () => {
		const activeObjects = context.stateGame.lex.activeObjects;
		for (const objectId of Object.keys(objectContainers)) {
			if (!activeObjects[objectId]) {
				objectSpawnAnimation.cancelContainer(objectContainers[objectId]);
				objectResolveAnimation.cancelContainer(objectContainers[objectId]);
				objectContainers[objectId].destroy({ children: true });
				delete objectContainers[objectId];
				delete objectRenderStates[objectId];
			}
		}

		for (const activeObject of Object.values(activeObjects)) {
			let container = objectContainers[activeObject.objectId];
			const renderState = `${activeObject.object}:${activeObject.resolved}:${activeObject.result ?? ''}`;
			if (!container || objectRenderStates[activeObject.objectId] !== renderState) {
				if (container) {
					objectSpawnAnimation.cancelContainer(container);
					objectResolveAnimation.cancelContainer(container);
				}
				container?.destroy({ children: true });
				container = createObjectContainer(activeObject.object, activeObject.resolved);
				objectContainers[activeObject.objectId] = container;
				objectRenderStates[activeObject.objectId] = renderState;
				objectLayer.addChild(container);
			}
			setObjectPosition(container, activeObject.notation, activeObject.x, activeObject.y);
			const isTerminalResolvedObject =
				activeObject.resolved &&
				(activeObject.object === 'slayer' || activeObject.object === 'escape');
			if (isTerminalResolvedObject) {
				container.alpha = 1;
				continue;
			}

			if (
				activeObject.resolved &&
				activeObject.object !== 'slayer' &&
				activeObject.object !== 'escape'
			) {
				objectResolveAnimation.syncResolvedObject({
					objectId: activeObject.objectId,
					roundSerial: context.stateGame.lex.roundSerial,
					object: activeObject.object,
					container,
					point: getObjectPoint(activeObject.notation, activeObject.x, activeObject.y),
				});
			} else {
				container.alpha = 1;
				container.scale.set(1);
				objectSpawnAnimation.syncObject(activeObject.objectId, container, activeObject.resolved);
			}
		}
		const activeObjectIds = Object.keys(activeObjects);
		objectSpawnAnimation.forgetMissing(activeObjectIds);
		objectResolveAnimation.forgetMissing(activeObjectIds);
	};

	const renderBalls = () => {
		if (renderedRoundSerial !== context.stateGame.lex.roundSerial) {
			renderedRoundSerial = context.stateGame.lex.roundSerial;
			currentPathKey = '';
			pathTargets = [];
			currentLexAnimation = 'unarmed_run_front';
			collisionReactionAnimation.clear();
			lexTrailAnimation.clear();
			pickupBurstAnimation.clear();
			cashNumberPopAnimation.clear();
			objectSpawnAnimation.clear();
			objectResolveAnimation.clear();
			cornerAnticipationAnimation.clear();
			mainBall?.destroy();
			mainBall = undefined;
			for (const clone of Object.values(cloneDisplays)) clone.display.destroy();
			cloneDisplays = {};
			for (const container of Object.values(objectContainers))
				container.destroy({ children: true });
			objectContainers = {};
			objectRenderStates = {};
		}

		if (context.stateGame.lex.mainAlive && !shouldHideMainLexForEscape()) {
			if (!mainBall) mainBall = createBall(false);
			if (pathTargets.length === 0) {
				setDisplayCenter(mainBall, notationToPixelCenter(context.stateGame.lex.lexNotation));
			}
		} else if (mainBall) {
			collisionReactionAnimation.clear();
			lexTrailAnimation.clear();
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
					animationName: 'unarmed_run_front',
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
		heartHudAnimation.syncShieldCount();
		updateHud();
		const roundEndLabel = lex.roundEndReason
			? ROUND_END_REASON_LABELS[lex.roundEndReason]
			: 'Round End';
		metaText.text = lex.roundEnded ? `${roundEndLabel}` : '';

		for (const corner of cornerStates) drawCorner(corner, lex.corners[corner.key]);
		if (lex.roundEnded && lex.roundEndReason === 'cornerHit') {
			const winningCorner = cornerStates.find((corner) => corner.key === lex.corner);
			if (winningCorner) winningCorner.gfx.stroke({ color: 0xffffff, width: 5, alpha: 0.95 });
		}
		renderObjects();
		queuePickupBurstAnimation();
		queueCashNumberPopAnimation();
		queueBounceCashNumberPopAnimation();
		queueCloneBounceCashNumberPopAnimation();
		renderBalls();
		collisionReactionAnimation.syncBounceCount();
		queueLexPath();
		queueClonePaths();
	};

	const moveDisplayTowardTargets = (
		display: LexDisplay,
		targets: PixelPoint[],
		speed: number,
		onMove?: (dx: number, dy: number) => void,
	) => {
		if (targets.length === 0) return;

		const target = targets[0];
		const current = getDisplayCenter(display);
		const dx = target.x - current.x;
		const dy = target.y - current.y;
		const distance = Math.hypot(dx, dy);
		if (distance > 0) onMove?.(dx, dy);
		if (distance <= speed) {
			setDisplayCenter(display, target);
			targets.shift();
			return;
		}

		display.x += (dx / distance) * speed;
		display.y += (dy / distance) * speed;
	};

	const snapDisplayToFinalTarget = (display: LexDisplay, targets: PixelPoint[]) => {
		const target = targets.at(-1);
		if (!target) return;
		setDisplayCenter(display, target);
		targets.length = 0;
	};

	const tick = (ticker: PIXI.Ticker) => {
		const baseSpeed = stateBet.isTurbo ? TURBO_SPEED_PER_SECOND : NORMAL_SPEED_PER_SECOND;
		const speed = baseSpeed * (ticker.deltaMS / 1000);
		const animationSpeed = getCharacterAnimationSpeed();
		heartHudAnimation.update(ticker.deltaMS);
		lexTrailAnimation.update(ticker.deltaMS);
		pickupBurstAnimation.update(ticker.deltaMS);
		cashNumberPopAnimation.update(ticker.deltaMS);
		objectSpawnAnimation.update(ticker.deltaMS);
		objectResolveAnimation.update(ticker.deltaMS);
		if (mainBall) {
			if (mainBall instanceof PIXI.AnimatedSprite) mainBall.animationSpeed = animationSpeed;
			if (context.stateGame.lexSkipPlayback) snapDisplayToFinalTarget(mainBall, pathTargets);
			moveDisplayTowardTargets(mainBall, pathTargets, speed, (dx, dy) => {
				setLexAnimation(getLexAnimationForDelta(dx, dy));
				setMovementLean(mainBall as LexDisplay, dx, dy, false);
			});
			if (pathTargets.length === 0) settleMovementLean(mainBall);
			lexTrailAnimation.add(getDisplayCenter(mainBall), false, 'main');
		}
		collisionReactionAnimation.update(ticker.deltaMS);
		cornerAnticipationAnimation.update(ticker.deltaMS);
		for (const [cloneId, clone] of Object.entries(cloneDisplays)) {
			if (clone.display instanceof PIXI.AnimatedSprite) {
				clone.display.animationSpeed = animationSpeed;
			}
			if (context.stateGame.lexSkipPlayback) {
				snapDisplayToFinalTarget(clone.display, clone.pathTargets);
			}
			moveDisplayTowardTargets(clone.display, clone.pathTargets, speed, (dx, dy) => {
				setCloneAnimation(cloneId, getLexAnimationForDelta(dx, dy));
				setMovementLean(clone.display, dx, dy, true);
			});
			if (clone.pathTargets.length === 0) settleMovementLean(clone.display);
			lexTrailAnimation.add(getDisplayCenter(clone.display), true, cloneId);
		}
	};

	$effect(() => {
		renderFromBookState();
	});

	context.eventEmitter.subscribeOnMount({
		skipLexPlayback: () => {
			if (context.stateXstateDerived.isIdle()) return;
			context.stateGame.lexSkipPlayback = true;
		},
	});

	onMount(async () => {
		app = context.stateApp.pixiApplication;
		if (!app) return;

		try {
			const loaded = await PIXI.Assets.load(Object.values(LEX_ASSETS));
			const lexAsset = loaded[LEX_ASSETS.lex] as PIXI.Spritesheet | PIXI.Texture | undefined;
			const cloneAsset = loaded[LEX_ASSETS.cloneBall] as
				| PIXI.Spritesheet
				| PIXI.Texture
				| undefined;
			const blueBlobAsset = loaded[LEX_ASSETS.halve] as PIXI.Spritesheet | PIXI.Texture | undefined;
			const slayerAsset = loaded[LEX_ASSETS.slayer] as PIXI.Spritesheet | PIXI.Texture | undefined;
			const gameAsset = loaded[LEX_ASSETS.gameAsset] as PIXI.Spritesheet | PIXI.Texture | undefined;
			lexSheet = lexAsset && 'textures' in lexAsset ? lexAsset : undefined;
			cloneSheet = cloneAsset && 'textures' in cloneAsset ? cloneAsset : undefined;
			blueBlobSheet = blueBlobAsset && 'textures' in blueBlobAsset ? blueBlobAsset : undefined;
			slayerSheet = slayerAsset && 'textures' in slayerAsset ? slayerAsset : undefined;
			gameAssetSheet = gameAsset && 'textures' in gameAsset ? gameAsset : undefined;
			textures = {
				lex: lexSheet
					? (lexSheet.textures['unarmed_run_front1.png'] ?? Object.values(lexSheet.textures)[0])
					: (lexAsset as PIXI.Texture | undefined),
				board: loaded[LEX_ASSETS.board],
				boardFrame: loaded[LEX_ASSETS.boardFrame],
				gameAsset: gameAssetSheet
					? (gameAssetSheet.textures['logo.png'] ?? Object.values(gameAssetSheet.textures)[0])
					: (gameAsset as PIXI.Texture | undefined),
				cloneBall: cloneSheet
					? (cloneSheet.textures['lexClone_unarmed_run_front1.png'] ??
						Object.values(cloneSheet.textures)[0])
					: (cloneAsset as PIXI.Texture | undefined),
				slayer: slayerSheet
					? (slayerSheet.textures['Slayer1.png'] ?? Object.values(slayerSheet.textures)[0])
					: (slayerAsset as PIXI.Texture | undefined),
				halve: blueBlobSheet
					? (blueBlobSheet.textures['Frame1.png'] ?? Object.values(blueBlobSheet.textures)[0])
					: (blueBlobAsset as PIXI.Texture | undefined),
				escape: loaded[LEX_ASSETS.escape],
				cloneOrb: loaded[LEX_ASSETS.cloneOrb],
				coin: loaded[LEX_ASSETS.coin],
				diamond: loaded[LEX_ASSETS.diamond],
				chest: loaded[LEX_ASSETS.chest],
				heart: loaded[LEX_ASSETS.heart],
			};
			if (lexSheet) Object.values(lexSheet.textures).forEach(smoothTexture);
			if (cloneSheet) Object.values(cloneSheet.textures).forEach(smoothTexture);
			if (blueBlobSheet) Object.values(blueBlobSheet.textures).forEach(smoothTexture);
			if (slayerSheet) Object.values(slayerSheet.textures).forEach(smoothTexture);
			if (gameAssetSheet) Object.values(gameAssetSheet.textures).forEach(smoothTexture);
			normalizedSlayerTextures = normalizeAnimationTextures(
				getSheetAnimationTextures(slayerSheet, 'Slayer'),
			);
			Object.values(textures).forEach(smoothTexture);
			renderLogoAsset();
			renderBoardFrame();
			renderBoardArt();
			renderHeartHudAssets();
		} catch (error) {
			console.warn('Lex assets failed to load; using fallback drawings.', error);
			lexSheet = undefined;
			cloneSheet = undefined;
			blueBlobSheet = undefined;
			slayerSheet = undefined;
			normalizedSlayerTextures = [];
			gameAssetSheet = undefined;
			textures = {};
			renderBoardFrame();
			renderBoardArt();
			renderHeartHudAssets();
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
		heartHudAnimation.clear();
		lexTrailAnimation.clear();
		pickupBurstAnimation.clear();
		cashNumberPopAnimation.clear();
		collisionReactionAnimation.clear();
		objectSpawnAnimation.clear();
		objectResolveAnimation.clear();
		cornerAnticipationAnimation.clear();
		mainBall?.destroy();
		boardSprite?.destroy();
		boardFrameSprite?.destroy();
		normalizedSlayerTextures.forEach((texture) => texture.destroy(false));
		normalizedSlayerTextures = [];
		for (const clone of Object.values(cloneDisplays)) clone.display.destroy();
		for (const container of Object.values(objectContainers)) container.destroy({ children: true });
		cloneDisplays = {};
		objectContainers = {};
		objectRenderStates = {};
	});

	parentCtx.addToParent(root);
</script>
