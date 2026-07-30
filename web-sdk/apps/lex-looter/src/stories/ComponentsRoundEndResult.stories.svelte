<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<RoundEndResult>',
	});
</script>

<script lang="ts">
	import { StoryLocale } from 'components-storybook';

	import { setContext } from '../game/context';
	import RoundEndResultDebug from './RoundEndResultDebug.svelte';

	setContext();
</script>

<Story name="tier popup debug">
	<StoryLocale lang="en">
		<RoundEndResultDebug />
	</StoryLocale>
</Story>
