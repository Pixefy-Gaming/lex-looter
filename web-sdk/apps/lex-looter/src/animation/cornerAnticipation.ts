import * as PIXI from 'pixi.js';

import type { PixelPoint } from '../game/notation';
import type { LexCornerKey } from '../game/typesBookEvent';

export type CornerAnticipationTarget = {
	key: LexCornerKey;
	chest: PIXI.Sprite;
	label: PIXI.Text;
	gfx: PIXI.Graphics;
	point: PixelPoint;
};

type CornerAnticipationOptions = {
	layer: PIXI.Container;
	targets: CornerAnticipationTarget[];
	getLexPoint: () => PixelPoint;
	getMultiplier: (key: LexCornerKey) => number | null;
	isRoundActive: () => boolean;
	isTurbo: () => boolean;
	isSkipPlayback: () => boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const createCornerAnticipationController = ({
	layer,
	targets,
	getLexPoint,
	getMultiplier,
	isRoundActive,
	isTurbo,
	isSkipPlayback,
}: CornerAnticipationOptions) => {
	let elapsed = 0;
	const glowMap = new Map<LexCornerKey, PIXI.Graphics>();
	const chestBaseScale = new Map<LexCornerKey, { x: number; y: number }>();

	const getChestBaseScale = (target: CornerAnticipationTarget) => {
		const existing = chestBaseScale.get(target.key);
		if (existing) return existing;
		const baseScale = { x: target.chest.scale.x, y: target.chest.scale.y };
		chestBaseScale.set(target.key, baseScale);
		return baseScale;
	};

	const clear = () => {
		for (const target of targets) {
			const baseScale = getChestBaseScale(target);
			target.chest.alpha = 1;
			target.chest.scale.set(baseScale.x, baseScale.y);
			target.label.scale.set(1);
			target.gfx.alpha = 1;
		}
		for (const glow of glowMap.values()) glow.clear();
	};

	const getGlow = (key: LexCornerKey) => {
		const existing = glowMap.get(key);
		if (existing) return existing;
		const glow = new PIXI.Graphics();
		glow.blendMode = 'add';
		layer.addChild(glow);
		glowMap.set(key, glow);
		return glow;
	};

	const drawCornerGlow = (target: CornerAnticipationTarget, strength: number) => {
		const glow = getGlow(target.key);
		glow.clear();
		if (strength <= 0) return;

		const length = 86;
		const width = 5 + strength * 6;
		const alpha = 0.18 + strength * 0.58;
		const x = target.point.x;
		const y = target.point.y;
		const horizontalDirection = target.key === 'tr' || target.key === 'br' ? -1 : 1;
		const verticalDirection = target.key === 'bl' || target.key === 'br' ? -1 : 1;

		glow.moveTo(x, y);
		glow.lineTo(x + horizontalDirection * length, y);
		glow.moveTo(x, y);
		glow.lineTo(x, y + verticalDirection * length);
		glow.stroke({ color: 0x00ff4a, alpha, width });

		glow.moveTo(x, y);
		glow.lineTo(x + horizontalDirection * length * 0.72, y);
		glow.moveTo(x, y);
		glow.lineTo(x, y + verticalDirection * length * 0.72);
		glow.stroke({ color: 0xffffff, alpha: alpha * 0.85, width: Math.max(2, width * 0.35) });

		if (target.key === 'tr' || target.key === 'br') glow.x = -0.5;
		if (target.key === 'bl' || target.key === 'br') glow.y = -0.5;
	};

	const update = (deltaMS: number) => {
		elapsed += deltaMS;
		if (!isRoundActive() || isSkipPlayback()) {
			clear();
			return;
		}

		const lexPoint = getLexPoint();
		const activeDistance = isTurbo() ? 150 : 210;

		for (const target of targets) {
			const distance = Math.hypot(target.point.x - lexPoint.x, target.point.y - lexPoint.y);
			const closeness =
				getMultiplier(target.key) === null ? 0 : clamp(1 - distance / activeDistance, 0, 1);
			const baseScale = getChestBaseScale(target);
			if (closeness <= 0) {
				target.chest.alpha = 1;
				target.chest.scale.set(baseScale.x, baseScale.y);
				target.label.scale.set(1);
				target.gfx.alpha = 1;
				drawCornerGlow(target, 0);
				continue;
			}
			const pulseSpeed = isTurbo() ? 0.018 : 0.012;
			const pulse = (Math.sin(elapsed * pulseSpeed) + 1) * 0.5;
			const strength = closeness * (0.55 + pulse * 0.45);
			target.chest.alpha = 0.9 + strength * 0.1;
			target.chest.scale.set(
				baseScale.x * (1 + strength * 0.16),
				baseScale.y * (1 + strength * 0.16),
			);
			target.label.scale.set(1 + strength * 0.18);
			target.gfx.alpha = 0.72 + strength * 0.28;
			drawCornerGlow(target, strength);
		}
	};

	return {
		clear,
		update,
	};
};
