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
					betAmountLabel: 'COST',
					tickerIdle: 'SELECT COST',
					tickerSpin: 'GOOD LUCK',
					bannerText: '',
				},
				maxWin: 35,
			},
			extra_life: {
				mode: 'extra_life',
				costMultiplier: 3,
				type: 'activate',
				parent: '',
				children: '',
				assets: {
					icon: 'heart.png',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: 'EXTRA LIFE',
					dialog: 'Start with +1 heart. Slayer can still spawn.',
					description: 'Start with +1 heart. Slayer can still spawn',
					button: 'ACTIVATE',
					betAmountLabel: 'EXTRA LIFE',
					tickerIdle: 'SELECT COST',
					tickerSpin: 'EXTRA LIFE BONUS',
					bannerText: '',
				},
				maxWin: 4500,
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
					dialog: 'Start with +1 clone and 2 hearts. Slayer can still spawn.',
					description: 'Start with +1 clone and 2 hearts',
					button: 'ACTIVATE',
					betAmountLabel: 'START CLONE',
					tickerIdle: 'SELECT COST',
					tickerSpin: 'START CLONE BONUS',
					bannerText: '',
				},
				maxWin: 4500,
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
						'Start with +1 clone and 3 hearts. Corner multipliers start at x5.',
					description: 'Start with +1 clone, 3 hearts, and x5 corner multipliers',
					button: 'ACTIVATE',
					betAmountLabel: 'LUCKY LEX',
					tickerIdle: 'SELECT COST',
					tickerSpin: 'LUCKY LEX BONUS',
					bannerText: '',
				},
				maxWin: 4500,
			},
		};
	};

	onMount(applyLexBonusModalMeta);
</script>
