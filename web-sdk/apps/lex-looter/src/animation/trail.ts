import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';

type TrailDot = {
	elapsed: number;
	duration: number;
	display: PIXI.Graphics;
	startRadius: number;
};

type TrailOptions = {
	layer: PIXI.Container;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const createLexTrailController = ({ layer, isTurbo, isSkipPlayback }: TrailOptions) => {
	let dots: TrailDot[] = [];
	let lastPoints: Record<string, PixelPoint> = {};
	let spawnDistances: Record<string, number> = {};

	const clear = () => {
		for (const dot of dots) dot.display.destroy();
		dots = [];
		lastPoints = {};
		spawnDistances = {};
		layer.removeChildren();
	};

	const add = (point: PixelPoint, isClone = false, id = 'main') => {
		if (isSkipPlayback()) return;

		const lastPoint = lastPoints[id];
		if (lastPoint) {
			spawnDistances[id] =
				(spawnDistances[id] ?? 0) + Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
		}
		lastPoints[id] = { ...point };

		const minimumDistance = isTurbo() ? 16 : 22;
		if ((spawnDistances[id] ?? 0) < minimumDistance) return;
		spawnDistances[id] = 0;

		const display = new PIXI.Graphics();
		const color = isClone ? 0x5cff94 : 0xffffff;
		const radius = isTurbo() ? 7 : 5.5;
		display.circle(0, 0, radius);
		display.fill({ color, alpha: isClone ? 0.34 : 0.42 });
		display.x = point.x;
		display.y = point.y;
		display.blendMode = 'add';
		layer.addChildAt(display, 0);

		dots.push({
			elapsed: 0,
			duration: isTurbo() ? 260 : 420,
			display,
			startRadius: radius,
		});
	};

	const update = (deltaMS: number) => {
		for (let index = dots.length - 1; index >= 0; index -= 1) {
			const dot = dots[index];
			dot.elapsed += deltaMS;
			const progress = clamp(dot.elapsed / dot.duration, 0, 1);
			const alpha = (1 - progress) * 0.42;
			const scale = 1 + progress * 1.7;
			dot.display.alpha = alpha;
			dot.display.scale.set(scale);

			if (progress >= 1) {
				dot.display.destroy();
				dots.splice(index, 1);
			}
		}
	};

	return {
		add,
		clear,
		update,
	};
};
