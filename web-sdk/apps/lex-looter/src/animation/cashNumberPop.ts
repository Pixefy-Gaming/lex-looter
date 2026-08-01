import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';

type CashNumberPopOptions = {
	layer: PIXI.Container;
	boardWidth: number;
	boardHeight: number;
	getViewport: () => {
		width: number;
		height: number;
		layoutType: 'desktop' | 'tablet' | 'landscape' | 'portrait';
	};
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
	riseOffset: number;
	riseDistance: number;
	edgePadding: number;
	text: PIXI.Text;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isStakePopoutViewport = (width: number, height: number) =>
	width <= 900 && height <= 520 && width / Math.max(height, 1) >= 1.55;
const getResponsiveProfile = ({
	width,
	height,
	layoutType,
}: ReturnType<CashNumberPopOptions['getViewport']>) => {
	const shortestSide = Math.min(width, height);
	const isPopout = layoutType === 'landscape' && isStakePopoutViewport(width, height);
	const isPopoutS = isPopout && width <= 500;
	const isPortrait = layoutType === 'portrait';
	const scale = isPopoutS
		? 1.75
		: isPopout
			? 1.25
			: isPortrait
				? clamp(480 / Math.max(shortestSide, 1), 1.25, 1.55)
				: clamp(1200 / Math.max(width, 1), 1, 1.08);

	return {
		fontSize: Math.round(30 * scale),
		strokeWidth: Math.round(clamp(4 * scale, 4, 7)),
		shadowDistance: Math.round(clamp(3 * scale, 3, 5)),
		riseOffset: 34 * scale,
		riseDistance: 46 * scale,
		edgePadding: 24 * scale,
	};
};
const easeOutBack = (progress: number) => {
	const c1 = 1.55;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
};

export const createCashNumberPopController = ({
	layer,
	boardWidth,
	boardHeight,
	getViewport,
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

		const profile = getResponsiveProfile(getViewport());
		const text = new PIXI.Text({
			text: label,
			style: {
				fill: tint,
				fontFamily: 'Jersey 25',
				fontSize: profile.fontSize,
				fontWeight: '900',
				stroke: { color: 0x321700, width: profile.strokeWidth },
				dropShadow: {
					color: 0x000000,
					distance: profile.shadowDistance,
					blur: 2,
					alpha: 0.72,
				},
			},
		});
		text.anchor.set(0.5);
		text.x = clamp(point.x, profile.edgePadding, boardWidth - profile.edgePadding);
		text.y = clamp(
			point.y - profile.riseOffset,
			profile.edgePadding,
			boardHeight - profile.edgePadding,
		);
		text.scale.set(0.42);
		layer.addChild(text);

		pops.push({
			elapsed: 0,
			duration: isTurbo() ? 360 : 680,
			point: {
				x: text.x,
				y: point.y,
			},
			riseOffset: profile.riseOffset,
			riseDistance: profile.riseDistance,
			edgePadding: profile.edgePadding,
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
			pop.text.y = clamp(
				pop.point.y - pop.riseOffset - pop.riseDistance * progress,
				pop.edgePadding,
				boardHeight - pop.edgePadding,
			);
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
