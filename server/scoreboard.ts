/** @format */

import {GameLog} from "src/game/Game.ts"
import {datastore} from "./datastore.ts"
import {getRunAtIndex} from "./runs.ts"
import {generateGrid, replay} from "./simulator.ts"
import {censorUsername} from "./censor.ts"

/** [score, runIndexID, time added (if recorded)] */
type ScoreboardEntry = [number, number, number | undefined]
type DeathGrid = number[][]

const MAX_SCOREBOARD_SIZE = 50

const initScoreboard = async (): Promise<ScoreboardEntry[]> => []
const initDeathGrid = async (): Promise<DeathGrid[]> => []

export async function getScoreboard(page = 0) {
	const scores = await datastore("scoreboard", initScoreboard)
	const deathGrids = await datastore("deathGrids", initDeathGrid)
	const rtn: {id: number; username: string; score: number; grid: number[][]}[] = []
	let hadMissingDeathGrids = false

	for (const [score, id] of scores) {
		// generate a death grid for the run if we don't have one
		let grid: number[][]

		if (deathGrids[id]) {
			grid = deathGrids[id]
		} else {
			console.log("missing deathGrid for", id, "- generating...")
			const run = await getRunAtIndex(id)
			const _grid = generateGrid(run.seed, run.score, run.ticks, run.log, run.version)
			if (_grid) {
				grid = deathGrids[id] = _grid
				hadMissingDeathGrids = true
				console.log("finished generating deathGrid for", id)
			} else {
				throw new Error("Run already in scoreboard is invalid!")
			}
		}

		const {username} = await getRunAtIndex(id)
		rtn.push({score, id, username: censorUsername(username), grid})
	}

	if (hadMissingDeathGrids) {
		void deathGrids.flush()
	}

	return rtn
}

export async function addDeathGrid(id: number, grid: number[][]) {
	const deathGrids = await datastore("deathGrids", initDeathGrid)
	deathGrids[id] = grid
	await deathGrids.flush()
}

export type Scoreboard = Awaited<ReturnType<typeof getScoreboard>>
export type ScoreboardResult = Scoreboard[number]

/** returns either a number or false */
export async function calculateScoreboardPosition(score: number): Promise<number | false> {
	const scores = await datastore("scoreboard", initScoreboard)

	const smallestScore = scores.at(-1)
	if (!smallestScore) {
		// there are no scores, so you are #1
		console.log("(there are no scores)")
		return 1
	}
	if (score >= smallestScore[0]) {
		// congrats!
		// we now need to figure out where you'd be in the scoreboard
		for (let i = 0; i < scores.length; i++) {
			const [leaderboardScore, id] = scores[i]
			if (score > leaderboardScore) {
				return i + 1
			}
		}
	}
	if (scores.length < MAX_SCOREBOARD_SIZE) {
		return scores.length + 1
	}

	return false
}

export async function addToScoreboard(score: number, id: number) {
	const scores = await datastore("scoreboard", initScoreboard)
	const entry: ScoreboardEntry = [score, id, Date.now()]
	console.log("ADD ENTRY TO SCOREBOARD:", entry)

	if (scores.length === 0) {
		console.log("(there were no scores)")
		scores.push(entry)
		void scores.flush()
		return
	}

	for (let i = 0; i < scores.length; i++) {
		const [leaderboardScore, id] = scores[i]
		if (score > leaderboardScore) {
			scores.splice(i, 0, entry)
			const tooMany = scores.length - MAX_SCOREBOARD_SIZE
			if (tooMany >= 1) {
				// there are now too many scores in the scoreboard
				scores.splice(MAX_SCOREBOARD_SIZE, tooMany)
			}
			void scores.flush()
			return
		}
	}
	if (scores.length < MAX_SCOREBOARD_SIZE) {
		console.log("added entry because the scoreboard has space")
		scores.push(entry)
		void scores.flush()
	}
}
