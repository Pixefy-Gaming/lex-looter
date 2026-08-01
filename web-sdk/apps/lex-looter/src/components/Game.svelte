<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';

	import { GameVersion, Modals } from 'components-ui-html';
	import { stateBet, stateModal, stateUi, stateUrlDerived } from 'state-shared';

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
	import ControlBar from './ControlBar.svelte';
	import Transition from './Transition.svelte';
	import BouncingLex from './BouncingLex.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BonusModal from './BonusModal.svelte';
	import ReplayIntro from './ReplayIntro.svelte';
	import RoundEndResult from './RoundEndResult.svelte';
	import { stateXstateDerived } from '../game/stateXstate';

	const context = getContext();
	let showReplayIntro = $state(stateUrlDerived.replay());
	let replayStarting = $state(false);
	let replayPlaybackSeen = $state(false);
	const hideControlBar = $derived(stateModal.modal?.name === 'buyBonus');

	const cloneReplayBet = () =>
		stateBet.replayBet ? JSON.parse(JSON.stringify(stateBet.replayBet)) : null;

	const waitForReplayRound = async () => {
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const replayRound = cloneReplayBet() ?? stateBet.betToResume;
			if (replayRound) return replayRound;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		return cloneReplayBet() ?? stateBet.betToResume;
	};

	const startReplay = async () => {
		if (replayStarting) return;

		replayStarting = true;
		const replayRound = await waitForReplayRound();

		if (!replayRound) {
			replayStarting = false;
			return;
		}

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
		stateUi.config.replayStatus = 'playing';
		await tick();
		context.eventEmitter.broadcast({ type: 'resumeBet' });
		replayStarting = false;
	};

	onMount(() => {
		context.stateLayout.showLoadingScreen = true;
	});

	$effect(() => {
		if (!stateUrlDerived.replay() || stateUi.config.replayStatus !== 'playing') return;

		if (stateXstateDerived.isResumingBet()) {
			replayPlaybackSeen = true;
			return;
		}

		if (replayPlaybackSeen && stateXstateDerived.isIdle()) {
			showReplayIntro = true;
			stateUi.config.replayStatus = 'finished';
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
		{/if}
		<Win />
		<Transition />

		{#if showReplayIntro}
			<ReplayIntro onstart={startReplay} starting={replayStarting} again={replayPlaybackSeen} />
		{/if}
	{/if}
</App>

<RoundEndResult />

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>
