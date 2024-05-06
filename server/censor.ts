/** @format */

import {findBadWordLocations, getBadWords, replaceBadWords, preprocessWordLists} from "deep-profanity-filter"
// @ts-expect-error there are (thankfully) no type definitions for this module
import badwords from "badwords-list"

const wordFilter = preprocessWordLists(badwords.array, ["xxx"])

export function censorUsername(str: string) {
	const locations = findBadWordLocations(str, wordFilter)
	const out = replaceBadWords(str, locations)
	return out
}
