/** @format */

/** generates a new game seed based on the current time (or time provided, in ms) */
export function generateSeed(time = Date.now()) {
	return Math.floor(time / 60_000)
}

/** generates the appropriate range of seeds to allow, based on the current time and provided argument */
export function generateSeedRange(secondsToAllow: number): [number, number] {
	const now = Date.now()
	const then = now - secondsToAllow * 1000
	return [Math.floor(then / 60_000), generateSeed(now)]
}
