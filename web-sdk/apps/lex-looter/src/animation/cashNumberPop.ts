import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';

type CashNumberPopOptions = {
	layer: PIXI.Container;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

type CashNumberPopRequest = {
	id: string;
	roundSerial: number;
	point: PixelPoint;
	label: string;
	tint?: number;
};

type CashNumberPop = {
	elapsed: number;
	duration: number;
	point: PixelPoint;
	text: PIXI.Text;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutBack = (progress: number) => {
	const c1 = 1.55;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
};

export const createCashNumberPopController = ({
	layer,
	isTurbo,
	isSkipPlayback,
}: CashNumberPopOptions) => {
	let pops: CashNumberPop[] = [];
	let playedKeys = new Set<string>();

	const clear = () => {
		for (const pop of pops) pop.text.destroy();
		pops = [];
		playedKeys = new Set();
	};

	const queue = ({ id, roundSerial, point, label, tint = 0xfff1a8 }: CashNumberPopRequest) => {
		const key = `${roundSerial}:${id}`;
		if (playedKeys.has(key) || isSkipPlayback()) return;
		playedKeys.add(key);

		const text = new PIXI.Text({
			text: label,
			style: {
				fill: tint,
				fontFamily: 'Jersey 25',
				fontSize: 30,
				fontWeight: '900',
				stroke: { color: 0x321700, width: 4 },
				dropShadow: { color: 0x000000, distance: 3, blur: 2, alpha: 0.72 },
			},
		});
		text.anchor.set(0.5);
		text.x = point.x;
		text.y = point.y - 34;
		text.scale.set(0.42);
		layer.addChild(text);

		pops.push({
			elapsed: 0,
			duration: isTurbo() ? 360 : 680,
			point,
			text,
		});
	};

	const update = (deltaMS: number) => {
		for (let index = pops.length - 1; index >= 0; index -= 1) {
			const pop = pops[index];
			pop.elapsed += deltaMS;
			const progress = clamp(pop.elapsed / pop.duration, 0, 1);
			const scaleProgress = clamp(progress / 0.28, 0, 1);
			const fadeProgress = clamp((progress - 0.66) / 0.34, 0, 1);

			pop.text.scale.set(easeOutBack(scaleProgress));
			pop.text.y = pop.point.y - 34 - 46 * progress;
			pop.text.alpha = 1 - fadeProgress;

			if (progress >= 1) {
				pop.text.destroy();
				pops.splice(index, 1);
			}
		}
	};

	return {
		clear,
		queue,
		update,
	};
};
