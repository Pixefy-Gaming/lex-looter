<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Text, REM } from 'pixi-svelte';

	import { UI, UiGameName } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';
	import { stateBet, stateUrlDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import Anticipations from './Anticipations.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleWinAmount from './TumbleWinAmount.svelte';
	import GlobalMultiplier from './GlobalMultiplier.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import I18nTest from './I18nTest.svelte';
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
			<Anticipations />
			<TumbleWinAmount />
			<GlobalMultiplier />
			<BoardContainer>
				<BouncingLex betAmount={1.0} />
			</BoardContainer>
		</MainContainer>

		<MainContainer>
			<ClusterWinAmounts />
		</MainContainer>

		<UI>
			{#snippet gameName()}
				<UiGameName name="LEX LOOTER" />
			{/snippet}
			{#snippet logo()}
				<Text
					anchor={{ x: 1, y: 0 }}
					text="ADD YOUR LOGO"
					style={{
						fontFamily: 'proxima-nova',
						fontSize: REM * 1.5,
						fontWeight: '600',
						lineHeight: REM * 2,
						fill: 0xffffff,
					}}
				/>
			{/snippet}
		</UI>
		<Win />
		<FreeSpinIntro />
		{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
			<FreeSpinCounter />
		{/if}
		<FreeSpinOutro />
		<Transition />

		<I18nTest />

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
