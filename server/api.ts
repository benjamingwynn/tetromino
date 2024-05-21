/** @format */

import packageJSON from "../package.json" assert {type: "json"}
import type {GameLog} from "src/game/Game.ts"
import {replay} from "./simulator.ts"
import {errors} from "util/errors.ts"
import {Scoreboard, addDeathGrid, addToScoreboard, calculateScoreboardPosition, getScoreboard} from "./scoreboard.ts"
import {assertRunID, assertValid} from "./validate.ts"
import {addToRuns, getRunAtIndex} from "./runs.ts"
import semver from "semver"
import {censorFallthrough} from "./censorAI.ts"

const {version} = packageJSON

export type Submission = {log: GameLog; seed: number; score: number; ticks: number}

/** list scores */
async function list() {
	return getScoreboard()
}

/** fetch replay info for a specific run */
async function get(id: number) {
	assertRunID(id)
	const run = await getRunAtIndex(id)
	if (semver.satisfies(run.version, "<0.0.15")) {
		throw errors.RUN_TOO_OLD
	}
	if (run) {
		return {...run, username: await censorFallthrough(run.username)}
	} else {
		throw errors.RUN_DOES_NOT_EXIST
	}
}

/**
 * Validate this run.
 * Returns the position the run would be in the scoreboard, or false if the run is valid but the scoreboard is false.
 *
 * Throws errors if any parameters are invalid or if the game log and seed did not simulate to the same score.
 */
async function validate(this: void, clientVersion: string, submission: Submission): Promise<number | false> {
	assertValid({clientVersion, submission}, ["clientVersion", "submission"])

	const {ok} = replay(submission.seed, submission.score, submission.ticks, submission.log)
	if (!ok) {
		throw errors.SCORE_MISMATCH
	}

	const pos = await calculateScoreboardPosition(submission.score)
	// we're successful, calculate where this score would be
	return pos
}

/**
 * Submit the high score with a username. This will revalidate.
 */
async function submit(this: void, clientVersion: string, submission: Submission, username: string) {
	// check data is valid first
	assertValid({clientVersion, submission, username}, ["clientVersion", "submission", "username"])

	// re-check this to make sure someone didn't skip the validate step
	const {ok, game} = replay(submission.seed, submission.score, submission.ticks, submission.log)
	if (!ok) {
		throw errors.SCORE_MISMATCH
	}

	// great, this is a valid run!

	// add the run
	const id = await addToRuns({
		log: submission.log,
		score: submission.score,
		seed: submission.seed,
		ticks: submission.ticks,
		username: username.trim(),
		version: clientVersion,
	})

	// add the high score
	await addToScoreboard(submission.score, id)

	// add to deathGrids
	await addDeathGrid(id, game.grid)
}

export const api = {
	list,
	get,
	validate,
	submit,
} as const

export type API = typeof api
