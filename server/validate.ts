/** @format */
import {Submission} from "./api.ts"

export const MAX_USERNAME_LENGTH = 16

// username should only contain letters (a-z, A-Z) or spaces
export const VALID_USERNAME_REGEX: RegExp = /^[a-zA-Z\s]+$/

const MAX_TICKS = 1_000_000

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
		typeof obj.score === "number" &&
		obj.score >= 0 &&
		obj.score < Number.MAX_SAFE_INTEGER &&
		typeof obj.ticks === "number" &&
		obj.ticks > 0 &&
		obj.ticks < MAX_TICKS

	if (!rtn) console.error("INVALID SUBMISSION:", obj)
	return rtn
}
