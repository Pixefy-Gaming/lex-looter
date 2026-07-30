<script lang="ts">
	type Props = {
		src: string;
		maxWidth: number;
		onload: () => void;
	};

	const props: Props = $props();
</script>

<img
	style="--max-width-value: {props.maxWidth}px"
	src={props.src}
	alt="loader"
	class="loader"
	draggable="false"
	onload={props.onload}
/>

<style lang="scss">
	.loader {
		width: var(--loader-size, var(--max-width-value));
		max-width: 70vw;
		height: auto;
	}

	@media (max-width: 1200px) {
		.loader {
			--loader-size: 220px;
		}
	}

	@media (max-width: 1024px) {
		.loader {
			--loader-size: 200px;
		}
	}

	@media (max-width: 800px) {
		.loader {
			--loader-size: 170px;
		}
	}

	@media (max-width: 425px) {
		.loader {
			--loader-size: 150px;
		}
	}

	@media (max-width: 400px) {
		.loader {
			--loader-size: 130px;
		}
	}

	@media (max-width: 320px) {
		.loader {
			--loader-size: 115px;
		}
	}
</style>
