<!-- @format -->
<script lang="ts">
	import {api} from "src/client/api.ts"
	import PleaseWait from "./PleaseWait.svelte"
	import AnimatedText from "./AnimatedText.svelte"
	import LeaderboardGamePreview from "./LeaderboardGamePreview.svelte"
	import type {ScoreboardResult} from "server/scoreboard"

	export let playbackGame: (game: ScoreboardResult) => void | Promise<void>
</script>

<div class="leaderboard">
	{#await api.list()}
		<span class="loading">
			<PleaseWait text="Getting high scores" />
		</span>
	{:then list}
		{#each list as item, index}
			<button
				class="row"
				on:click={() => {
					playbackGame(item)
				}}
			>
				<div class="index">{index + 1}</div>
				<div class="name">{item.username}</div>
				<div class="score">{item.score}</div>
				<LeaderboardGamePreview grid={item.grid} />
			</button>
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
			grid-template-columns: 2em auto 5em 2em;
			padding-left: 0.5em;
			align-items: center;
			width: 100%;
			text-align: left;

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

			&:focus {
				color: yellow;
			}
		}
	}
</style>
