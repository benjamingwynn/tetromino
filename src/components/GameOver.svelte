<!-- @format -->
<script lang="ts">
	import {sleep} from "util/util.ts"
	import {api} from "client/api.ts"
	import {version} from "../../package.json"
	import AnimatedText from "./AnimatedText.svelte"
	import PleaseWait from "./PleaseWait.svelte"
	import type {Game} from "src/game/Game"
	import {MAX_USERNAME_LENGTH, isValidUsername} from "server/validate.ts"

	export let game: Game
	export let _score: number
	export let _highScore: number
	export let showTouchControls: boolean
	export let newGame: () => void
	export let toggleLeaderboard: () => void
	export let changeLockTouchSubmitScore: (lockTouchSubmitScore: boolean) => void
	changeLockTouchSubmitScore(false)
	export let touchSubmitScoreStage2 = false
	export let onGameOver: () => void

	let submissionError: string | undefined = undefined
	let submissionSuccessful: boolean = false
	let submitting = false
	let username: string = localStorage.username ?? ""

	const makeSubmission = () => {
		const rtn = {log: game.gameLog, score: _score, seed: game.seed, ticks: game.getTicks()}
		onGameOver()
		return rtn
	}

	const submission = makeSubmission()

	const gg = "Your high score has been submitted to the leaderboard, congratulations!"
	const errorsSay = "Leaderboard upload unavailable: "
	$: localStorage.username = username

	$: usernameValid = isValidUsername(username)
</script>

<div class="gameOver">
	<h3>GAME OVER</h3>
	<h4>You scored {_score} points.</h4>

	{#if touchSubmitScoreStage2 && showTouchControls}
		{#if submitting}
			{#if submissionError}
				<h4 style:color="pink">
					<AnimatedText text={submissionError}></AnimatedText>
				</h4>
			{:else if submissionSuccessful}
				<h4><AnimatedText text={gg} /></h4>
			{:else}
				<PleaseWait />
			{/if}
		{:else}
			<h4>Please enter your name and press confirm to upload your score to the leaderboard.</h4>
			<form
				id="submitMobile"
				on:submit|preventDefault={() => {
					if (!usernameValid) return
					changeLockTouchSubmitScore(true)
					submitting = true
					submissionError = ""
					console.log("--will submit high score--", {username})
					api.submit(version, submission, username)
						.then(() => {
							submissionSuccessful = true
						})
						.catch((err) => {
							console.error("[submit fail]", err)
							submissionError = "Could not add to leaderboard: " + err + "."
						})
				}}
			>
				<input
					class:invalid={!usernameValid}
					required
					class="name"
					type="text"
					placeholder="Name"
					maxlength={MAX_USERNAME_LENGTH}
					bind:value={username}
					disabled={submitting}
				/>
			</form>
		{/if}
	{:else}
		{#if _score && _score === _highScore}
			<h4 style:color="yellow"><AnimatedText text={"NEW PERSONAL BEST!"}></AnimatedText></h4>
		{/if}
		{#await api.validate(version, submission)}
			<h4><AnimatedText text={"Checking your score"} /><AnimatedText text={"..."} duration={1000} loop={true} /></h4>
			{(changeLockTouchSubmitScore(true), "")}
		{:then result}
			{#if result}
				{(changeLockTouchSubmitScore(false), "")}
				<h3 style:color="limegreen">
					<AnimatedText text={`You placed #${result} on the leaderboard!${showTouchControls ? " Press submit below to add your score." : ""}`}
					></AnimatedText>
				</h3>
				{#if !showTouchControls}
					<form
						on:submit|preventDefault={() => {
							if (!usernameValid) return
							submitting = true
							submissionError = ""
							console.log("--will submit high score--", {username})
							api.submit(version, submission, username)
								.then(() => {
									submissionSuccessful = true
								})
								.catch((err) => {
									console.error("[submit fail]", err)
									submissionError = "Could not add to leaderboard: " + err + "."
								})
						}}
					>
						<!-- svelte-ignore a11y-autofocus -->
						<input
							class="name"
							autofocus
							type="text"
							placeholder="Name"
							maxlength={MAX_USERNAME_LENGTH}
							bind:value={username}
							disabled={submitting}
							class:invalid={!usernameValid}
						/>

						{#if submitting}
							{#if submissionError}
								<h4 style:color="pink">
									<AnimatedText text={submissionError}></AnimatedText>
								</h4>
							{:else if submissionSuccessful}
								<h4><AnimatedText text={gg} /></h4>
							{:else}
								<PleaseWait />
							{/if}
						{:else}
							<h6>press ENTER to submit your score to the leaderboard</h6>
						{/if}
					</form>
				{/if}
			{:else}
				{(changeLockTouchSubmitScore(true), "")}
				<h4><AnimatedText text={"You did not make the leaderboard."}></AnimatedText></h4>
			{/if}
		{:catch err}
			{(changeLockTouchSubmitScore(true), "")}
			<h4 style:color="pink">
				<AnimatedText text={errorsSay + err + "."}></AnimatedText>
			</h4>
		{/await}
		{#if !showTouchControls}
			{#if submissionSuccessful}
				<button
					type="button"
					on:click={() => {
						toggleLeaderboard()
					}}>&lt;L&gt;EADERBOARD</button
				>
			{/if}
			<button
				type="button"
				on:click={() => {
					newGame()
				}}>&lt;R&gt;ESTART</button
			>
		{/if}
	{/if}
</div>

<style lang="less">
	.gameOver {
		grid-column: span 3;
		margin: 0.2rem 1.5rem 0.2rem 0rem;
		border: purple double 0.8rem;
		padding: 1rem;
		font-size: 1.6em;

		display: flex;
		flex-flow: column nowrap;
		gap: 0.5em;

		&[hidden] {
			display: none;
		}

		h6 {
			font-weight: bold;
			color: yellow;
		}
	}

	@media (max-width: 639px) {
		.gameOver {
			grid-column: auto;
			grid-row: span 2;
			margin: 0.4rem;
			padding: 0.9rem 0.6rem;
			gap: 0;
			font-size: 1.35em;
			border-width: 0.6rem;
		}
	}

	input {
		background: transparent;
		border: solid 3px grey;

		&:disabled {
			border-color: #454545;
		}

		color: white;
		font: inherit;
		padding: 0.4rem 0.65rem;
		width: 100%;
		height: auto;
		appearance: none;
		outline: none;
		margin-bottom: 0.5em;

		&:focus {
			outline: yellow double 4px;
		}

		&.invalid {
			outline: red double 4px;
		}
	}

	input.name + h6 {
		opacity: 0;
	}
	input.name:focus + h6 {
		opacity: 1;
	}

	button {
		margin-left: auto;
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		outline: none;
		appearance: none;
		padding: 0 0.5em 1em 0;

		&:focus {
			color: yellow;
		}
	}

	#submitMobile {
		position: absolute;
		width: 90vw;
		left: 0;
		right: 0;
		top: 1.3em;
		z-index: 1;
		margin: auto;
		background: black;
		font-size: 3.5em;
	}
</style>
