<!-- @format -->
<script lang="ts">
	export let score: number
	let n = 0
</script>

{#key score}
	<span class:animate={n++ > 0}>{score}</span>
{/key}

<style lang="less">
	span {
		font-size: 1em;
		&.animate {
			animation: ease-out score 1s;
		}
	}
	@keyframes score {
		0% {
			color: white;
		}
		50% {
			color: hotpink;
			transform: scale(1.4) rotate(-10deg);
		}
		100% {
			color: white;
		}
	}
</style>
