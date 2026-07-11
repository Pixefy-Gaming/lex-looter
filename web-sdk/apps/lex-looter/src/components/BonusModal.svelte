<script lang="ts">
	import { onMount } from 'svelte';

	import { stateMeta, stateModal } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();

	const applyLexBonusModalMeta = () => {
		stateMeta.betModeMeta = {
			BASE: {
				mode: 'BASE',
				costMultiplier: 1,
				type: 'default',
				parent: '',
				children: '',
				assets: {
					icon: '',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: 'Lex Looter',
					dialog: '',
					button: '',
					betAmountLabel: 'BET',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'GOOD LUCK',
					bannerText: '',
				},
				maxWin: 50000,
			},
			no_slayer: {
				mode: 'no_slayer',
				costMultiplier: 100,
				type: 'buy',
				parent: '',
				children: '',
				assets: {
					icon: 'ante.png',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: 'No Slayer',
					dialog: 'Start the game without Slayer.',
					description: 'Start the game without Slayer',
					button: 'BUY',
					betAmountLabel: 'NO SLAYER',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'NO SLAYER BONUS',
					bannerText: '',
				},
				maxWin: 50000,
			},
			start_clone: {
				mode: 'start_clone',
				costMultiplier: 170,
				type: 'buy',
				parent: '',
				children: '',
				assets: {
					icon: 'startClone.png',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: 'Start Clone',
					dialog: 'Start the game without Slayer and with +1 clone.',
					description: 'Start the game without Slayer & +1 clone',
					button: 'BUY',
					betAmountLabel: 'START CLONE',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'START CLONE BONUS',
					bannerText: '',
				},
				maxWin: 50000,
			},
			lucky_lex: {
				mode: 'lucky_lex',
				costMultiplier: 250,
				type: 'buy',
				parent: '',
				children: '',
				assets: {
					icon: 'luckylex.png',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: 'Lucky Lex',
					dialog:
						'Start the game without Slayer, with +1 clone, and with multiplier starting from x5.',
					description: 'Start the game without Slayer & +1 clone & multiplier start from x5',
					button: 'BUY',
					betAmountLabel: 'LUCKY LEX',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'LUCKY LEX BONUS',
					bannerText: '',
				},
				maxWin: 50000,
			},
		};
	};

	onMount(applyLexBonusModalMeta);

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>
