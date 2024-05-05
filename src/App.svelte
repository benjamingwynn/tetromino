<!-- @format -->
<script lang="ts">
	import {onMount} from "svelte"
	import Score from "./components/Score.svelte"
	import HighScore from "./components/HighScore.svelte"
	import TouchButton from "./components/TouchButton.svelte"
	import {Game} from "./tetris/Game"
	import {version} from "../package.json"
	import "./font/RedAlert.css"

	let canvas: HTMLCanvasElement
	let altCanvas: HTMLCanvasElement
	let previewCanvas: HTMLCanvasElement
	let game: Game
	let _score: number = 0
	let _highScore: number = localStorage.highScore ? +localStorage.highScore : 0
	let _gameOver: boolean = false
	let showTouchControls = !!navigator.maxTouchPoints
	let lockTouchRetry = false
	let showTouchSettings = false

	const validateLocalReplay = () => {
		const game2 = new Game({
			canvas: altCanvas,
			enableAudio: false,
			seed: game.seed,
		})
		// game2.playerToggleDebug()
		const success = game2.replay(game.gameLog, game.getTicks())
		const score = game2.getScore()
		if (success && score === _score) {
			// console.log("**** SUCCESS!! ****")
			canvas.style.borderColor = "green"
			altCanvas.style.borderColor = "green"
		} else if (!success && score === _score) {
			// console.warn("**** NON-SUCCESS BUT MATCHING SCORE!! ****")
			canvas.style.borderColor = "orange"
			altCanvas.style.borderColor = "orange"
		} else {
			console.error("**** FAILURE!! ****")
			canvas.style.borderColor = "red"
			altCanvas.style.borderColor = "red"
			altCanvas.hidden = false
		}
		// console.log("game2=", game2)
		window.game2 = game2
		requestAnimationFrame(() => {
			game2.destroy()
		})
	}

	const newGame = () => {
		// altCanvas.hidden = true
		canvas.style.borderColor = ""
		if (game) game.destroy()
		_score = 0
		_gameOver = false
		game = new Game({
			canvas,
			enableAudio: true,
			onUpdate: ({score, gameOver}) => {
				_score = score
				if (gameOver && !_gameOver) {
					//
					// on game over...
					//

					// lock the retry button for a small white so we don't accidentally click it
					lockTouchRetry = true
					setTimeout(() => {
						lockTouchRetry = false
					}, 3000)

					// validate the game locally
					validateLocalReplay()
				}

				_gameOver = gameOver
				if (_score > _highScore) _highScore = _score
			},
			previewCanvas,
		})
		game.play()
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

	let paused = false
	let gameMute = !!localStorage.mute
	let touchControlSwap = !!localStorage.touchControlSwap
	$: game && (game.muteSounds = gameMute)
	$: game && (game.paused = paused || showTouchSettings)
	$: localStorage.mute = gameMute ? 1 : ""
	$: localStorage.touchControlSwap = touchControlSwap ? 1 : ""
	$: localStorage.highScore = _highScore

	// make sure we don't get stuck in the settings screen
	$: if (!showTouchControls) showTouchSettings = false
</script>

<svelte:window
	on:keydown={(ev) => {
		showTouchControls = false
		if (ev.key === " " || ev.key === "ArrowUp" || ev.key === "w") {
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
			paused = !paused
		} else if (ev.key === "m") {
			// mute
			game.muteSounds = !game.muteSounds
		} else if (ev.key === "F1") {
			// pause
			game.playerToggleDebug()
		} else if (ev.key === "F2") {
			altCanvas.hidden = !altCanvas.hidden
		} else {
			console.warn("unregistered key:", ev.key)
		}
	}}
/>

<div class="app primary" hidden={showTouchSettings}>
	<main
		on:contextmenu|preventDefault
		on:touchstart|preventDefault={() => {
			showTouchControls = true
			if (touchControlSwap) {
				game.playerRotate()
			} else {
				touchSpeedUp()
			}
		}}
		on:touchend={() => {
			if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		}}
		on:touchcancel={() => {
			if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		}}
	>
		<!-- <h1>Tetris</h1> -->
		<div class="game">
			<canvas width="100px" height="200px" bind:this={canvas} />
			<canvas width="100px" height="200px" bind:this={altCanvas} hidden />
		</div>
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
			{#if !showTouchControls}
				<div class="cursorControls">
					<button
						on:contextmenu|preventDefault
						type="button"
						class="action"
						class:active={paused}
						tabindex="-1"
						on:click={() => {
							paused = !paused //
						}}>{paused ? "RESUME" : "(P)AUSE"}</button
					>
					<button
						on:contextmenu|preventDefault
						type="button"
						class="action"
						class:active={gameMute}
						tabindex="-1"
						on:click={() => {
							gameMute = !gameMute
						}}>{gameMute ? "UNMUTE" : "MUTE"}</button
					>
				</div>
			{/if}
		</div>
		<div class="about">
			<div class="about-inner">
				<h4>Benjamin's Tetris v{version}</h4>
				<h5>A mostly competent port of tetris written by Benjamin Gwynn</h5>
				{#if !showTouchControls}
					<h5>Move with A/D or left/right arrows, down/S to speed up, up/W/space to spin.</h5>
				{/if}
			</div>
		</div>
	</main>

	<div class="touchFloat left" hidden={!showTouchControls}>
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			class="action"
			class:active={paused}
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				paused = !paused //
			}}>{paused ? "RESUME" : "PAUSE"}</button
		>
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			class="action"
			class:active={gameMute}
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				gameMute = !gameMute
			}}>{gameMute ? "UNMUTE" : "MUTE"}</button
		>
	</div>

	<div class="touchFloat right" hidden={!showTouchControls}>
		<button
			on:contextmenu|preventDefault
			class="action"
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				//
				showTouchSettings = !showTouchSettings
				// game.playerToggleDebug()
			}}>SETTINGS</button
		>
	</div>

	{#if _gameOver}
		<div class="youDied">
			<h1>GAME OVER</h1>
			{#if !showTouchControls}
				<button
					type="button"
					on:click={() => {
						newGame()
						// altCanvas.hidden = true
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
				disabled={lockTouchRetry}
				on:touchstart|preventDefault={() => {
					if (lockTouchRetry) {
						return
					}
					newGame()
				}}>reset</button
			>
		{:else}
			<TouchButton onAction={() => game.playerMoveLeft()}>&lt;</TouchButton>
			{#if touchControlSwap}
				<TouchButton onAction={() => game.playerSpeedUp()}>drop</TouchButton>
			{:else}
				<button
					class="rotate"
					on:contextmenu|preventDefault
					type="button"
					tabindex="-1"
					on:touchend={touchStop}
					on:touchcancel={touchStop}
					on:touchstart|preventDefault={() => {
						game.playerRotate()
					}}>{"spin"}</button
				>
			{/if}
			<TouchButton onAction={() => game.playerMoveRight()}>&gt;</TouchButton>
		{/if}
	</div>
</div>

<div class="app settings" hidden={!showTouchSettings}>
	<div class="touchFloat right" hidden={!showTouchControls}>
		<button
			class="action"
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				//
				showTouchSettings = !showTouchSettings
			}}>SETTINGS</button
		>
	</div>

	<div class="top">
		<h4>SETTINGS</h4>
		<h6>v{version}</h6>
	</div>

	<fieldset>
		<label for="touchControlSwap">swap spin and drop</label>
		<input id="touchControlSwap" type="checkbox" bind:checked={touchControlSwap} />
	</fieldset>
	<fieldset
		on:touchend={() => {
			game.playerToggleDebug()
			showTouchSettings = false
		}}
	>
		<span>toggle debug info</span>
		<span class="go">&gt;</span>
	</fieldset>

	<hr />
	<fieldset>a mostly competent port of tetris written by Benjamin Gwynn</fieldset>
	<fieldset>
		<a href="https://github.com/benjamingwynn/tetris" target="_blank">
			<span>view project on Github</span>
			<span class="go">&gt;</span>
		</a>
	</fieldset>
</div>

<style lang="less">
	:global(*) {
		box-sizing: border-box;
		user-select: none;
		margin: 0;
		padding: 0;
		font-weight: normal;
		color: inherit;
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

	.app {
		height: 100%;
		position: fixed;
		right: 0;
		left: 0;
		bottom: 0;
		top: 0;
		display: block;
		--animation-time: 0.3s;
		transition-duration: var(--animation-time);
		transition-property: transform visibility;

		visibility: visible;
		transform: rotateY(0deg);

		&[hidden] {
			transition-timing-function: ease-in;
			visibility: hidden;
		}

		&:not([hidden]) {
			transition-timing-function: ease-out;
			transition-delay: var(--animation-time);
		}

		&.primary {
			&[hidden] {
				transform: rotateY(-90deg);
			}
		}

		&[hidden] {
			transform: rotateY(90deg);
		}
	}

	.app.settings {
		background: black;
		font-size: 1.5em;

		display: flex;
		flex-flow: column nowrap;

		.top {
			height: 6rem;
			padding: 0 0.3em;
			display: flex;
			flex-flow: column nowrap;
			justify-content: center;
		}

		fieldset {
			display: grid;
			grid-template-columns: 1fr 2em;
			border: none;
			padding: 0.5em 0.6em;

			a {
				display: contents;
				font: inherit;
			}
		}

		hr {
			margin-top: auto;
			border-color: #444;
		}

		.go {
			text-align: center;
		}
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

	.game {
		display: flex;
	}

	canvas {
		margin: auto;
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

	.cursorControls {
		display: flex;
		justify-content: space-between;
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

			&[disabled] {
				color: grey;
			}
		}
	}

	.touchFloat {
		&.right {
			right: 0;
		}

		position: fixed;
		top: 0;
		display: flex;
		gap: 0.5em;
		flex-flow: column nowrap;

		&[hidden] {
			display: none;
		}
	}

	.youDied {
		background: rgba(0, 0, 0, 0.2);
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

	button.action {
		height: 4.5rem;
		width: 4.5rem;

		appearance: none;
		border: double #666 6px;
		color: white;
		background: transparent;
		font-size: 1.2rem;
		font-family: inherit;
		outline: none;

		&.active {
			color: yellow;
			font-weight: bold;
		}
	}

	.touchFloat button.action {
		height: 6rem;
		width: 6rem;
		border-color: #444;
	}
</style>
