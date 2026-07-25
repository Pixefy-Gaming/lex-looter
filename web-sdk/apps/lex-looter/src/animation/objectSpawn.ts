import * as PIXI from 'pixi.js';

type ObjectSpawnOptions = {
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

type PopIn = {
	elapsed: number;
	duration: number;
	container: PIXI.Container;
	baseScale: { x: number; y: number };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutBack = (progress: number) => {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
};

export const createObjectSpawnAnimationController = ({
	isTurbo,
	isSkipPlayback,
}: ObjectSpawnOptions) => {
	let knownObjectIds = new Set<string>();
	let animations: PopIn[] = [];

	const cancelContainer = (container: PIXI.Container) => {
		animations = animations.filter((animation) => animation.container !== container);
	};

	const clear = () => {
		for (const animation of animations) {
			animation.container.scale.set(animation.baseScale.x, animation.baseScale.y);
			animation.container.alpha = 1;
		}
		animations = [];
		knownObjectIds = new Set();
	};

	const syncObject = (objectId: string, container: PIXI.Container, resolved: boolean) => {
		if (knownObjectIds.has(objectId)) return;
		knownObjectIds.add(objectId);
		if (resolved || isSkipPlayback()) return;

		const baseScale = { x: container.scale.x, y: container.scale.y };
		container.scale.set(baseScale.x * 0.25, baseScale.y * 0.25);
		container.alpha = 0;
		animations.push({
			elapsed: 0,
			duration: isTurbo() ? 150 : 280,
			container,
			baseScale,
		});
	};

	const forgetMissing = (activeObjectIds: string[]) => {
		const activeSet = new Set(activeObjectIds);
		for (const objectId of knownObjectIds) {
			if (!activeSet.has(objectId)) knownObjectIds.delete(objectId);
		}
	};

	const update = (deltaMS: number) => {
		for (let index = animations.length - 1; index >= 0; index -= 1) {
			const animation = animations[index];
			animation.elapsed += deltaMS;
			const progress = clamp(animation.elapsed / animation.duration, 0, 1);
			const scale = easeOutBack(progress);
			const settle = 1 + Math.sin(progress * Math.PI) * 0.08;
			animation.container.alpha = progress;
			animation.container.scale.set(
				animation.baseScale.x * scale * settle,
				animation.baseScale.y * scale * settle,
			);

			if (progress >= 1) {
				animation.container.alpha = 1;
				animation.container.scale.set(animation.baseScale.x, animation.baseScale.y);
				animations.splice(index, 1);
			}
		}
	};

	return {
		cancelContainer,
		clear,
		forgetMissing,
		syncObject,
		update,
	};
};
