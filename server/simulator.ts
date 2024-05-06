/** @format */

import {Game, GameLog} from "src/tetris/Game.ts"

/** returns boolean if successful */
export function replay(seed: number, score: number, max: number, log: GameLog) {
	const game2 = new Game({
		enableAudio: false,
		seed,
	})

	const success = game2.replay(log, max)
	const theScore = game2.getScore()
	let ok = false
	if (success && score === theScore) {
		console.log("**** SUCCESS!! ****")
		ok = true
	} else if (!success && score === theScore) {
		console.warn("**** NON-SUCCESS BUT MATCHING SCORE!! ****")
		//change this to false if we want to be stricter
		ok = true
	} else {
		console.error("**** FAILURE!! ****")
	}

	game2.destroy()
	return ok
}
