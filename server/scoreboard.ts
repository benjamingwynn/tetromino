/** @format */

import {GameLog} from "src/tetris/Game.ts"
import {datastore} from "./datastore.ts"
import {getRunAtIndex} from "./runs.ts"

/** [score, runIndexID] */
type ScoreboardEntry = [number, number]

const MAX_SCOREBOARD_SIZE = 20

const initScoreboard = async (): Promise<ScoreboardEntry[]> => []

export async function getScoreboard(page = 0) {
	const scores = await datastore("scoreboard", initScoreboard)
	const rtn: {id: number; username: string; score: number}[] = []
	for (const [score, id] of scores) {
		const {username} = await getRunAtIndex(id)
		rtn.push({score, id, username: username})
	}
	return rtn
	//
}

/** returns either a number or false */
export async function calculateScoreboardPosition(score: number): Promise<number | false> {
	const scores = await datastore("scoreboard", initScoreboard)

	console.log(scores)
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
		if (scores.length < MAX_SCOREBOARD_SIZE) {
			return scores.length + 1
		}
	}

	return false
}

export async function addToScoreboard(score: number, id: number) {
	const scores = await datastore("scoreboard", initScoreboard)
	const entry: ScoreboardEntry = [score, id]
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
			scores.splice(i, +(scores.length === MAX_SCOREBOARD_SIZE), entry)
			void scores.flush()
			return
		}
	}
	if (scores.length < MAX_SCOREBOARD_SIZE) {
		scores.push(entry)
		void scores.flush()
	}
}
