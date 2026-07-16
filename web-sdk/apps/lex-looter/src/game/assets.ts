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
	progressBar: {
		type: 'sprites',
		src: assetUrl('sprites/progressBar/progressBar.json'),
		preload: true,
	},
	winSmall: {
		type: 'sprites',
		src: assetUrl('sprites/winSmall/MM_Localisation_winsmall.json'),
	},
	transition: {
		type: 'spine',
		src: {
			atlas: assetUrl('spines/transition/transition.atlas'),
			skeleton: assetUrl('spines/transition/transition.json'),
			scale: 2,
		},
	},
	sound: {
		type: 'audio',
		src: assetUrl('audio/lex/sounds.json'),
		preload: true,
	},
} as const;
