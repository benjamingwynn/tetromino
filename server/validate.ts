/** @format */

import packageJSON from "../package.json" assert {type: "json"}
import {errors} from "util/errors.ts"
import {Submission} from "./api.ts"

const {version} = packageJSON

export const MAX_USERNAME_LENGTH = 16

// username should only contain letters (a-z, A-Z) or spaces
export const VALID_USERNAME_REGEX: RegExp = /^[a-zA-Z\s]+$/

const MAX_TICKS = 100_000
const MAX_SEED = 1_000_000_000

/**
 * returns boolean if successful
 */
export function isValidUsername(username: any): username is string {
	return typeof username === "string" && username.length >= 3 && username.length < MAX_USERNAME_LENGTH && VALID_USERNAME_REGEX.test(username)
}

/** returns boolean if successful */
export function isValidSubmission(obj: any): obj is Submission {
	const rtn =
		typeof obj === "object" &&
		typeof obj.seed === "number" &&
		obj.seed > 0 &&
		obj.seed < MAX_SEED &&
		typeof obj.score === "number" &&
		obj.score >= 0 &&
		obj.score < Number.MAX_SAFE_INTEGER &&
		typeof obj.ticks === "number" &&
		obj.ticks > 0 &&
		obj.ticks < MAX_TICKS

	if (!rtn) console.error("INVALID SUBMISSION:", obj)
	return rtn
}

export function assertValid(data: Partial<{clientVersion: string; submission: Submission; username: string}>): void | never {
	if (typeof data.clientVersion !== "undefined") {
		if (version !== data.clientVersion) {
			throw errors.VERSION_MISMATCH
		}
	}

	if (typeof data.username !== "undefined") {
		if (!isValidUsername(data.username)) {
			throw errors.BAD_USERNAME
		}
	}

	if (typeof data.submission !== "undefined") {
		if (!isValidSubmission(data.submission)) {
			throw errors.BAD_DATA
		}
	}
}
