/** @format */

import type {API} from "server/api.ts"
import {errors} from "util/errors.ts"
import {sleep} from "util/util.ts"

const API_HOST = ["localhost", "workstation.local"].includes(location.hostname)
	? `http://${location.hostname}:8000`
	: `https://79d2-137-220-119-228.ngrok-free.app`

const minimumTime = 1_000

async function action(key: string, data: any[]) {
	const t = Date.now()
	if (!navigator.onLine) {
		throw errors.NO_INTERNET
	}

	let f
	try {
		f = await fetch(API_HOST + "/" + key, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)})
	} catch {
		throw errors.CONNECTION_ERROR
	}

	let rtn
	try {
		const txt = await f.text()
		if (txt === "") {
			rtn = undefined
		} else {
			rtn = JSON.parse(txt)
		}
	} catch {
		throw errors.CLIENT_PARSE_ERROR
	}

	if (minimumTime) {
		const sleepFor = t + minimumTime - Date.now()
		console.log("result came in after", Date.now() - t, "ms. sleep extra", sleepFor, "ms.")
		if (sleepFor > 0) {
			await sleep(sleepFor)
		}
	}

	if (rtn?.error) {
		console.error("[error from server]", rtn.error)
		throw rtn.error
	}
	return rtn
}

function makeAPI(key: keyof API): any {
	return (...data: any) => {
		return action(key, data)
	}
}

export const api = new Proxy({} as API, {
	get: (target, prop: keyof API, receiver) => {
		if (target[prop]) return target[prop]
		return ((target as any)[prop] = makeAPI(prop))
	},
})
export default api
