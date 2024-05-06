/**
 *
 * In the future, especially if we wanted to store more scores, we can make this a real database.
 *
 * @format
 * @file
 */

import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"

export type DataStore<T extends object> = T & {
	flush: () => Promise<void>
}

async function makeDataStore<T extends object>(key: string, store: () => Promise<T>) {
	await fsp.mkdir(".data", {recursive: true})

	const p = path.join(process.cwd(), ".data", key + ".json")

	let data: DataStore<T>
	if (fs.existsSync(p)) {
		data = JSON.parse((await fsp.readFile(p)).toString())
	} else {
		data = (await store()) as DataStore<T>
	}

	const flush = async () => {
		await fsp.writeFile(p, JSON.stringify(data))
	}
	return new Proxy(data, {
		get: (t, k) => {
			if (k === "flush") {
				return flush
			}
			return (data as any)[k]
		},
	})
}

const openDataStores: Record<string, DataStore<any>> = {}

export const datastore = async <T extends object>(key: string, init: () => Promise<T>): Promise<DataStore<T>> => {
	const has = openDataStores[key]
	if (has) {
		return has
	}
	const d = await makeDataStore<T>(key, init)
	openDataStores[key] = d
	return d
}
