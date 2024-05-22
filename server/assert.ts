/** @format */

import {errors} from "util/errors.ts"
import * as semver from "semver"
import {Submission} from "./api.ts"
import packageJSON from "../package.json" assert {type: "json"}
import {isValidUsername, isValidSubmission} from "./validate.ts"

/**
 * @format
 * @throws string when unsuccessful
 */

const {version} = packageJSON

export function assertValid(
	data: Partial<{clientVersion: string; submission: Submission; username: string}>,
	required: ("clientVersion" | "submission" | "username")[] = []
): void | never {
	if (typeof data.clientVersion !== "undefined") {
		// if the submission is on a newer or equal version
		const isVersionValid = semver.satisfies(version, ">=" + version)
		if (!isVersionValid) {
			throw errors.VERSION_MISMATCH
		}
	} else if (required.includes("clientVersion")) {
		throw errors.MISSING_DATA
	}

	if (typeof data.username !== "undefined") {
		if (!isValidUsername(data.username)) {
			throw errors.BAD_USERNAME
		}
	} else if (required.includes("username")) {
		throw errors.MISSING_DATA
	}

	if (typeof data.submission !== "undefined") {
		if (!isValidSubmission(data.submission)) {
			throw errors.BAD_DATA
		}
	} else if (required.includes("submission")) {
		throw errors.MISSING_DATA
	}
}

/** @throws string when unsuccessful */
export function assertRunID(data?: any) {
	if (typeof data === "number" && data > Number.MIN_SAFE_INTEGER && data < Number.MAX_SAFE_INTEGER) {
		// ok
		return
	}

	throw errors.BAD_DATA
}
