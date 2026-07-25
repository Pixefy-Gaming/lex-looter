import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';
import type { LexObjectName } from '../game/typesBookEvent';

type BurstParticle = {
	display: PIXI.Graphics;
	angle: number;
	distance: number;
	radius: number;
};

type PickupBurst = {
	elapsed: number;
	duration: number;
	point: PixelPoint;
	ring: PIXI.Graphics;
	particles: BurstParticle[];
};

type PickupBurstOptions = {
	layer: PIXI.Container;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

type PickupBurstRequest = {
	objectId: string;
	roundSerial: number;
	object: LexObjectName;
	point: PixelPoint;
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export const createPickupBurstController = ({
	layer,
	isTurbo,
	isSkipPlayback,
}: PickupBurstOptions) => {
	let bursts: PickupBurst[] = [];
	let lastResolvedKey = '';

	const clear = () => {
		for (const burst of bursts) {
			burst.ring.destroy();
			for (const particle of burst.particles) particle.display.destroy();
		}
		bursts = [];
		lastResolvedKey = '';
	};

	const queue = ({ objectId, roundSerial, object, point }: PickupBurstRequest) => {
		const key = `${roundSerial}:${objectId}`;
		if (key === lastResolvedKey || isSkipPlayback()) return;
		lastResolvedKey = key;

		const color = OBJECT_COLORS[object];
		const duration = isTurbo() ? 240 : 520;
		const ring = new PIXI.Graphics();
		ring.circle(0, 0, 12);
		ring.stroke({ color, alpha: 0.95, width: 4 });
		ring.x = point.x;
		ring.y = point.y;
		ring.blendMode = 'add';
		layer.addChild(ring);

		const particleCount = object === 'slayer' ? 14 : 10;
		const particles = Array.from({ length: particleCount }, (_, index) => {
			const angle = (Math.PI * 2 * index) / particleCount;
			const radius = object === 'diamond' ? 4.5 : 3.6;
			const display = new PIXI.Graphics();
			if (object === 'diamond') {
				display.moveTo(0, -radius);
				display.lineTo(radius, 0);
				display.lineTo(0, radius);
				display.lineTo(-radius, 0);
				display.closePath();
				display.fill({ color, alpha: 0.96 });
			} else {
				display.circle(0, 0, radius);
				display.fill({ color, alpha: 0.92 });
			}
			display.x = point.x;
			display.y = point.y;
			display.blendMode = 'add';
			layer.addChild(display);
			return {
				display,
				angle,
				distance: object === 'heart' ? 48 : object === 'slayer' ? 62 : 42,
				radius,
			};
		});

		bursts.push({
			elapsed: 0,
			duration,
			point,
			ring,
			particles,
		});
	};

	const update = (deltaMS: number) => {
		for (let index = bursts.length - 1; index >= 0; index -= 1) {
			const burst = bursts[index];
			burst.elapsed += deltaMS;
			const progress = clamp(burst.elapsed / burst.duration, 0, 1);
			const eased = easeOutCubic(progress);
			const alpha = 1 - progress;

			burst.ring.scale.set(1 + eased * 2.1);
			burst.ring.alpha = alpha;

			for (const particle of burst.particles) {
				const distance = particle.distance * eased;
				particle.display.x = burst.point.x + Math.cos(particle.angle) * distance;
				particle.display.y = burst.point.y + Math.sin(particle.angle) * distance;
				particle.display.alpha = alpha;
				particle.display.scale.set(1 + progress * 0.45);
			}

			if (progress >= 1) {
				burst.ring.destroy();
				for (const particle of burst.particles) particle.display.destroy();
				bursts.splice(index, 1);
			}
		}
	};

	return {
		clear,
		queue,
		update,
	};
};
