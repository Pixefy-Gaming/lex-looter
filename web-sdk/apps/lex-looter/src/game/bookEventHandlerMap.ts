import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { createInitialLexPlaybackState, stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
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
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

const waitLexPlaybackStep = async (duration = 220) => {
	await waitForTimeout(stateBet.isTurbo ? Math.round(duration * 0.18) : duration);
};

const applyCloneSnapshots = (clones: BookEventOfType<'bounceUpdate'>['clones'] = []) => {
	let nextClones = { ...stateGame.lex.clones };
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
		await waitLexPlaybackStep(250);
	},
	cornerUpdate: async (bookEvent: BookEventOfType<'cornerUpdate'>) => {
		stateGame.lex.mainBounces = bookEvent.mainBounces;
		stateGame.lex.corners = { ...bookEvent.corners };
		await waitLexPlaybackStep(120);
	},
	bounceUpdate: async (bookEvent: BookEventOfType<'bounceUpdate'>) => {
		stateGame.lex.lexPath = bookEvent.path?.length
			? [...bookEvent.path]
			: [bookEvent.from, bookEvent.to];
		stateGame.lex.lexNotation = bookEvent.to;
		stateGame.lex.mainBounces = bookEvent.mainBounces;
		stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		stateGame.lex.mainAlive = bookEvent.mainAlive ?? stateGame.lex.mainAlive;
		applyCloneSnapshots(bookEvent.clones);
		applyCloneUpdates(bookEvent.cloneUpdates);
		stateGame.lex.cloneCount = bookEvent.cloneCount ?? Object.keys(stateGame.lex.clones).length;
		stateGame.lex.modeMultiplier = bookEvent.modeMultiplier ?? stateGame.lex.modeMultiplier;
		stateGame.lex.lastResolvedObjectId = undefined;
		await waitLexPlaybackStep(260);
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
		await waitLexPlaybackStep(260);
	},
	objectResolve: async (bookEvent: BookEventOfType<'objectResolve'>) => {
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
				},
			};
		}
		stateGame.lex.lastResolvedObjectId = bookEvent.objectId;

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
			if (bookEvent.target === 'main') stateGame.lex.mainAlive = false;
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
		await waitLexPlaybackStep(420);
	},
	cloneExpire: async (bookEvent: BookEventOfType<'cloneExpire'>) => {
		stateGame.lex.tumbleValue = bookEvent.tumbleValue;
		const nextClones = { ...stateGame.lex.clones };
		delete nextClones[bookEvent.ballId];
		stateGame.lex.clones = nextClones;
		stateGame.lex.cloneCount = Object.keys(nextClones).length;
		await waitLexPlaybackStep(320);
	},
	roundEnd: async (bookEvent: BookEventOfType<'roundEnd'>) => {
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
		stateBet.winBookEventAmount = bookEvent.totalWin;
		await waitLexPlaybackStep(650);
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

		const promise2 = async () => {
			await eventEmitter.broadcastAsync({
				type: 'showClusterWinAmounts',
				wins: bookEvent.wins.map((win) => {
					return {
						win: win.meta.winWithoutMult,
						mult: win.meta.globalMult,
						result: win.meta.winWithoutMult * win.meta.globalMult,
						reel: win.meta.overlay.reel,
						row: win.meta.overlay.row,
					};
				}),
			});
		};

		await Promise.all([promise1(), promise2()]);
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
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: 1, // resets when multiplier === 1
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: 1, // resets when multiplier === 1
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
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
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
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

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
	},
};
