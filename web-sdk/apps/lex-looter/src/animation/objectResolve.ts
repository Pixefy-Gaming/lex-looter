import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';
import type { LexObjectName } from '../game/typesBookEvent';

type ResolveStyleOptions = {
	layer: PIXI.Container;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

type ResolveRequest = {
	objectId: string;
	roundSerial: number;
	object: LexObjectName;
	container: PIXI.Container;
	point: PixelPoint;
};

type ResolveAnimation = {
	elapsed: number;
	duration: number;
	container: PIXI.Container;
	baseScale: { x: number; y: number };
	particles: {
		display: PIXI.Graphics;
		angle: number;
		distance: number;
	}[];
};

const OBJECT_COLORS: Record<LexObjectName, number> = {
	coin: 0xffd24a,
	diamond: 0x4dffb8,
	blue_blob: 0x4aa3ff,
	chest: 0xb87836,
	escape: 0xffb15a,
	slayer: 0xff3d3d,
	clone_orb: 0x00e701,
	heart: 0xff5a7a,
};

const FINAL_ALPHA = 0;
const FINAL_SCALE_X = 1.36;
const FINAL_SCALE_Y = 0.16;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export const createObjectResolveAnimationController = ({
	layer,
	isTurbo,
	isSkipPlayback,
}: ResolveStyleOptions) => {
	let resolvedKeys = new Set<string>();
	let animations: ResolveAnimation[] = [];

	const destroyParticles = (animation: ResolveAnimation) => {
		for (const particle of animation.particles) particle.display.destroy();
	};

	const setResolvedRestingStyle = (
		container: PIXI.Container,
		baseScale?: { x: number; y: number },
	) => {
		const scale = baseScale ?? { x: 1, y: 1 };
		container.alpha = FINAL_ALPHA;
		container.scale.set(scale.x * FINAL_SCALE_X, scale.y * FINAL_SCALE_Y);
	};

	const clear = () => {
		for (const animation of animations) {
			destroyParticles(animation);
			setResolvedRestingStyle(animation.container, animation.baseScale);
		}
		animations = [];
		resolvedKeys = new Set();
	};

	const cancelContainer = (container: PIXI.Container) => {
		animations = animations.filter((animation) => {
			if (animation.container !== container) return true;
			destroyParticles(animation);
			return false;
		});
	};

	const forgetMissing = (activeObjectIds: string[]) => {
		const activeSet = new Set(activeObjectIds);
		for (const key of resolvedKeys) {
			const [, objectId] = key.split(':');
			if (!activeSet.has(objectId)) resolvedKeys.delete(key);
		}
	};

	const syncResolvedObject = ({
		objectId,
		roundSerial,
		object,
		container,
		point,
	}: ResolveRequest) => {
		if (object === 'slayer' || object === 'escape') return;
		const key = `${roundSerial}:${objectId}`;
		if (resolvedKeys.has(key)) return;
		resolvedKeys.add(key);

		const baseScale = { x: container.scale.x, y: container.scale.y };
		if (isSkipPlayback()) {
			setResolvedRestingStyle(container, baseScale);
			return;
		}

		const color = OBJECT_COLORS[object];
		const particleCount = object === 'diamond' || object === 'chest' ? 12 : 8;
		const particles = Array.from({ length: particleCount }, (_, index) => {
			const angle = (Math.PI * 2 * index) / particleCount;
			const display = new PIXI.Graphics();
			display.circle(0, 0, object === 'diamond' ? 3.8 : 3);
			display.fill({ color, alpha: 0.82 });
			display.x = point.x;
			display.y = point.y;
			display.blendMode = 'add';
			layer.addChild(display);
			return {
				display,
				angle,
				distance: object === 'chest' ? 46 : 34,
			};
		});

		container.alpha = 1;
		container.scale.set(baseScale.x, baseScale.y);
		animations.push({
			elapsed: 0,
			duration: isTurbo() ? 220 : 420,
			container,
			baseScale,
			particles,
		});
	};

	const update = (deltaMS: number) => {
		for (let index = animations.length - 1; index >= 0; index -= 1) {
			const animation = animations[index];
			animation.elapsed += deltaMS;
			const progress = clamp(animation.elapsed / animation.duration, 0, 1);
			const eased = easeOutCubic(progress);
			const flatten = Math.sin(progress * Math.PI * 0.5);

			animation.container.alpha = 1 - (1 - FINAL_ALPHA) * eased;
			animation.container.scale.set(
				animation.baseScale.x * (1 + (FINAL_SCALE_X - 1) * flatten),
				animation.baseScale.y * (1 + (FINAL_SCALE_Y - 1) * flatten),
			);

			for (const particle of animation.particles) {
				const distance = particle.distance * eased;
				particle.display.x = animation.container.x + Math.cos(particle.angle) * distance;
				particle.display.y = animation.container.y + Math.sin(particle.angle) * distance * 0.52;
				particle.display.alpha = 1 - progress;
				particle.display.scale.set(1 + progress * 0.36);
			}

			if (progress >= 1) {
				destroyParticles(animation);
				setResolvedRestingStyle(animation.container, animation.baseScale);
				animations.splice(index, 1);
			}
		}
	};

	return {
		cancelContainer,
		clear,
		forgetMissing,
		setResolvedRestingStyle,
		syncResolvedObject,
		update,
	};
};
