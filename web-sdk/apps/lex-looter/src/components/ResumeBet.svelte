<script lang="ts">
	import { stateBet } from 'state-shared';
	import { onMount } from 'svelte';

	onMount(() => {
		if (stateBet.betToResume?.active && stateBet.betToResume.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
	});
</script>
