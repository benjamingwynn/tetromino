/** @format */
import type {GameLog} from "src/game/Game.ts"
import {datastore} from "./datastore.ts"

export type StoredRun = {log: GameLog; seed: number; score: number; ticks: number; version: string; username: string}

export const initRuns = async (): Promise<StoredRun[]> => []

export async function getRunAtIndex(index: number): Promise<StoredRun> {
	const runs = await datastore("runs", initRuns)
	const rtn = runs[index]
	if (rtn === undefined) throw new Error("Nothing at index")
	return rtn
}

export async function addToRuns(run: StoredRun) {
	const runs = await datastore("runs", initRuns)
	runs.push(run)
	void runs.flush()
	return runs.length - 1
}
