<script lang="ts">
	import { onMount } from 'svelte';

	import { stateMeta } from 'state-shared';

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
				costMultiplier: 3,
				type: 'activate',
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
					button: 'ACTIVATE',
					betAmountLabel: 'NO SLAYER',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'NO SLAYER BONUS',
					bannerText: '',
				},
				maxWin: 50000,
			},
			start_clone: {
				mode: 'start_clone',
				costMultiplier: 50,
				type: 'activate',
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
					button: 'ACTIVATE',
					betAmountLabel: 'START CLONE',
					tickerIdle: 'PLACE YOUR BET',
					tickerSpin: 'START CLONE BONUS',
					bannerText: '',
				},
				maxWin: 50000,
			},
			lucky_lex: {
				mode: 'lucky_lex',
				costMultiplier: 100,
				type: 'activate',
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
					button: 'ACTIVATE',
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
</script>
