/** @format */

import {censorUsername, makeExpletive} from "./censor.ts"
import {datastore} from "./datastore.ts"
import OpenAI from "openai"

const initKnownWords = async (): Promise<Record<string, boolean>> => {
	return {}
}

const openai = process.env.OPENAI_API_KEY
	? new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})
	: undefined
if (!openai) {
	console.error("\n\n[WARNING] Censoring usernames with AI is not available, please define OPENAI_API_KEY!\n\n")
}

/** returns a boolean for whether the AI model is okay with the word or not */
export async function isWordAppropriate(word: string): Promise<boolean> {
	if (!openai) {
		throw new Error("Censoring usernames with AI is not available")
	}

	// cache known bad words, we can use this for building our own AI in the future if we get enough data
	const knownWords = await datastore("knownWords", initKnownWords)

	if (word in knownWords) {
		return knownWords[word]
	}

	const response = await openai.chat.completions.create({
		model: "gpt-3.5-turbo",
		messages: [
			{
				role: "system",
				content: "You are to determine whether a username is appropriate or not. You are to reply with only 'Yes' or 'No'.",
			},
			{
				role: "user",
				content: [
					{
						text: word,
						type: "text",
					},
				],
			},
		],
		temperature: 0.9,
		max_tokens: 5,
		top_p: 1,
		frequency_penalty: 0,
		presence_penalty: 0,
	})

	const result = response.choices.at(0)?.message.content?.toLowerCase()
	const isYes = result === "yes"
	const isNo = result === "no"
	if (isYes || isNo) {
		console.log(`[*] AI model decided word "${word}" is ${isYes ? "appropriate" : "inappropriate"}.`)
		knownWords[word] = isYes
		knownWords.flush()
	}
	return isYes
}

/** tries to censor the username with the AI model, but falls through to traditional censoring if the AI model is unavailable. Returns the string but censored where necessary */
export async function censorFallthrough(word: string): Promise<string> {
	try {
		const isOkay = await isWordAppropriate(word)
		if (!isOkay) {
			return makeExpletive(word.length)
		}
		return word
	} catch {
		return censorUsername(word)
	}
}
