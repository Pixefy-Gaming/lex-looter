<script lang="ts">
	import { stateBet } from 'state-shared';

	import RoundEndResult from '../components/RoundEndResult.svelte';
	import { getLexRoundDisplayWin } from '../game/lexWin';
	import { createInitialLexPlaybackState, stateGame } from '../game/stateGame.svelte';
	import type { LexRoundEndReason } from '../game/typesBookEvent';

	const EXAMPLES: {
		label: string;
		amount: number;
		reason: LexRoundEndReason;
		tumbleValue?: number;
	}[] = [
		{ label: 'ESCAPED 1.2x', amount: 120, reason: 'escape' },
		{ label: 'HIT LIMIT 1.2x', amount: 120, reason: 'bounceLimit' },
		{ label: 'HIT LIMIT $4.76', amount: 2, tumbleValue: 476, reason: 'bounceLimit' },
		{ label: 'BIG WIN 10x', amount: 1000, reason: 'cornerHit' },
		{ label: 'SUPER WIN 25x', amount: 2500, reason: 'cornerHit' },
		{ label: 'MEGA WIN 50x', amount: 5000, reason: 'cornerHit' },
		{ label: 'EPIC WIN 100x', amount: 10000, reason: 'cornerHit' },
	];

	const showResult = (amount: number, reason: LexRoundEndReason, tumbleValue = amount) => {
		const roundSerial = stateGame.lex.roundSerial + 1;
		stateBet.currency = 'USD';
		stateBet.betAmount = 1;
		stateBet.wageredBetAmount = 1;
		stateBet.winBookEventAmount = getLexRoundDisplayWin({
			reason,
			totalWin: amount,
			tumbleValue,
		});
		stateGame.lex = {
			...createInitialLexPlaybackState(),
			roundSerial,
			roundEnded: true,
			roundEndReason: reason,
			totalWin: amount,
			tumbleValue,
		};
	};

	$effect(() => {
		if (stateGame.lex.roundSerial === 0) {
			showResult(EXAMPLES[0].amount, EXAMPLES[0].reason, EXAMPLES[0].tumbleValue);
		}
	});
</script>

<div class="debug-stage">
	<div class="debug-toolbar">
		{#each EXAMPLES as example}
			<button
				type="button"
				onclick={() => showResult(example.amount, example.reason, example.tumbleValue)}
			>
				{example.label}
			</button>
		{/each}
	</div>

	<RoundEndResult />
</div>

<style>
	.debug-stage {
		position: relative;
		min-height: 100vh;
		background:
			linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)),
			repeating-linear-gradient(
				45deg,
				#182030,
				#182030 16px,
				#202a3d 16px,
				#202a3d 32px
			);
	}

	.debug-toolbar {
		position: relative;
		z-index: 10001;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 16px;
	}

	button {
		border: 1px solid rgba(255, 255, 255, 0.24);
		border-radius: 6px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.58);
		color: #ffffff;
		font: 600 13px/1.2 system-ui, sans-serif;
		cursor: pointer;
	}

	button:hover {
		background: rgba(40, 255, 140, 0.22);
	}
</style>
