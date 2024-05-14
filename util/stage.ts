/** @format */

import {ansi} from "./ansi.ts"

export async function stage<T>(name: string, fn: () => Promise<T>): Promise<T> {
	try {
		console.log("[ .. ] " + name)
		const start = Date.now()
		const rtn = await fn()
		console.log(ansi("[ OK ] ", "green") + name + "  " + ansi("+" + Math.ceil(Date.now() - start) + "ms", "cyan"))
		return rtn
	} catch (err) {
		console.log(ansi("[FAIL] ", "red", undefined, ["bold"]) + name.toString())
		throw err
	}
}
