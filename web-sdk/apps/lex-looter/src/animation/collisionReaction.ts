import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';

type ReactiveDisplay = PIXI.Sprite | PIXI.AnimatedSprite | PIXI.Graphics;

type CollisionReactionOptions = {
	layer: PIXI.Container;
	boardWidth: number;
	boardHeight: number;
	getDisplay: () => ReactiveDisplay | undefined;
	getPoint: () => PixelPoint;
	getBounceCount: () => number;
	getRoundSerial: () => number;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

type BorderEdge = 'top' | 'right' | 'bottom' | 'left';

type BorderWave = {
	elapsed: number;
	duration: number;
	cover: PIXI.Graphics;
	wave: PIXI.Graphics;
	point: PixelPoint;
	edge: BorderEdge;
};

type Squash = {
	elapsed: number;
	duration: number;
	display: ReactiveDisplay;
	baseScale: PixelPoint;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const destroyGraphics = (graphics: PIXI.Graphics) => {
	graphics.parent?.removeChild(graphics);
	graphics.destroy();
};

export const createCollisionReactionController = ({
	layer,
	boardWidth,
	boardHeight,
	getDisplay,
	getPoint,
	getBounceCount,
	getRoundSerial,
	isTurbo,
	isSkipPlayback,
}: CollisionReactionOptions) => {
	let lastRoundSerial = getRoundSerial();
	let lastBounceCount = getBounceCount();
	let waves: BorderWave[] = [];
	let squash: Squash | undefined;

	const clear = () => {
		for (const wave of waves) {
			destroyGraphics(wave.cover);
			destroyGraphics(wave.wave);
		}
		waves = [];
		if (squash) squash.display.scale.set(squash.baseScale.x, squash.baseScale.y);
		squash = undefined;
		lastRoundSerial = getRoundSerial();
		lastBounceCount = getBounceCount();
	};

	const getNearestEdge = (point: PixelPoint): BorderEdge => {
		const distances = [
			{ edge: 'top' as const, value: Math.abs(point.y) },
			{ edge: 'right' as const, value: Math.abs(boardWidth - point.x) },
			{ edge: 'bottom' as const, value: Math.abs(boardHeight - point.y) },
			{ edge: 'left' as const, value: Math.abs(point.x) },
		];
		distances.sort((a, b) => a.value - b.value);
		return distances[0].edge;
	};

	const getBorderPoint = (point: PixelPoint, edge: BorderEdge): PixelPoint => {
		if (edge === 'top') return { x: clamp(point.x, 0, boardWidth), y: 0 };
		if (edge === 'right') return { x: boardWidth, y: clamp(point.y, 0, boardHeight) };
		if (edge === 'bottom') return { x: clamp(point.x, 0, boardWidth), y: boardHeight };
		return { x: 0, y: clamp(point.y, 0, boardHeight) };
	};

	const drawCover = (cover: PIXI.Graphics, point: PixelPoint, edge: BorderEdge, alpha: number) => {
		const length = 112;
		const half = length / 2;
		cover.clear();
		if (edge === 'top' || edge === 'bottom') {
			cover.moveTo(clamp(point.x - half, 0, boardWidth), point.y);
			cover.lineTo(clamp(point.x + half, 0, boardWidth), point.y);
		} else {
			cover.moveTo(point.x, clamp(point.y - half, 0, boardHeight));
			cover.lineTo(point.x, clamp(point.y + half, 0, boardHeight));
		}
		cover.stroke({ color: 0x101417, alpha, width: 6 });
	};

	const drawWave = (wave: PIXI.Graphics, point: PixelPoint, edge: BorderEdge, progress: number) => {
		const length = 122;
		const segments = 18;
		const half = length / 2;
		const fade = 1 - progress;
		const amplitude = Math.sin(progress * Math.PI) * (isTurbo() ? 7 : 11);
		const phase = progress * Math.PI * 2;
		wave.clear();

		for (let index = 0; index <= segments; index += 1) {
			const local = -half + (length * index) / segments;
			const envelope = Math.sin((index / segments) * Math.PI);
			const offset = Math.sin((index / segments) * Math.PI * 4 + phase) * amplitude * envelope;

			let x = point.x;
			let y = point.y;
			if (edge === 'top') {
				x = clamp(point.x + local, 0, boardWidth);
				y = point.y + Math.abs(offset);
			} else if (edge === 'bottom') {
				x = clamp(point.x + local, 0, boardWidth);
				y = point.y - Math.abs(offset);
			} else if (edge === 'right') {
				x = point.x - Math.abs(offset);
				y = clamp(point.y + local, 0, boardHeight);
			} else {
				x = point.x + Math.abs(offset);
				y = clamp(point.y + local, 0, boardHeight);
			}

			if (index === 0) wave.moveTo(x, y);
			else wave.lineTo(x, y);
		}

		wave.stroke({ color: 0x00ff4a, alpha: 0.44 * fade, width: 7 });
		wave.stroke({ color: 0xffffff, alpha: 0.94 * fade, width: 3 });
	};

	const queueBorderWave = (rawPoint: PixelPoint) => {
		const edge = getNearestEdge(rawPoint);
		const point = getBorderPoint(rawPoint, edge);
		const cover = new PIXI.Graphics();
		const wave = new PIXI.Graphics();
		wave.blendMode = 'add';
		layer.addChild(cover, wave);

		waves.push({
			elapsed: 0,
			duration: isTurbo() ? 220 : 360,
			cover,
			wave,
			point,
			edge,
		});
	};

	const queueSquash = () => {
		const display = getDisplay();
		if (!display) return;
		if (squash) squash.display.scale.set(squash.baseScale.x, squash.baseScale.y);
		squash = {
			elapsed: 0,
			duration: isTurbo() ? 120 : 220,
			display,
			baseScale: { x: display.scale.x, y: display.scale.y },
		};
	};

	const syncBounceCount = () => {
		const roundSerial = getRoundSerial();
		const bounceCount = getBounceCount();
		if (roundSerial !== lastRoundSerial) {
			clear();
			return;
		}
		if (bounceCount <= lastBounceCount) {
			lastBounceCount = bounceCount;
			return;
		}
		lastBounceCount = bounceCount;
		if (isSkipPlayback()) return;

		const point = getPoint();
		queueBorderWave(point);
		queueSquash();
	};

	const updateWaves = (deltaMS: number) => {
		for (let index = waves.length - 1; index >= 0; index -= 1) {
			const wave = waves[index];
			wave.elapsed += deltaMS;
			const progress = clamp(wave.elapsed / wave.duration, 0, 1);

			drawCover(wave.cover, wave.point, wave.edge, (1 - progress) * 0.86);
			drawWave(wave.wave, wave.point, wave.edge, progress);
			if (progress >= 1) {
				destroyGraphics(wave.cover);
				destroyGraphics(wave.wave);
				waves.splice(index, 1);
			}
		}
	};

	const updateSquash = (deltaMS: number) => {
		if (!squash) return;
		squash.elapsed += deltaMS;
		const progress = clamp(squash.elapsed / squash.duration, 0, 1);
		const pulse = Math.sin(progress * Math.PI);
		const rebound = Math.sin(progress * Math.PI * 2) * (1 - progress) * 0.05;
		squash.display.scale.set(
			squash.baseScale.x * (1 + pulse * 0.18 + rebound),
			squash.baseScale.y * (1 - pulse * 0.14 - rebound),
		);

		if (progress >= 1) {
			squash.display.scale.set(squash.baseScale.x, squash.baseScale.y);
			squash = undefined;
		}
	};

	const update = (deltaMS: number) => {
		updateWaves(deltaMS);
		updateSquash(deltaMS);
	};

	return {
		clear,
		syncBounceCount,
		update,
	};
};
