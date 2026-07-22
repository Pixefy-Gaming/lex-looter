<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';

	import { GameVersion, Modals } from 'components-ui-html';
	import { stateBet, stateModal, stateUrlDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import TumbleWinAmount from './TumbleWinAmount.svelte';
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import Win from './Win.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import ControlBar from './ControlBar.svelte';
	import ControlBarFreeSpin from './ControlBarFreeSpin.svelte';
	import Transition from './Transition.svelte';
	import BouncingLex from './BouncingLex.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BonusModal from './BonusModal.svelte';
	import ReplayIntro from './ReplayIntro.svelte';
	import { stateXstateDerived } from '../game/stateXstate';

	const context = getContext();
	let showReplayIntro = $state(stateUrlDerived.replay());
	let replayStarting = $state(false);
	let replayStarted = $state(false);
	let replayPlaybackSeen = $state(false);
	let replayRoundSnapshot = $state(stateBet.betToResume);
	const hideControlBar = $derived(stateModal.modal?.name === 'buyBonus');

	const waitForReplayRound = async () => {
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const replayRound = stateBet.betToResume ?? replayRoundSnapshot;
			if (replayRound) return replayRound;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		return stateBet.betToResume ?? replayRoundSnapshot;
	};

	const startReplay = async () => {
		if (replayStarting) return;

		replayStarting = true;
		const replayRound = await waitForReplayRound();

		if (!replayRound) {
			replayStarting = false;
			return;
		}

		replayRoundSnapshot = replayRound;
		stateBet.betToResume = {
			...replayRound,
			event: '0',
			active: true,
		};

		if (replayRound.mode) {
			stateBet.activeBetModeKey = replayRound.mode;
		}

		showReplayIntro = false;
		replayPlaybackSeen = false;
		replayStarted = true;
		await tick();
		context.eventEmitter.broadcast({ type: 'resumeBet' });
		replayStarting = false;
	};

	onMount(() => {
		context.stateLayout.showLoadingScreen = true;
	});

	$effect(() => {
		if (!stateUrlDerived.replay() || !replayStarted) return;

		if (stateXstateDerived.isResumingBet()) {
			replayPlaybackSeen = true;
			return;
		}

		if (replayPlaybackSeen && stateXstateDerived.isIdle()) {
			showReplayIntro = true;
			replayStarted = false;
		}
	});
</script>

<App>
	<BonusModal />
	<EnableSound />
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	<Background />

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		{#if !stateUrlDerived.replay()}
			<ResumeBet />
		{/if}
		<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
		<Sound />

		<MainContainer>
			<TumbleWinAmount />
			<GlobalMultiplier />
			<BoardContainer>
				<BouncingLex betAmount={1.0} />
			</BoardContainer>
		</MainContainer>

		{#if !hideControlBar}
			<ControlBar />
			<ControlBarFreeSpin />
		{/if}
		<Win />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinOutro />
		<Transition />

		{#if showReplayIntro}
			<ReplayIntro onstart={startReplay} starting={replayStarting} again={replayPlaybackSeen} />
		{/if}
	{/if}
</App>

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>
