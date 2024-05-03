<!-- @format -->
<script lang="ts">
	import {onMount} from "svelte"
	import Score from "./components/Score.svelte"
	import HighScore from "./components/HighScore.svelte"
	import {Game} from "./tetris/Game"
	import "./font/RedAlert.css"

	let canvas: HTMLCanvasElement
	let previewCanvas: HTMLCanvasElement
	let game: Game
	let _score: number = 0
	let _highScore: number = localStorage.highScore ? +localStorage.highScore : 0
	let _gameOver: boolean = false
	let showTouchControls = !!navigator.maxTouchPoints

	const newGame = () => {
		if (game) game.destroy()
		_score = 0
		_gameOver = false
		game = new Game(
			canvas,
			({score, gameOver}) => {
				_score = score
				_gameOver = gameOver
				if (_score > _highScore) _highScore = _score
			},
			previewCanvas
		)
		window.game = game
	}

	let touchDirection: undefined | "moveLeft" | "rotate" | "moveRight" | "speedUp" = undefined
	let nextTouchSpeedUp: number | undefined = undefined
	let nextTouchDirectionTick: number | undefined = undefined
	const touchSpeedUp = () => {
		game.playerSpeedUp()
		nextTouchSpeedUp = setTimeout(touchSpeedUp, 16.7 * 4)
	}
	const touchDirectionTick = () => {
		if (touchDirection === "moveLeft") {
			game.playerMoveLeft()
		} else if (touchDirection === "moveRight") {
			game.playerMoveRight()
		}
		if (touchDirection) {
			nextTouchDirectionTick = setTimeout(touchDirectionTick, 16.7 * 4)
		}
	}

	onMount(() => {
		newGame()

		return () => {
			game.destroy()
		}
	})

	const touchStop = () => {
		touchDirection = undefined
		if (nextTouchDirectionTick) clearTimeout(nextTouchDirectionTick)
	}

	$: localStorage.highScore = _highScore
</script>

<svelte:window
	on:keydown={(ev) => {
		showTouchControls = false
		if (ev.key === " ") {
			game.playerRotate()
		} else if (ev.key === "ArrowRight" || ev.key === "d") {
			game.playerMoveRight()
		} else if (ev.key === "ArrowLeft" || ev.key === "a") {
			game.playerMoveLeft()
		} else if (ev.key === "ArrowDown" || ev.key === "s") {
			game.playerSpeedUp()
		} else if (ev.key === "r") {
			// reset
			newGame()
		} else if (ev.key === "p") {
			// pause
			game.playerPause()
		} else if (ev.key === "F1") {
			// pause
			game.playerToggleDebug()
		} else {
			console.warn("unregistered key:", ev.key)
		}
	}}
/>
<main
	on:touchstart={() => {
		showTouchControls = true
	}}
>
	<!-- <h1>Tetris</h1> -->
	<canvas
		width="100px"
		height="200px"
		bind:this={canvas}
		on:contextmenu|preventDefault
		on:touchstart|preventDefault={() => {
			touchSpeedUp()
		}}
		on:touchend={() => {
			if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		}}
		on:touchcancel={() => {
			if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		}}
	/>
	<div class="stats">
		<div class="scoreboard">
			<h5>TOP</h5>
			<HighScore score={_highScore} />
		</div>
		<div class="scoreboard">
			<h5>SCORE</h5>
			<Score score={_score} />
		</div>
		<div class="scoreboard">
			<h5>NEXT</h5>
			<canvas width="30px" height="30px" bind:this={previewCanvas}></canvas>
		</div>
	</div>
	<div class="about">
		<div class="about-inner">
			<h4>Benjamin's Tetris</h4>
			<h5>A mostly competent port of tetris written by Benjamin Gwynn</h5>
			{#if !showTouchControls}
				<h5>Move with A/D or left/right arrows. Down/S to speed up</h5>
			{/if}
		</div>
	</div>
</main>
{#if _gameOver}
	<div class="youDied">
		<h1>GAME OVER</h1>
		{#if !showTouchControls}
			<button
				type="button"
				on:click={() => {
					newGame()
				}}>(R)eset and start new game</button
			>
		{/if}
	</div>
{/if}
<div class="touchControls" hidden={!showTouchControls}>
	{#if _gameOver}
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				newGame()
			}}>reset</button
		>
	{:else}
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				game.playerMoveLeft()
				touchDirection = "moveLeft"
				nextTouchDirectionTick = setTimeout(touchDirectionTick, 16.7 * 4)
			}}>&lt;</button
		>
		<button
			class="rotate"
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				game.playerRotate()
			}}>spin</button
		>
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				game.playerMoveRight()
				touchDirection = "moveRight"
				nextTouchDirectionTick = setTimeout(touchDirectionTick, 16.7 * 4)
			}}>&gt;</button
		>
	{/if}
</div>

<style lang="less">
	:global(*) {
		box-sizing: border-box;
		user-select: none;
		margin: 0;
		padding: 0;
		font-weight: normal;
	}
	:global(html) {
		display: flex;
		min-height: 100%;
		font-family: "RedAlert";
		overflow: hidden;
	}

	:global(body) {
		margin: 0;
		background: black;
		color: white;
		min-height: 100%;
		min-width: 100%;
		overflow: hidden;
	}

	main {
		padding-top: 1em;
		display: grid;
		grid-template-columns: auto 10em 5em;
		grid-template-rows: auto 5em;
		height: 100%;

		h1 {
			font-size: 4.5em;
			margin: auto;
			grid-column: span 3;
			text-align: center;
		}
	}

	canvas {
		border: solid gray 3px;
		height: 100%;
		margin: auto;
		/* height: 80vh;
		width: 40vh; */
		image-rendering: optimizeSpeed;
		image-rendering: optimize-contrast;
		-webkit-font-smoothing: none;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
		image-rendering: pixelated;
	}

	.stats {
		display: flex;
		flex-flow: column nowrap;
		gap: 1em;
	}

	.scoreboard {
		display: flex;
		flex-flow: column nowrap;
		font-size: 2em;
		padding: 0.1rem;
		text-align: center;
		border: double 0.4rem #333;
		justify-content: center;
		height: 3.5em;
	}

	.about {
		grid-column: 1 / span 3;
		margin: auto;
		text-align: center;
	}

	@media (max-width: 639px) {
		main {
			grid-template-columns: auto;
			grid-template-rows: auto 8rem 3rem 10rem;
			padding-right: 0;

			h1 {
				grid-column: auto;
				display: none;
			}

			canvas {
				height: 100%;
			}
			.about {
				grid-column: auto;
				margin: 0;
			}

			.about-inner {
				h4 {
					display: block;
				}
			}
			.scoreboard {
				height: auto;
			}
		}

		.stats {
			padding: 1em 2em;
			flex-flow: row nowrap;
			gap: 1em;
			> * {
				width: 100%;
			}
		}
	}

	.touchControls {
		font-size: 5em;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 10rem;
		display: flex;
		justify-self: stretch;
		flex-flow: row nowrap;
		background: rgba(0, 0, 0, 0.6);
		border-top: solid thin rgba(255, 255, 255, 0.3s);

		&[hidden] {
			display: none;
		}

		button {
			font: inherit;
			width: 100%;
			appearance: none;
			border: none;
			background: transparent;
			color: white;
			padding: 0 0.2em;

			&.rotate {
				border-left: solid thin rgba(255, 255, 255, 0.3s);
				border-right: solid thin rgba(255, 255, 255, 0.3s);
			}
		}
	}

	.youDied {
		background: rgba(0, 0, 0, 0.1);
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-flow: column nowrap;
		justify-content: center;
		align-items: center;

		h1 {
			text-shadow: 0.1em 0.1em 0 black;
			font-size: ~"max(3em, min(10em, 10vw))";
			color: pink;
			font-weight: bold;
		}

		button {
			font: inherit;
			appearance: none;
			background: #000000d4;
			color: white;
			padding: 0.4em 2em;
			margin-top: 1em;
			font-size: 1.4em;
			border: grey double 0.4em;
		}
	}
</style>
