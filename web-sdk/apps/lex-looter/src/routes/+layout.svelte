<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderExample, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { assetUrl } from '../lib/assetUrl';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	const loaderUrl = assetUrl('loader.gif');

	setContext();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<LoaderExample src={loaderUrl} />
<!-- '/loader.gif' is served from static folder of sveltekit -->
<!-- File location: apps/scatter/static/loader.gif -->

{@render props.children()}
