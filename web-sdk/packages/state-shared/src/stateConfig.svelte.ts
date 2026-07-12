export const DEFAULT_BET_AMOUNT_OPTIONS = [
	0.1, 0.2, 0.4, 0.6, 0.8, 1, 2, 5, 10, 25, 50, 75, 100, 200, 500, 800, 1000,
];

export const DEFAULT_BET_MENU_OPTIONS = [0.1, 0.2, 0.6, 1, 5, 25, 100, 1000];

export const stateConfig = $state({
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
	betAmountOptions: DEFAULT_BET_AMOUNT_OPTIONS,
	betMenuOptions: DEFAULT_BET_MENU_OPTIONS,
});
