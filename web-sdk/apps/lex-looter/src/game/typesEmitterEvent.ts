import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventTumbleWinAmount } from '../components/TumbleWinAmount.svelte';
import type { EmitterEventGlobalMultiplier } from '../components/GlobalMultiplier.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventMultiplierGrid } from '../components/MultiplierGrid.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventTumbleBoard
	| EmitterEventTumbleWinAmount
	| EmitterEventGlobalMultiplier
	| EmitterEventWin
	| EmitterEventSound
	| EmitterEventMultiplierGrid
	| EmitterEventTransition;
