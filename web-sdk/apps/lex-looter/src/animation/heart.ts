import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';

export type HeartHudSlot = {
	container: PIXI.Container;
	baseLayer: PIXI.Container;
	effectLayer: PIXI.Container;
};

type HeartDisplay = PIXI.Sprite | PIXI.Graphics;

type HeartHudAnimation =
	| {
			kind: 'gain';
			elapsed: number;
			duration: number;
			display: HeartDisplay;
			from: PixelPoint;
			to: PixelPoint;
			targetSlot: number;
			baseScale: PixelPoint;
	  }
	| {
			kind: 'loss';
			elapsed: number;
			duration: number;
			display: HeartDisplay;
			crack: PIXI.Graphics;
			slot: number;
			baseScale: PixelPoint;
	  };

type HeartHudAnimationOptions = {
	heartHud: HeartHudSlot[];
	hudLayer: PIXI.Container;
	createHeartDisplay: (filled: boolean) => HeartDisplay;
	getSourcePoint: () => PixelPoint;
	getShieldCount: () => number;
	getRoundSerial: () => number;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);
const easeInCubic = (progress: number) => progress * progress * progress;
const easeOutBack = (progress: number) => {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
};

const clearContainer = (container: PIXI.Container) => {
	for (const child of container.removeChildren()) child.destroy();
};

const destroyDisplay = (display: PIXI.Container | PIXI.Graphics | PIXI.Sprite) => {
	display.parent?.removeChild(display);
	display.destroy();
};

const createHeartCrack = () => {
	const crack = new PIXI.Graphics();
	crack.moveTo(0, -12);
	crack.lineTo(5, -5);
	crack.lineTo(-1, 0);
	crack.lineTo(6, 8);
	crack.lineTo(1, 14);
	crack.stroke({ color: 0xffffff, alpha: 0.92, width: 3 });
	crack.alpha = 0;
	return crack;
};

export const createHeartHudAnimationController = ({
	heartHud,
	hudLayer,
	createHeartDisplay,
	getSourcePoint,
	getShieldCount,
	getRoundSerial,
	isTurbo,
	isSkipPlayback,
}: HeartHudAnimationOptions) => {
	let lastAnimatedShieldCount: number | undefined;
	let lastAnimatedShieldRoundSerial = getRoundSerial();
	let animations: HeartHudAnimation[] = [];

	const getHeartSlotPoint = (slotIndex: number): PixelPoint => ({
		x: heartHud[slotIndex]?.container.x ?? 0,
		y: heartHud[slotIndex]?.container.y ?? 0,
	});

	const clear = () => {
		for (const animation of animations) {
			destroyDisplay(animation.display);
			if (animation.kind === 'loss') destroyDisplay(animation.crack);
		}
		animations = [];
		for (const heartSlot of heartHud) {
			heartSlot.baseLayer.alpha = 1;
			heartSlot.baseLayer.scale.set(1);
			clearContainer(heartSlot.effectLayer);
		}
	};

	const queueGain = (slot: number) => {
		const display = createHeartDisplay(true);
		const from = getSourcePoint();
		const to = getHeartSlotPoint(slot);
		const baseScale = { x: display.scale.x, y: display.scale.y };
		display.x = from.x;
		display.y = from.y;
		display.scale.set(baseScale.x * 0.8, baseScale.y * 0.8);
		hudLayer.addChild(display);
		animations.push({
			kind: 'gain',
			elapsed: 0,
			duration: isTurbo() ? 260 : 760,
			display,
			from,
			to,
			targetSlot: slot,
			baseScale,
		});
	};

	const queueLoss = (slot: number) => {
		const display = createHeartDisplay(true);
		const crack = createHeartCrack();
		const baseScale = { x: display.scale.x, y: display.scale.y };
		heartHud[slot]?.effectLayer.addChild(display, crack);
		animations.push({
			kind: 'loss',
			elapsed: 0,
			duration: isTurbo() ? 240 : 640,
			display,
			crack,
			slot,
			baseScale,
		});
	};

	const syncShieldCount = () => {
		const currentRoundSerial = getRoundSerial();
		const nextShieldCount = clamp(getShieldCount(), 0, heartHud.length);

		if (lastAnimatedShieldRoundSerial !== currentRoundSerial) {
			clear();
			lastAnimatedShieldRoundSerial = currentRoundSerial;
			lastAnimatedShieldCount = nextShieldCount;
			return;
		}

		if (lastAnimatedShieldCount === undefined) {
			lastAnimatedShieldCount = nextShieldCount;
			return;
		}

		const previousShieldCount = clamp(lastAnimatedShieldCount, 0, heartHud.length);
		if (previousShieldCount === nextShieldCount) return;

		if (isSkipPlayback()) {
			clear();
			lastAnimatedShieldCount = nextShieldCount;
			return;
		}

		if (nextShieldCount > previousShieldCount) {
			for (let slot = previousShieldCount; slot < nextShieldCount; slot += 1) queueGain(slot);
		} else {
			for (let slot = nextShieldCount; slot < previousShieldCount; slot += 1) queueLoss(slot);
		}

		lastAnimatedShieldCount = nextShieldCount;
	};

	const isGainHidingSlot = (slot: number) =>
		animations.some(
			(animation) =>
				animation.kind === 'gain' &&
				animation.targetSlot === slot &&
				animation.elapsed < animation.duration * 0.78,
		);

	const update = (deltaMS: number) => {
		for (let index = animations.length - 1; index >= 0; index -= 1) {
			const animation = animations[index];
			animation.elapsed += deltaMS;
			const progress = clamp(animation.elapsed / animation.duration, 0, 1);

			if (animation.kind === 'gain') {
				const eased = easeOutCubic(progress);
				animation.display.x = lerp(animation.from.x, animation.to.x, eased);
				animation.display.y =
					lerp(animation.from.y, animation.to.y, eased) - Math.sin(progress * Math.PI) * 38;
				const scalePulse =
					progress < 0.24
						? lerp(0.78, 1.24, easeOutBack(progress / 0.24))
						: lerp(1.06, 0.92, progress);
				animation.display.scale.set(
					animation.baseScale.x * scalePulse,
					animation.baseScale.y * scalePulse,
				);
				animation.display.alpha = progress < 0.88 ? 1 : 1 - (progress - 0.88) / 0.12;

				const targetSlot = heartHud[animation.targetSlot];
				if (targetSlot) {
					const revealProgress = clamp((progress - 0.72) / 0.22, 0, 1);
					targetSlot.baseLayer.alpha = revealProgress;
					const popScale = 1 + Math.sin(revealProgress * Math.PI) * 0.24;
					targetSlot.baseLayer.scale.set(popScale);
				}
			} else {
				const shake = Math.sin(progress * Math.PI * 10) * (1 - progress) * 0.12;
				const fadeProgress = clamp((progress - 0.42) / 0.42, 0, 1);
				const crackProgress = clamp((progress - 0.14) / 0.22, 0, 1);
				animation.display.rotation = shake;
				animation.display.alpha = 1 - easeInCubic(fadeProgress);
				const scalePulse =
					progress < 0.28
						? 1 + Math.sin((progress / 0.28) * Math.PI) * 0.3
						: lerp(1, 0.52, fadeProgress);
				animation.display.scale.set(
					animation.baseScale.x * scalePulse,
					animation.baseScale.y * scalePulse,
				);
				animation.crack.alpha = crackProgress < 1 ? crackProgress : 1 - fadeProgress;
				animation.crack.scale.set(1 + crackProgress * 0.12);
			}

			if (progress >= 1) {
				if (animation.kind === 'gain') {
					const targetSlot = heartHud[animation.targetSlot];
					if (targetSlot) {
						targetSlot.baseLayer.alpha = 1;
						targetSlot.baseLayer.scale.set(1);
					}
				} else {
					const targetSlot = heartHud[animation.slot];
					if (targetSlot) targetSlot.baseLayer.scale.set(1);
					destroyDisplay(animation.crack);
				}
				destroyDisplay(animation.display);
				animations.splice(index, 1);
			}
		}
	};

	return {
		clear,
		isGainHidingSlot,
		syncShieldCount,
		update,
	};
};
