import { assetUrl as publicAssetUrl } from '../lib/assetUrl';

const assetUrl = (path: string) => publicAssetUrl(`assets/${path}`);

export default {
	lexMain: {
		type: 'sprites',
		src: assetUrl('lex/character/lexMain.json'),
	},
	lexClone: {
		type: 'sprites',
		src: assetUrl('lex/character/lexClone.json'),
	},
	lexSlayer: {
		type: 'sprites',
		src: assetUrl('lex/character/lexSlayer.json'),
	},
	lexBlueBlob: {
		type: 'sprites',
		src: assetUrl('lex/character/lexBlueBlob.json'),
	},
	lexEscape: {
		type: 'sprite',
		src: assetUrl('lex/runtime/escape.png'),
	},
	lexCloneOrb: {
		type: 'sprite',
		src: assetUrl('lex/runtime/clone-orb.png'),
	},
	lexCoin: {
		type: 'sprite',
		src: assetUrl('lex/runtime/coin.png'),
	},
	lexDiamond: {
		type: 'sprite',
		src: assetUrl('lex/runtime/diamond.png'),
	},
	lexChest: {
		type: 'sprite',
		src: assetUrl('lex/runtime/chest.png'),
	},
	lexHeart: {
		type: 'sprite',
		src: assetUrl('lex/runtime/heart.png'),
	},
	lexBoard: {
		type: 'sprite',
		src: assetUrl('lex/board.jpg'),
	},
	baseBackground: {
		type: 'spriteSheet',
		src: assetUrl('lex/background/base-bg.json'),
		preload: true,
	},
	activateBackground: {
		type: 'spriteSheet',
		src: assetUrl('lex/background/activate-bg.json'),
		preload: true,
	},
	logoLex: {
		type: 'spriteSheet',
		src: assetUrl('lex/loading-logo/logo-lex.json'),
		preload: true,
	},
	lexGameAsset: {
		type: 'sprites',
		src: assetUrl('lex/game-asset.json'),
	},
	pressToContinueText: {
		type: 'sprites',
		src: assetUrl('sprites/pressToContinueText/MM_pressanywhere.json'),
		preload: true,
	},
	explosion: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/symbols3/symbols3.atlas'),
			skeleton: assetUrl('spines/symbols3/explosion.json'),
			scale: 2,
		},
	},
	reelsFrame: {
		type: 'sprites',
		src: assetUrl('sprites/reelsFrame/reels_frame.json'),
	},
	payFrame: {
		type: 'sprite',
		src: assetUrl('sprites/payFrame/payFrame.png'),
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/anticipation/anticipation.atlas'),
			skeleton: assetUrl('spines/anticipation/anticipation.json'),
			scale: 2,
		},
	},
	goldFont: {
		type: 'font',
		src: assetUrl('fonts/goldFont/mm_gold.xml'),
	},
	goldBlur: {
		type: 'font',
		src: assetUrl('fonts/goldBlur/miningfont_gold_blur.xml'),
	},
	silverFont: {
		type: 'font',
		src: assetUrl('fonts/silverFont/mm_silver.xml'),
	},
	purpleFont: {
		type: 'font',
		src: assetUrl('fonts/purpleFont/mm_purple.xml'),
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/bigwin/big_wins.atlas'),
			skeleton: assetUrl('spines/bigwin/mm_bigwin.json'),
			scale: 2,
		},
	},
	globalMultiplier: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/globalMultiplier/multiframe.atlas'),
			skeleton: assetUrl('spines/globalMultiplier/multiframe.json'),
			scale: 2,
		},
	},
	fsIntro: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/fsIntro/fs_screen.atlas'),
			skeleton: assetUrl('spines/fsIntro/fs_screen.json'),
			scale: 2,
		},
	},
	fsIntroNumber: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/fsIntro/fs_screen.atlas'),
			skeleton: assetUrl('spines/fsIntro/fs_screen_number.json'),
			scale: 2,
		},
	},
	fsOutroNumber: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/fsIntro/fs_screen.atlas'),
			skeleton: assetUrl('spines/fsIntro/fs_total_number.json'),
			scale: 2,
		},
	},
	foregroundAnimation: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/foregroundAnimation/mm_bg.atlas'),
			skeleton: assetUrl('spines/foregroundAnimation/mm_bg.json'),
			scale: 2,
		},
		preload: true,
	},
	foregroundFeatureAnimation: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/foregroundFeatureAnimation/mm_bg_feature.atlas'),
			skeleton: assetUrl('spines/foregroundFeatureAnimation/mm_bg_feature.json'),
			scale: 2,
		},
		preload: true,
	},
	tumble_multiplier: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/tumbleWin/tumble_win.atlas'),
			skeleton: assetUrl('spines/tumbleWin/tumble_multiplier.json'),
			scale: 2,
		},
	},
	tumble_win: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/tumbleWin/tumble_win.atlas'),
			skeleton: assetUrl('spines/tumbleWin/tumble_win.json'),
			scale: 2,
		},
	},
	reelhouse: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/reelhouse/reelhouse_glow.atlas'),
			skeleton: assetUrl('spines/reelhouse/reelhouse_glow.json'),
			scale: 2,
		},
	},
	progressBar: {
		type: 'sprites',
		src: assetUrl('sprites/progressBar/progressBar.json'),
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: assetUrl('sprites/freeSpins/freeSpins.json'),
	},
	winSmall: {
		type: 'sprites',
		src: assetUrl('sprites/winSmall/MM_Localisation_winsmall.json'),
	},
	clusterWin: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/clusterWin/clusterpay.atlas'),
			skeleton: assetUrl('spines/clusterWin/clusterpay.json'),
			scale: 2,
		},
	},
	transition: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/transition/transition.atlas'),
			skeleton: assetUrl('spines/transition/transition.json'),
			scale: 2,
		},
	},
	symbolsStatic: {
		type: 'sprites',
		src: assetUrl('sprites/symbolsStatic/symbolsStatic.json'),
	},
	coins: {
		type: 'spriteSheet',
		src: assetUrl('sprites/coin/SD2_Coin.json'),
	},
	sound: {
		type: 'audio',
		src: assetUrl('audio/sounds.json'),
		preload: true,
	},
} as const;
