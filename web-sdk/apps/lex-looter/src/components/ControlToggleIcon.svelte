<script lang="ts">
	type Props = {
		kind: 'autoplay' | 'turbo' | 'turbo2';
		active?: boolean;
		size?: 'compact' | 'portrait' | 'landscape';
		label: string;
	};

	const props: Props = $props();
	const iconPath = $derived(
		props.kind === 'autoplay'
			? 'assets/sprites/controlBar/autoplay.svg'
			: 'assets/sprites/controlBar/fast.svg',
	);
</script>

<span
	class="control-toggle-icon"
	class:active={props.active}
	class:compact={props.size === 'compact'}
	class:portrait={props.size === 'portrait'}
	class:landscape={props.size === 'landscape'}
	class:double={props.kind === 'turbo2'}
	class:autoplay={props.kind === 'autoplay'}
	class:turbo={props.kind === 'turbo'}
	aria-hidden="true"
>
	<span class="circle">
		{#if props.kind === 'turbo2'}
			<!-- Two active-speed bolts with a circle-colored separation stroke. -->
			{#each ['bolt-back', 'bolt-front'] as boltClass}
				<svg class="bolt {boltClass}" viewBox="0 0 109.99 110" aria-hidden="true" focusable="false">
					<path
						class="bolt-shape"
						d="M90.51,47.43c-0.02,0.56-0.15,1.08-0.52,1.52l-37.08,51.06c-0.32,0.39-0.82,0.65-1.32,0.65 c-0.93,0-1.67-0.76-1.67-1.67V70.22c0-1.37-0.56-2.64-1.47-3.6c-0.97-0.93-2.25-1.49-3.61-1.49H22.08 c-1.43,0-2.6-1.15-2.6-2.58c0-0.56,0.15-1.06,0.5-1.53L57.07,9.99c0.32-0.39,0.82-0.65,1.32-0.65 c0.93,0,1.67,0.76,1.67,1.65v28.76c0,1.38,0.56,2.64,1.47,3.61c0.97,0.93,2.25,1.47,3.61,1.47h22.77 C89.34,44.84,90.51,46.01,90.51,47.43z"
					/>
				</svg>
			{/each}
		{:else}
			<img class="glyph" src={iconPath} alt={props.label} draggable="false" />
		{/if}
	</span>
</span>

<style>
	.control-toggle-icon {
		display: inline-flex;
		position: relative;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 32px;
		height: 32px;
		box-sizing: border-box;
		background: transparent;
	}

	.circle {
		display: inline-flex;
		position: relative;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		box-sizing: border-box;
		border-radius: 50%;
		background: #fff;
		overflow: hidden;
		transition: background-color 120ms ease;
	}

	.control-toggle-icon.active .circle {
		background: var(--pipee-accent, #00ff50);
	}

	.control-toggle-icon.portrait {
		width: 38px;
		height: 38px;
	}

	.control-toggle-icon.portrait .circle {
		width: 28px;
		height: 28px;
	}

	.control-toggle-icon.landscape {
		width: 47px;
		height: 47px;
	}

	.control-toggle-icon.landscape .circle {
		width: 34px;
		height: 34px;
	}

	.glyph {
		display: block;
		width: 68%;
		height: 68%;
		object-fit: contain;
		filter: brightness(0);
		pointer-events: none;
		user-select: none;
	}

	/* The supplied designs intentionally use different artwork-to-circle ratios. */
	.autoplay .glyph {
		width: 80%;
		height: 80%;
	}

	.turbo .glyph {
		width: 60%;
		height: 60%;
	}

	.double .bolt {
		position: absolute;
		top: 20%;
		width: 60%;
		height: 60%;
		overflow: visible;
	}

	.double .bolt-shape {
		fill: #000;
		stroke: var(--pipee-accent, #00ff50);
		stroke-width: 5;
		stroke-linejoin: round;
		stroke-linecap: round;
		paint-order: stroke fill;
	}

	.double .bolt-back {
		left: 12%;
		z-index: 1;
	}

	.double .bolt-front {
		right: 14%;
		z-index: 2;
	}

	@media (max-width: 360px) {
		.control-toggle-icon.portrait {
			width: 32px;
			height: 32px;
		}

		.control-toggle-icon.portrait .circle {
			width: 24px;
			height: 24px;
		}
	}
</style>
