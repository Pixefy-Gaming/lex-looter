import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { createInitialLexPlaybackState, stateGame, stateGameDerived } from './stateGame.svelte';
import { getLexRoundDisplayWin } from './lexWin';
import type { SoundEffectName } from './sound';
import type { BookEvent, BookEventOfType, BookEventContext, LexObjectName } from './typesBookEvent';
import type { Position } from './types';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

const LEX_OBJECT_SOUND_MAP: Record<LexObjectName, SoundEffectName> = {
	coin: 'gold-coin',
	diamond: 'diamond',
	blue_blob: 'hit-blue-blob',
	chest: 'hit-chest',
	escape: 'escape',
	slayer: 'slayer',
	clone_orb: 'clone',
	heart: 'hit-heart',
};

const NORMAL_LEX_PLAYBACK_DURATION_SCALE = 0.55;

const waitLexPlaybackStepInterruptible = async (duration = 220) => {
	if (stateGame.lexSkipPlayback) return;
	const timeoutDuration = stateBet.isTurbo
		? Math.round(duration * 0.18)
		: Math.round(duration * NORMAL_LEX_PLAYBACK_DURATION_SCALE);
	await new Promise<void>((resolve) => {
		let resolved = false;
		const finish = () => {
			if (resolved) return;
			resolved = true;
			clearTimeout(timeout);
			clearInterval(interval);
			resolve();
		};
		const timeout = setTimeout(finish, timeoutDuration);
		const interval = setInterval(() => {
			if (stateGame.lexSkipPlayback) finish();
		}, 16);
	});
};

const applyCloneSnapshots = (clones: BookEventOfType<'bounceUpdate'>['clones'] = []) => {
	const nextClones = { ...stateGame.lex.clones };
	for (const clone of clones) {
		if (!clone.alive) {
			delete nextClones[clone.id];
			continue;
		}
		const existingClone = nextClones[clone.id];
		nextClones[clone.id] = {
			id: clone.id,
			notation: clone.notation,
			path: clone.path?.length ? [...clone.path] : [clone.from, clone.to],
			vector: clone.vector ?? existingClone?.vector ?? { dx: 1, dy: 1 },
			hitsRemaining: clone.hitsRemaining ?? existingClone?.hitsRemaining ?? 0,
			alive: clone.alive,
		};
	}
	stateGame.lex.clones = nextClones;
	stateGame.lex.cloneCount = Object.keys(nextClones).length;
};

const applyCloneUpdates = (cloneUpdates: BookEventOfType<'bounceUpdate'>['cloneUpdates'] = []) => {
	applyCloneSnapshots(cloneUpdates);
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	roundStart: async (bookEvent: BookEventOfType<'roundStart'>) => {
		stateGame.lexSkipPlayback = false;
		const nextRoundSerial = stateGame.lex.roundSerial + 1;
		stateGame.lex = {
			...createInitialLexPlaybackState(),
			roundSerial: nextRoundSerial,
			mode: bookEvent.mode,
			board: bookEvent.board,
			lexNotation: bookEvent.lexStart,
			lexPath: [bookEvent.lexStart],
			lexVector: bookEvent.lexVector,
			betCost: bookEvent.betCost,
			modeMultiplier: bookEvent.modeMultiplier,
			mainAlive: true,
			cloneCount: bookEvent.cloneCount,
			clones: {},
		};
		applyCloneSnapshots(bookEvent.clones);
		stateGame.lex.cloneCount = bookEvent.cloneCount;
		stateBet.winBookEventAmount = 0;
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		eventEmitter.broadcast({ type: 'soundLoop', name: 'running' });
		await waitLexPlaybackStepInterruptible(250);
	},
	cornerUpdate: async (bookEvent: BookEventOfType<'cornerUpdate'>) => {
		if (bookEvent.mainBounces > stateGame.lex.mainBounces) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'bounce', forcePlay: true });
		}
		stateGame.lex.mainBounces = bookEvent.mainBounces;
		stateGame.lex.corners = { ...bookEvent.corners };
		await waitLexPlaybackStepInterruptible(120);
	},
	bounceUpdate: async (bookEvent: BookEventOfType<'bounceUpdate'>) => {
		if (bookEvent.mainBounces > stateGame.lex.mainBounces) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'bounce', forcePlay: true });
		}
		stateGame.lex.lexPath = bookEvent.path?.length
			? [...bookEvent.path]
			: [bookEvent.from, bookEvent.to];
		stateGame.lex.lexNotation = bookEvent.to;
		stateGame.lex.mainBounces = bookEvent.mainBounces;
		stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		stateGame.lex.mainAlive = bookEvent.mainAlive ?? stateGame.lex.mainAlive;
		applyCloneSnapshots(bookEvent.clones);
		applyCloneUpdates(bookEvent.cloneUpdates);
		const cloneBounces = (bookEvent.cloneUpdates ?? []).filter(
			(cloneUpdate) => cloneUpdate.bounced && cloneUpdate.alive,
		);
		if (cloneBounces.length > 0) {
			const nextSerial = stateGame.lex.cloneBounceSerial + 1;
			stateGame.lex.cloneBounceSerial = nextSerial;
			stateGame.lex.lastCloneBounces = cloneBounces.map((cloneUpdate) => ({
				id: cloneUpdate.id,
				notation: cloneUpdate.notation,
				serial: nextSerial,
			}));
		} else {
			stateGame.lex.lastCloneBounces = [];
		}
		stateGame.lex.cloneCount = bookEvent.cloneCount ?? Object.keys(stateGame.lex.clones).length;
		stateGame.lex.modeMultiplier = bookEvent.modeMultiplier ?? stateGame.lex.modeMultiplier;
		stateGame.lex.lastResolvedObjectId = undefined;
		await waitLexPlaybackStepInterruptible(260);
	},
	objectSpawn: async (bookEvent: BookEventOfType<'objectSpawn'>) => {
		stateGame.lex.activeObjects = {
			...stateGame.lex.activeObjects,
			[bookEvent.objectId]: {
				objectId: bookEvent.objectId,
				object: bookEvent.object,
				turn: bookEvent.turn,
				notation: bookEvent.notation,
				x: bookEvent.x,
				y: bookEvent.y,
				source: bookEvent.source,
				resolved: false,
			},
		};
		await waitLexPlaybackStepInterruptible(260);
	},
	objectResolve: async (bookEvent: BookEventOfType<'objectResolve'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: LEX_OBJECT_SOUND_MAP[bookEvent.object] });
		const collectorId = bookEvent.collectorId ?? 'main';
		const collectorAt = bookEvent.collectorAt ?? bookEvent.lexAt;
		if (collectorId === 'main') {
			stateGame.lex.lexNotation = collectorAt;
			stateGame.lex.lexPath = [collectorAt];
		} else if (stateGame.lex.clones[collectorId]) {
			stateGame.lex.clones = {
				...stateGame.lex.clones,
				[collectorId]: {
					...stateGame.lex.clones[collectorId],
					notation: collectorAt,
					path: [collectorAt],
				},
			};
		}
		const activeObject = stateGame.lex.activeObjects[bookEvent.objectId];
		if (activeObject) {
			stateGame.lex.activeObjects = {
				...stateGame.lex.activeObjects,
				[bookEvent.objectId]: {
					...activeObject,
					resolved: true,
					result: bookEvent.result,
					target: 'target' in bookEvent ? bookEvent.target : undefined,
				},
			};
		}
		stateGame.lex.lastResolvedObjectId = bookEvent.objectId;
		stateGame.lex.lastResolvedObject = bookEvent;

		if ('tumbleValue' in bookEvent) {
			stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		}
		if ('totalWin' in bookEvent) {
			stateGame.lex.totalWin = bookEvent.totalWin;
			stateBet.winBookEventAmount = bookEvent.totalWin;
		}
		if (bookEvent.result === 'spawnClone') {
			const cloneStart = bookEvent.cloneStart ?? bookEvent.objectAt ?? collectorAt;
			const collectorVector =
				collectorId === 'main'
					? stateGame.lex.lexVector
					: stateGame.lex.clones[collectorId]?.vector;
			stateGame.lex.cloneCount = bookEvent.cloneCount;
			stateGame.lex.clones = {
				...stateGame.lex.clones,
				[bookEvent.ballId]: {
					id: bookEvent.ballId,
					notation: cloneStart,
					path: [cloneStart],
					vector:
						bookEvent.cloneVector ??
						(collectorVector
							? { dx: -collectorVector.dy, dy: collectorVector.dx }
							: { dx: -stateGame.lex.lexVector.dy, dy: stateGame.lex.lexVector.dx }),
					hitsRemaining: bookEvent.hitsRemaining,
					alive: true,
				},
			};
		}
		if (bookEvent.result === 'shield' || bookEvent.result === 'shieldBlock') {
			stateGame.lex.shieldCount = bookEvent.shieldCount;
		}
		if (bookEvent.result === 'destroy') {
			if (bookEvent.target === 'main') {
				stateGame.lex.mainAlive = false;
				eventEmitter.broadcast({ type: 'soundStop', name: 'running' });
			}
			if (bookEvent.target !== 'main') {
				const nextClones = { ...stateGame.lex.clones };
				delete nextClones[bookEvent.target];
				stateGame.lex.clones = nextClones;
			}
			stateGame.lex.cloneCount = Math.max(
				bookEvent.remainingBalls - (stateGame.lex.mainAlive ? 1 : 0),
				0,
			);
		}
		if (bookEvent.result === 'shieldBlock') {
			stateGame.lex.cloneCount = Math.max(
				bookEvent.remainingBalls - (stateGame.lex.mainAlive ? 1 : 0),
				0,
			);
		}
		await waitLexPlaybackStepInterruptible(420);
	},
	cloneExpire: async (bookEvent: BookEventOfType<'cloneExpire'>) => {
		stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		const nextClones = { ...stateGame.lex.clones };
		delete nextClones[bookEvent.ballId];
		stateGame.lex.clones = nextClones;
		stateGame.lex.cloneCount = Object.keys(nextClones).length;
		await waitLexPlaybackStepInterruptible(320);
	},
	roundEnd: async (bookEvent: BookEventOfType<'roundEnd'>) => {
		eventEmitter.broadcast({ type: 'soundStop', name: 'running' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'end-game', forcePlay: true });
		stateGame.lex.lexNotation = bookEvent.lexAt;
		stateGame.lex.lexPath = [bookEvent.lexAt];
		stateGame.lex.roundEnded = true;
		stateGame.lex.roundEndReason = bookEvent.reason;
		stateGame.lex.totalWin = bookEvent.totalWin;
		stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		stateGame.lex.mainBounces = bookEvent.mainBounces;
		stateGame.lex.modeMultiplier = bookEvent.modeMultiplier;
		stateGame.lex.corner = bookEvent.corner;
		stateGame.lex.cornerMultiplier = bookEvent.cornerMultiplier;
		stateGame.lex.cornerAt = bookEvent.cornerAt;
		stateGame.lex.target = bookEvent.target;
		stateBet.winBookEventAmount = getLexRoundDisplayWin(bookEvent);
		await waitLexPlaybackStepInterruptible(650);
	},
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		const promise1 = async () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			await animateSymbols({ positions: _.flatten(bookEvent.wins.map((win) => win.positions)) });
		};

		await promise1();
	},
	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (bookEvent.amount > 0) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountShow' });
			eventEmitter.broadcast({
				type: 'tumbleWinAmountUpdate',
				amount: bookEvent.amount,
				animate: false,
			});
		}
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	updateGlobalMult: async (bookEvent: BookEventOfType<'updateGlobalMult'>) => {
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		if (bookEvent.globalMult === 1) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		}
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: bookEvent.globalMult, // resets when multiplier === 1
		});
	},
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_explosion_b' });
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});
		eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
		await eventEmitter.broadcastAsync({ type: 'tumbleBoardSlideDown' });
		eventEmitter.broadcast({
			type: 'boardSettle',
			board: stateGameDerived
				.tumbleBoardCombined()
				.map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol)),
		});
		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	updateGrid: async (bookEvent: BookEventOfType<'updateGrid'>) => {
		eventEmitter.broadcast({ type: 'multiplierGridShow' });
		eventEmitter.broadcast({ type: 'multiplierGridUpdate', grid: bookEvent.gridMultipliers });
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		const finalAmount = Math.max(stateGame.lex.totalWin, bookEvent.amount);
		stateGame.lex.totalWin = finalAmount;
		stateBet.winBookEventAmount = finalAmount;
		eventEmitter.broadcast({ type: 'multiplierGridClear' });
		eventEmitter.broadcast({ type: 'multiplierGridHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
	},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);

		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
	},
};
