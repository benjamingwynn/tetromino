/** @format */

import {Game, GameLog} from "src/game/Game.ts"
import semver from "semver"

/** returns boolean if successful */
function simulate(game: Game, expectedScore: number, max: number, log: GameLog) {
	const success = game.simulate(log, max)
	const theScore = game.getScore()
	let ok = false
	if (success && expectedScore === theScore) {
		console.log("**** SUCCESS!! ****")
		ok = true
	} else if (!success && expectedScore === theScore) {
		console.warn("**** NON-SUCCESS BUT MATCHING SCORE!! ****")
		//change this to false if we want to be stricter
		ok = true
	} else {
		console.error("**** FAILURE!! ****")
	}

	return ok
}

/** returns boolean if successful */
export function replay(seed: number, score: number, max: number, log: GameLog) {
	const game = new Game({
		enableAudio: false,
		seed,
	})

	const ok = simulate(game, score, max, log)

	game.destroy()
	return ok
}

/** returns null if failed */
export function generateGrid(seed: number, score: number, max: number, log: GameLog, version: string) {
	console.log("generating grid...")
	const game = new Game({
		enableAudio: false,
		seed,
	})

	// before 0.0.15 the game had different timings
	if (semver.satisfies(version, "<0.0.15")) {
		console.log("using legacy game rules for grid generation")
		game.minStepInterval = 3
		game.easiness = 125
	}

	const ok = simulate(game, score, max, log)

	if (!ok) {
		game.destroy()
		return null
	}

	game.destroy()
	return game.grid
}
