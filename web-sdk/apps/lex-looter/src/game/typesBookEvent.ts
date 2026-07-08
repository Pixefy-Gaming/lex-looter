import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		win: number;
		positions: Position[];
		meta: {
			globalMult: number;
			clusterMult: number;
			winWithoutMult: number;
			overlay: Position;
		};
	}[];
};

type BookEventSetTumbleWin = {
	index: number;
	type: 'updateTumbleWin';
	amount: number;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventUpdateGlobalMult = {
	index: number;
	type: 'updateGlobalMult';
	globalMult: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	explodingSymbols: Position[];
	newSymbols: RawSymbol[][];
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

// new
type BookEventUpdateGrid = {
	index: number;
	type: 'updateGrid';
	gridMultipliers: number[][];
};

type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	positions: Position[];
};

// customised
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type LexCornerKey = 'tl' | 'tr' | 'bl' | 'br';
export type LexObjectName =
	| 'coin'
	| 'diamond'
	| 'blue_blob'
	| 'chest'
	| 'escape'
	| 'slayer'
	| 'clone_orb'
	| 'heart';
export type LexRoundEndReason =
	| 'cornerHit'
	| 'escape'
	| 'bounceLimit'
	| 'slayer'
	| 'allBallsLost'
	| 'safetyStop';
export type BoardNotation = string;
export type LexBoardDefinition = {
	cols: number;
	rows: number;
	cellSize: number;
	width: number;
	height: number;
	corners: Record<LexCornerKey, BoardNotation>;
};
export type LexCloneBookState = {
	id: string;
	notation: BoardNotation;
	path: BoardNotation[];
	from: BoardNotation;
	to: BoardNotation;
	vector: { dx: number; dy: number };
	hitsRemaining: number;
	bounced: boolean;
	alive: boolean;
};

type BookEventRoundStart = {
	index: number;
	type: 'roundStart';
	mode: string;
	betCost: number;
	modeMultiplier: number;
	cloneCount: number;
	clones?: LexCloneBookState[];
	startsWithSlayer: boolean;
	board: LexBoardDefinition;
	lexStart: BoardNotation;
	lexVector: { dx: number; dy: number };
};

type BookEventCornerUpdate = {
	index: number;
	type: 'cornerUpdate';
	mainBounces: number;
	corners: Record<LexCornerKey, number | null>;
};

type BookEventBounceUpdate = {
	index: number;
	type: 'bounceUpdate';
	turn: number;
	from: BoardNotation;
	to: BoardNotation;
	path: BoardNotation[];
	clones?: LexCloneBookState[];
	mainBounces: number;
	tumbleValue: number;
	mainAlive: boolean;
	cloneCount: number;
	modeMultiplier: number;
};

type BookEventObjectSpawn = {
	index: number;
	type: 'objectSpawn';
	objectId: string;
	object: LexObjectName;
	turn: number;
	notation: BoardNotation;
	x: number;
	y: number;
	source: 'random' | 'start' | string;
};

type BookEventObjectResolveBase = {
	lexAt: BoardNotation;
	objectAt: BoardNotation;
	collectorId?: string;
	collectorAt?: BoardNotation;
};

type BookEventObjectResolveCollect = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'coin' | 'diamond';
	turn: number;
	result: 'collect';
	amount: number;
	tumbleValue: number;
};

type BookEventObjectResolveHalve = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'blue_blob';
	turn: number;
	result: 'halve';
	delta: number;
	tumbleValue: number;
};

type BookEventObjectResolveMultiply = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'chest';
	turn: number;
	result: 'multiply';
	multiplier: number;
	tumbleValue: number;
};

type BookEventObjectResolveCashout = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'escape';
	turn: number;
	result: 'cashout';
	totalWin: number;
	tumbleValue: number;
};

type BookEventObjectResolveDestroy = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'slayer';
	turn: number;
	result: 'destroy';
	target: string;
	remainingBalls: number;
};

type BookEventObjectResolveShieldBlock = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'slayer';
	turn: number;
	result: 'shieldBlock';
	target: string;
	shieldCount: number;
	remainingBalls: number;
};

type BookEventObjectResolveNoTarget = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'slayer';
	turn: number;
	result: 'noTarget';
};

type BookEventObjectResolveSpawnClone = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'clone_orb';
	turn: number;
	result: 'spawnClone';
	ballId: string;
	hitsRemaining: number;
	cloneCount: number;
	cloneStart?: BoardNotation;
	cloneVector?: { dx: number; dy: number };
	clonePath?: BoardNotation[];
};

type BookEventObjectResolveShield = BookEventObjectResolveBase & {
	index: number;
	type: 'objectResolve';
	objectId: string;
	object: 'heart';
	turn: number;
	result: 'shield';
	shieldCount: number;
};

type BookEventObjectResolve =
	| BookEventObjectResolveCollect
	| BookEventObjectResolveHalve
	| BookEventObjectResolveMultiply
	| BookEventObjectResolveCashout
	| BookEventObjectResolveDestroy
	| BookEventObjectResolveShieldBlock
	| BookEventObjectResolveNoTarget
	| BookEventObjectResolveSpawnClone
	| BookEventObjectResolveShield;

type BookEventCloneExpire = {
	index: number;
	type: 'cloneExpire';
	ballId: string;
	turn: number;
	addedAmount: number;
	tumbleValue: number;
	notation?: BoardNotation;
};

type BookEventRoundEnd = {
	index: number;
	type: 'roundEnd';
	reason: LexRoundEndReason;
	totalWin: number;
	tumbleValue: number;
	mainBounces: number;
	modeMultiplier: number;
	corner?: LexCornerKey;
	cornerMultiplier?: number;
	lexAt: BoardNotation;
	cornerAt?: BoardNotation;
	objectId?: string;
	target?: string;
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTumbleWin
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventUpdateGlobalMult
	| BookEventTumbleBoard
	| BookEventCreateBonusSnapshot
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	// new
	| BookEventUpdateGrid
	| BookEventFreeSpinRetrigger
	// customised
	| BookEventCreateBonusSnapshot
	// Lex Looter
	| BookEventRoundStart
	| BookEventCornerUpdate
	| BookEventBounceUpdate
	| BookEventObjectSpawn
	| BookEventObjectResolve
	| BookEventCloneExpire
	| BookEventRoundEnd;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
