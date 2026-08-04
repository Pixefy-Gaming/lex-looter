<script lang="ts">
	import { stateBet, stateModal, type BetModeData } from 'state-shared';
	import { Button } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BaseIcon from './BaseIcon.svelte';
	import BonusCard from './BonusCard.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		list: BetModeData[];
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	const GAME_ASSET_URL = './assets/lex/game-asset.png';
	const GAME_ASSET_SIZE = { width: 1873, height: 1321 };
	const BONUS_ICON_FRAMES: Record<string, { x: number; y: number; width: number; height: number }> =
		{
			// Coordinates come from the current lex/game-asset.json atlas.
			'ante.png': { x: 543, y: 396, width: 442, height: 408 }, // Legacy alias: noHeart.png
			'noHeart.png': { x: 543, y: 396, width: 442, height: 408 },
			'heart.png': { x: 985, y: 396, width: 443, height: 410 },
			startClone: { x: 517, y: 0, width: 484, height: 386 },
			'startClone.png': { x: 517, y: 0, width: 484, height: 386 },
			luckylex: { x: 0, y: 0, width: 517, height: 374 },
			'luckylex.png': { x: 0, y: 0, width: 517, height: 374 },
		};
</script>

{#each props.list as betModeData}
	{#if betModeData.type !== 'default'}
		<BonusCard>
			{#snippet image()}
				{@const frame = BONUS_ICON_FRAMES[betModeData.assets.icon]}
				{#if frame}
					<svg
						class="bonus-image"
						viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
						preserveAspectRatio="xMidYMid meet"
					>
						<image
							href={GAME_ASSET_URL}
							width={GAME_ASSET_SIZE.width}
							height={GAME_ASSET_SIZE.height}
						/>
					</svg>
				{/if}
			{/snippet}

			{#snippet title()}
				<div class="title">
					{betModeData.text.title}
				</div>
			{/snippet}

			{#snippet description()}
				{#if betModeData?.text?.description}
					<div class="description">
						{betModeData.text.description}
					</div>
				{/if}
			{/snippet}

			{#snippet price()}
				<div class="price">
					{`${numberToCurrencyString(stateBet.betAmount * betModeData.costMultiplier)}`}
				</div>
				<div class="cost-formula">
					{`${numberToCurrencyString(stateBet.betAmount)} × x${betModeData.costMultiplier}`}
				</div>
			{/snippet}

			{#snippet button()}
				{@const isActive = stateBet.activeBetModeKey === betModeData.mode}
				<Button
					onclick={() => {
						stateBonus.selectedBetModeKey = betModeData.mode;
						stateBet.activeBetModeKey = betModeData.mode;
						stateModal.modal = null;
						eventEmitter.broadcast({ type: 'soundPressGeneral' });
					}}
					disabled={isActive ||
						stateBet.betAmount <= 0 ||
						stateBet.balanceAmount < stateBet.betAmount * betModeData.costMultiplier}
				>
					<BaseIcon width="100%" height="2rem" border="2px solid white;" />
					<BaseButtonContent>
						<span style="font-size: 1rem;">{isActive ? 'ACTIVE' : betModeData.text.button}</span>
					</BaseButtonContent>
				</Button>
			{/snippet}
		</BonusCard>
	{/if}
{/each}

<style lang="scss">
	.title {
		font-size: 1rem;
		line-height: 1rem;
		text-align: center;
	}

	.bonus-image {
		width: min(9.25rem, 100%);
		height: 6.5rem;
		object-fit: contain;
		align-self: center;
		display: block;
		overflow: hidden;
	}

	.description {
		font-size: 0.75rem;
		text-align: center;
		min-height: 4rem;
		white-space: pre-line;
		display: inline-flex;
		align-items: center;
	}

	.description:empty {
		display: none;
	}

	.price {
		font-size: 1rem;
		line-height: 1rem;
		text-align: center;
		white-space: nowrap;
	}

	.cost-formula {
		font-size: 0.7rem;
		line-height: 0.8rem;
		text-align: center;
		opacity: 0.75;
		white-space: nowrap;
	}
</style>
