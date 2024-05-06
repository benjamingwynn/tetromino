<!-- @format -->
<script lang="ts">
	import {api} from "src/client/api.ts"
	import PleaseWait from "./PleaseWait.svelte"
	import AnimatedText from "./AnimatedText.svelte"
</script>

<div class="leaderboard">
	{#await api.list()}
		<span class="loading">
			<PleaseWait text="Getting high scores" />
		</span>
	{:then list}
		{#each list as item, index}
			<div class="row">
				<div class="index">{index + 1}</div>
				<div class="name">{item.username}</div>
				<div class="score">{item.score}</div>
				<!-- <button type="button">Replay</button> -->
			</div>
		{/each}
	{:catch err}
		<span class="error"><AnimatedText text={err} /></span>
	{/await}
</div>

<style lang="less">
	.leaderboard {
		overflow-y: auto;

		.row {
			display: grid;
			// grid-template-columns: 2em auto 5em 2em;
			grid-template-columns: 2em auto 5em;
			padding: 0.6em 0.5em;
			align-items: center;

			&:nth-child(even) {
				background: #111;
			}
		}

		.loading {
			display: block;
			padding: 1em;
			grid-column: span 3;
		}

		.error {
			grid-column: span 3;
		}

		.index {
			&::after {
				content: ".";
			}
		}

		.name {
			font-weight: bold;
		}

		.score {
			text-align: right;
			padding-right: 0.4em;
		}

		button {
			appearance: none;
			background: none;
			border: none;
			font: inherit;
			font-size: 0.5em;
			height: 5em;

			&:focus {
				color: yellow;
			}
		}
	}
</style>
