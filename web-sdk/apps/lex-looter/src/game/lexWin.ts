import type { LexRoundEndReason } from './typesBookEvent';

const TUMBLE_PAYOUT_REASONS = new Set<LexRoundEndReason>(['escape', 'bounceLimit']);

export const getLexRoundDisplayWin = ({
	reason,
	totalWin,
	tumbleValue,
}: {
	reason?: LexRoundEndReason;
	totalWin: number;
	tumbleValue: number;
}) => {
	if (reason && TUMBLE_PAYOUT_REASONS.has(reason)) {
		return Math.max(totalWin, tumbleValue);
	}

	return totalWin;
};
