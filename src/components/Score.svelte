<!-- @format -->
<script lang="ts">
	export let score: number
	let n = 0
</script>

{#key score}
	<span class:animate={n++ > 0 && score > 0}>{score}</span>
{/key}

<style lang="less">
	span {
		&.animate {
			animation: ease-out score 1s;
		}
	}
	@keyframes score {
		0% {
			color: white;
		}
		50% {
			color: yellow;
			transform: scale(1.2) rotate(10deg);
		}
		100% {
			color: white;
		}
	}
</style>
