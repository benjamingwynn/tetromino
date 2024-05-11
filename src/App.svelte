<!-- @format -->
<script lang="ts">
	import {onMount} from "svelte"
	import Score from "./components/Score.svelte"
	import HighScore from "./components/HighScore.svelte"
	import TouchButton from "./components/TouchButton.svelte"
	import GameOver from "./components/GameOver.svelte"
	import {Game} from "./game/Game"
	import {version} from "../package.json"
	import "./font/RedAlert.css"
	import AnimatedText from "./components/AnimatedText.svelte"
	import Leaderboard from "./components/Leaderboard.svelte"
	import Confirm from "./components/Confirm.svelte"
	import {ScoreboardResult} from "server/scoreboard"
	import api from "./client/api"
	import {StoredRun} from "server/runs"
	import {noop, sleep} from "util/util"

	/** ignore inputs if the user paused the pause button this long ago (in ms) */
	const IGNORE_INPUT_AFTER_PAUSE = 1_000

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
		const success = game2.replay(game.gameLog, game.getTicks())
		const score = game2.getScore()
		if (success && score === _score) {
			console.log("**** SUCCESS!! ****")
			// canvas.style.borderColor = "green"
			altCanvas.style.borderColor = "green"
		} else if (!success && score === _score) {
			console.warn("**** NON-SUCCESS BUT MATCHING SCORE!! ****")
			canvas.style.borderColor = "orange"
			altCanvas.style.borderColor = "orange"
		} else {
			console.error("**** FAILURE!! ****")
			canvas.style.borderColor = "red"
			altCanvas.style.borderColor = "red"
			altCanvas.hidden = false
		}
		// console.log("game2=", game2)
		requestAnimationFrame(() => {
			game2.destroy()
		})
	}

	const newGame = () => {
		// altCanvas.hidden = true
		touchSubmitScoreStage2 = false
		replay = undefined
		replayLoading = false
		replayError = undefined
		_score = 0
		touchStop()
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
					game.onUpdate = noop

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
	}

	const onGameOver = () => {
		const gameLog = structuredClone(game.gameLog)
		const ticks = game.getTicks()
		const _game = game

		if (!game.loseAnimationPromise) {
			throw new Error("expected lose animation to be running on game over")
		}

		// start repeating playback after lose animation
		game.loseAnimationPromise.then(() => {
			if (game !== _game) return // make sure this is the same game (e.g. game not reset during lose animation)
			game.playback(gameLog, ticks + 1, Math.min(30_000, Math.max(3_000, ticks * 1)), true).catch((err) => {
				console.log(">>>>>> PLAYBACK TERMINATED <<<<<<<<", err)
			})
		})
	}

	let nextTouchSpeedUp: ReturnType<typeof setTimeout> | undefined = undefined
	const touchSpeedUp = () => {
		game.playerSpeedUp()
		if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		nextTouchSpeedUp = setTimeout(touchSpeedUp, 16.7 * 3)
	}

	let touchControlsDisabled = false
	let nextFrame: number
	const frame = () => {
		if (showTouchControls) {
			touchControlsDisabled = shouldIgnoreInput() && !_gameOver
		}

		nextFrame = requestAnimationFrame(frame)
	}

	onMount(() => {
		nextFrame = requestAnimationFrame(frame)
		newGame()

		return () => {
			cancelAnimationFrame(frame)
			game.destroy()
			if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
		}
	})

	const touchStop = () => {
		if (nextTouchSpeedUp) clearTimeout(nextTouchSpeedUp)
	}

	let showLeaderboard = false
	let paused = false
	let gameMute = !!localStorage.mute
	let touchControlSwap = !!localStorage.touchControlSwap
	let lockTouchSubmitScore = true
	let touchSubmitScoreStage2 = false
	let timeLastUnpaused: undefined | number

	$: game && (game.muteSounds = gameMute || !!replay || _gameOver)
	$: game && (game.paused = paused || showTouchSettings || (showLeaderboard && !replay))
	$: localStorage.mute = gameMute ? 1 : ""
	$: localStorage.touchControlSwap = touchControlSwap ? 1 : ""
	$: localStorage.highScore = _highScore

	const shouldIgnoreInput = () => {
		if (replay) return true
		if (_gameOver) return true
		if (paused) return true
		if (!timeLastUnpaused) return false
		const okayAfter = timeLastUnpaused + IGNORE_INPUT_AFTER_PAUSE
		return Date.now() < okayAfter
	}

	// make sure we don't get stuck in the settings screen
	$: if (!showTouchControls) showTouchSettings = false

	let confirmStuff: {body: string; callback: (confirm: boolean) => void} | undefined = undefined
	// let playback: {error?: string; inProgress?: Promise<void>} | false = false
	let replay: StoredRun | undefined = undefined
	let replayLoading = false
	let replayError: string | undefined = undefined

	const playbackGame = async (result: ScoreboardResult) => {
		const shouldContinue = await new Promise((resolve) => {
			const callback = (b: boolean) => {
				confirmStuff = undefined
				console.warn(">>>>>>>CALLBACK>>>>>>>>", b)
				resolve(b)
			}
			confirmStuff = {body: "Playing back a game will cause your current game to end!\n\nPlay/pause/speed control are not available yet.", callback}
		})
		if (!shouldContinue) {
			console.log("user bailed from replaying game")
			return
		}

		// hide the leaderboard
		showLeaderboard = false

		paused = false
		_gameOver = false

		// destroy the existing game
		game.destroy()

		// we're now in a loading state
		replayLoading = true

		try {
			// fetch the full replay
			const _replay = await api.get(result.id)
			replay = _replay

			// setup the game
			replayLoading = false

			game = new Game({
				canvas,
				enableAudio: false,
				previewCanvas,
				seed: replay.seed,
				onUpdate: ({score, gameOver}) => {
					_score = score
				},
			})

			const animationSpeed = (1 / replay.score) * 250_000
			await game.playback(replay.log, replay.ticks, 60_000, true, animationSpeed)
		} catch (err) {
			console.error(err)
			if (typeof err === "string") {
				replayError = err
			}
		}
	}

	const aboutText = `a competitive falling shape game written by Benjamin Gwynn`

	// @ts-expect-error export currently mounted game to window for debugging
	$: window.game = game
</script>

{#if replayError}
	<div class="replayError">
		<h1>replayError</h1>
		<h2>{replayError}</h2>

		<button
			on:contextmenu|preventDefault
			type="button"
			class="action long"
			tabindex="-1"
			on:click={() => {
				newGame()
				showLeaderboard = true
			}}>Back to leaderboard</button
		>
	</div>
{/if}

{#if replayLoading}
	<h1>loading playback, please wait</h1>
{/if}

{#if confirmStuff}
	<Confirm body={confirmStuff.body} callback={confirmStuff.callback} />
{/if}

<svelte:window
	on:keydown={(ev) => {
		if (!navigator.maxTouchPoints) {
			showTouchControls = false
		}

		// ignore keyboard presses if we're focused on an input
		if (document.activeElement?.tagName === "INPUT" && ev.key !== "Escape") {
			return
		}

		if (ev.key === " " || ev.key === "ArrowUp" || ev.key === "w") {
			if (shouldIgnoreInput()) return
			game.playerRotate()
		} else if (ev.key === "ArrowRight" || ev.key === "d") {
			if (shouldIgnoreInput()) return
			game.playerMoveRight()
		} else if (ev.key === "ArrowLeft" || ev.key === "a") {
			if (shouldIgnoreInput()) return
			game.playerMoveLeft()
		} else if (ev.key === "ArrowDown" || ev.key === "s") {
			if (shouldIgnoreInput()) return
			game.playerSpeedUp()
		} else if (ev.key === "r" || ev.key === "Escape") {
			// reset
			newGame()
		} else if (ev.key === "p") {
			// pause
			if (paused) {
				timeLastUnpaused = Date.now()
			}
			paused = !paused
		} else if (ev.key === "m") {
			// mute
			gameMute = !gameMute
		} else if (ev.key === "F1") {
			// pause
			game.playerToggleDebug()
		} else if (ev.key === "F2") {
			altCanvas.hidden = !altCanvas.hidden
		} else if (ev.key === "l") {
			showLeaderboard = !showLeaderboard
		} else {
			console.warn("unregistered key:", ev.key)
		}
	}}
/>

<div
	class="app primary"
	hidden={showTouchSettings || (showLeaderboard && showTouchControls)}
	class:dead={_gameOver}
	class:touch={showTouchControls}
	class:replay={!!replay}
>
	<main
		on:contextmenu|preventDefault
		on:touchstart={(ev) => {
			if (ev.target.tagName !== "INPUT") {
				ev.preventDefault()
			}
			if (shouldIgnoreInput()) return
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
		<div class="game">
			<canvas width="100px" height="200px" bind:this={canvas} class:notPlaying={paused || _gameOver || !!replay} />
			<canvas width="100px" height="200px" bind:this={altCanvas} hidden />
		</div>

		{#if _gameOver}
			<GameOver
				{onGameOver}
				{game}
				{newGame}
				{_score}
				{_highScore}
				{showTouchControls}
				{touchSubmitScoreStage2}
				toggleLeaderboard={() => (showLeaderboard = true)}
				changeLockTouchSubmitScore={(_) => (lockTouchSubmitScore = _)}
			/>
		{/if}
		<div class="stats" hidden={_gameOver}>
			<div class="scoreboard highScore">
				{#if replay}
					<h5>PLAYING<br />BACK</h5>
				{:else}
					<h5>TOP</h5>
					<HighScore score={_highScore} />
				{/if}
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
							if (paused) {
								timeLastUnpaused = Date.now()
							}
							paused = !paused //
						}}>{paused ? "UN <P>AUSE" : "<P>AUSE"}</button
					>

					<button
						on:contextmenu|preventDefault
						type="button"
						class="action"
						tabindex="-1"
						on:click={() => {
							newGame()
						}}>&lt;R&gt;ESET</button
					>
				</div>

				<button
					on:contextmenu|preventDefault
					type="button"
					class="action long"
					tabindex="-1"
					class:active={showLeaderboard}
					on:click={() => {
						showLeaderboard = true
					}}>&lt;L&gt;EADERBOARD</button
				>

				{#if !replay}
					<button
						on:contextmenu|preventDefault
						type="button"
						class="action long"
						class:active={gameMute}
						tabindex="-1"
						on:click={() => {
							gameMute = !gameMute
						}}>{gameMute ? "UN <M>UTE" : "<M>UTE"}</button
					>
				{/if}
			{/if}
		</div>
		<div class="about">
			<div class="about-inner">
				{#if replay}
					{@const sec = Math.floor((replay.ticks * 20) / 1000)}
					<h2>{replay.username}</h2>
					<h3>
						scored {replay.score} points in {Math.floor(sec / 60)
							.toString()
							.padStart(2, "0")} min {(sec % 60).toString().padStart(2, "0")} sec
					</h3>
				{:else}
					<h4>Benjamin's Tetromino Game v{version}</h4>
					<h5>{aboutText}</h5>
					{#if !showTouchControls}
						<h5>Move with A/D or left/right arrows, down/S to speed up, up/W/space to spin.</h5>
					{/if}
				{/if}
			</div>
		</div>
	</main>

	<div class="touchFloat left" hidden={!showTouchControls || _gameOver || !!replay}>
		<button
			on:contextmenu|preventDefault
			type="button"
			tabindex="-1"
			class="action"
			class:active={paused}
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				if (paused) {
					timeLastUnpaused = Date.now()
				}
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
		{#if replay}
			<button
				on:contextmenu|preventDefault
				class="action"
				type="button"
				tabindex="-1"
				on:touchend={touchStop}
				on:touchcancel={touchStop}
				on:touchstart|preventDefault={() => {
					newGame()
				}}>NEW GAME</button
			>
		{:else}
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
		{/if}
		<button
			on:contextmenu|preventDefault
			class="action"
			type="button"
			tabindex="-1"
			on:touchend={touchStop}
			on:touchcancel={touchStop}
			on:touchstart|preventDefault={() => {
				//
				showLeaderboard = true
				// game.playerToggleDebug()
			}}>LEADER BOARD</button
		>
	</div>

	{#if _gameOver}
		<!-- <div class="youDied">
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
		</div> -->
	{/if}
	<div class="touchControls" hidden={!(showTouchControls && !replay && !replayLoading)} class:disabled={touchControlsDisabled}>
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
			<button
				on:contextmenu|preventDefault
				type="button"
				tabindex="-1"
				on:touchend={touchStop}
				on:touchcancel={touchStop}
				disabled={lockTouchRetry || lockTouchSubmitScore}
				on:touchstart|preventDefault={() => {
					if (lockTouchSubmitScore) {
						return
					}
					if (touchSubmitScoreStage2) {
						// HACK: doing this with svelte is actually quite difficult, so just hack it via the DOM
						document.querySelector("#submitMobile")?.dispatchEvent(new SubmitEvent("submit", {}))
					} else {
						touchSubmitScoreStage2 = true
					}
					// newGame()
				}}>{touchSubmitScoreStage2 ? "confirm" : "submit"}</button
			>
		{:else}
			<TouchButton
				onAction={() => {
					if (shouldIgnoreInput()) return
					game.playerMoveLeft()
				}}>&lt;</TouchButton
			>
			{#if touchControlSwap}
				<TouchButton
					onAction={() => {
						if (shouldIgnoreInput()) return
						game.playerSpeedUp()
					}}>drop</TouchButton
				>
			{:else}
				<button
					class="rotate"
					on:contextmenu|preventDefault
					type="button"
					tabindex="-1"
					on:touchend={touchStop}
					on:touchcancel={touchStop}
					on:touchstart|preventDefault={() => {
						if (shouldIgnoreInput()) return
						game.playerRotate()
					}}>{"spin"}</button
				>
			{/if}
			<TouchButton
				onAction={() => {
					if (shouldIgnoreInput()) return
					game.playerMoveRight()
				}}>&gt;</TouchButton
			>
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
	<fieldset
		on:touchend={() => {
			newGame()
			showTouchSettings = false
		}}
	>
		<span>reset game</span>
		<span class="go">&gt;</span>
	</fieldset>

	<hr />
	<fieldset>{aboutText}</fieldset>
	<fieldset>
		<a href="https://github.com/benjamingwynn/tetromino" target="_blank">
			<span>view project on Github</span>
			<span class="go">&gt;</span>
		</a>
	</fieldset>
</div>

{#if showTouchControls}
	<div class="app leaderboard" hidden={!showLeaderboard}>
		<div class="touchFloat right" hidden={!showTouchControls}>
			<button
				class="action"
				on:contextmenu|preventDefault
				type="button"
				tabindex="-1"
				on:touchend={touchStop}
				on:touchcancel={touchStop}
				on:click|preventDefault={() => {
					showLeaderboard = false
				}}>X</button
			>
		</div>

		<div class="top">
			<h4>LEADERBOARD</h4>
			<h6>v{version}</h6>
		</div>

		{#if showLeaderboard}
			<Leaderboard {playbackGame} />
		{/if}
	</div>
{:else}
	<div class="floating leaderboard" hidden={!showLeaderboard}>
		<div class="top">
			<h4>LEADERBOARD</h4>
			<h6>v{version}</h6>
		</div>

		{#if showLeaderboard}
			<Leaderboard {playbackGame} />
		{/if}

		<div class="bottom">
			<button
				type="button"
				on:click={() => {
					showLeaderboard = false
				}}>C&lt;L&gt;OSE</button
			>
		</div>
	</div>
{/if}

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
			padding: 1em 0.6em;

			&:nth-child(even) {
				background: #111;
			}

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

	.app.leaderboard {
		background: black;

		display: flex;
		font-size: 1.5em;
		flex-flow: column nowrap;
	}

	.leaderboard .top {
		flex: 0 0 auto;
		height: 6rem;
		padding: 0 0.3em;
		display: flex;
		flex-flow: column nowrap;
		justify-content: center;
	}

	.leaderboard .bottom {
		margin-top: auto;
		display: flex;
	}

	.leaderboard.floating {
		background: rgba(0, 0, 0, 0.8);
		position: fixed;
		font-size: 2.3em;
		top: 4rem;
		bottom: 6rem;
		right: 0;
		left: 0;
		margin: auto;
		width: 100%;
		max-width: 20em;
		border: 1rem double orange;
		display: flex;
		border-radius: 6px;
		flex-flow: column nowrap;

		&[hidden] {
			display: none;
		}

		button {
			margin-left: auto;
			font: inherit;
			color: inherit;
			background: none;
			border: none;
			outline: none;
			appearance: none;
			padding: 0.5em;

			&:focus {
				color: yellow;
			}
		}
	}

	main {
		padding-top: 1em;
		display: grid;
		grid-template-columns: auto 5em 10em 5em;
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

		&.notPlaying {
			border-color: #333;
		}
	}

	.stats {
		display: flex;
		flex-flow: column nowrap;
		gap: 1em;
		grid-column: 3;

		&[hidden] {
			display: none;
		}
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
		grid-column: 1 / span 4;
		margin: auto;
		text-align: center;
	}

	@media (max-width: 639px) {
		.app.dead {
			.about {
				display: none;
			}
		}

		.app:not(.touch) {
			.about {
				grid-row: 4;
			}
		}

		main {
			grid-template-columns: auto;
			grid-template-rows: auto 8rem 3rem 10rem;
			padding-right: 0;

			.stats {
				grid-column: auto;
				display: grid;
				grid-template-columns: 1fr 1fr 1fr;
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
		font-size: 4em;
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

		&.disabled {
			opacity: 0.5;
		}

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

		&.long {
			width: 100%;
			height: 3.5rem;
		}

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

	.app.replay {
		// .scoreboard {
		// }

		// .highScore {
		// 	display: none;
		// }
	}

	.replayError {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		height: 100%;
		width: 100%;
		flex-flow: column nowrap;
		justify-content: center;
		align-items: center;
		text-align: center;
		padding: 0 1em;
		gap: 0.5em;
		z-index: 2;
	}
</style>
