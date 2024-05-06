/** @format */

import {findBadWordLocations, replaceBadWords, preprocessWordLists} from "deep-profanity-filter"
// @ts-expect-error there are (thankfully) no type definitions for this module
import badwords from "badwords-list"

const symbols = ["@", "*", "!", "#", "?"] as const
export function makeExpletive(length: number) {
	let str = ""
	let i = 0
	while (str.length < length) {
		str += symbols[i++ % symbols.length]
	}
	return str
}

export function basicCensor(str: string) {
	for (const badWord of words) {
		let i: number
		while ((i = str.toLowerCase().indexOf(badWord)) >= 0) {
			const start = str.substring(0, i)
			const middle = makeExpletive(badWord.length)
			const end = str.substring(i + badWord.length)
			str = start + middle + end
		}
	}

	return str
}

const words = badwords.array
const wordFilter = preprocessWordLists(words, ["xxx"])
export function censorUsername(str: string) {
	// step 1. censor with the deep-profanity-filter module
	const locations = findBadWordLocations(str.toLowerCase(), wordFilter)
	const out = replaceBadWords(str, locations)

	// step 2. censor anything more basic left over
	return basicCensor(out)
}
