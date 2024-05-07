<!-- @format -->
<script lang="ts">
	import {Game} from "src/tetris/Game.ts"
	import {onMount} from "svelte"

	let canvas: HTMLCanvasElement
	export let grid: number[][]

	onMount(() => {
		if (!canvas) throw new Error("fuck")

		const game = new Game({
			enableAudio: false,
			canvas,
			disableAutomaticRendering: true,
		})

		// set the grid, render a single frame, then destroy the game
		game.grid = grid
		game.renderFrame()
		game.destroy()

		return () => {
			//.
		}
	})
</script>

<canvas width="10" height="20" bind:this={canvas}></canvas>

<style>
	canvas {
		image-rendering: optimizeSpeed;
		image-rendering: optimize-contrast;
		-webkit-font-smoothing: none;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
		image-rendering: pixelated;

		margin: 0.1em auto;
		border: solid thin #363636;
		height: 2.5em;
	}
</style>
