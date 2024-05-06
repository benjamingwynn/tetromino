/** @format */

import http from "node:http"
import {api} from "./api.ts"
import {errors} from "util/errors.ts"

const keys = Object.keys(api)
const MAX_LENGTH = 1_600_000

// HACK: wait arbitrary amount of time, if node.js ran with `--watch` since the last port still may be bound to the going down process
await new Promise<void>((resolve) => setTimeout(resolve, 1000))

const handler = async (
	res: http.ServerResponse<http.IncomingMessage> & {
		req: http.IncomingMessage
	}
) => {
	console.log("process req...")

	const req = res.req

	if (!req.url) {
		throw new Error("Missing URL")
	}
	const host = req.headers.host
	if (!host) {
		throw new Error("Missing host header")
	}
	const url = new URL(`http://${host}${req.url}`)
	const key = url.pathname.substring(1)

	if (!keys.includes(key)) {
		throw new Error(`Route ("${key}") not registered.`)
	}

	console.log("*", req.socket.address(), req.method, req.url)

	if (req.headers["content-type"] !== "application/json") {
		throw new Error("Invalid content type")
	}

	console.log("process body...")
	const body = await new Promise<any>((resolve, reject) => {
		if (req.method === "POST") {
			let body = ""
			req.on("data", (chunk) => {
				body += chunk.toString()
				if (body.length > MAX_LENGTH) {
					body = ""
					reject(errors.TOO_MUCH_DATA)
					return
				}
			})
			req.on("end", () => {
				console.log("parsing of size", body.length / 1024, "k")
				resolve(JSON.parse(body))
			})
		} else {
			resolve([])
		}
	})

	console.log("firing:", key)

	const fn = api[key as keyof typeof api]

	try {
		// @ts-expect-error
		const rtn = await fn.apply(undefined, body)
		return rtn
	} catch (err) {
		// allow error strings to be sent to the user
		if (typeof err === "string") {
			return {error: err}
		} else {
			throw err
		}
	}
}

const ALLOWED_ORIGINS = ["http://localhost:1234", "http://workstation.local:1234", "https://tetris.benjamingwynn.com", "http://tetris.benjamingwynn.com"]

const RESPONSE_HEADERS = {"Content-Type": "application/json"}

const server = http.createServer((req, res) => {
	const origin = req.headers.origin
	if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
		// origin disallowed
		res.writeHead(400, {})
		res.end("origin disallowed")
		return
	}
	if (req.method === "OPTIONS") {
		// cors preflight response
		res.writeHead(200, {
			//
			...RESPONSE_HEADERS,
			"access-control-allow-origin": origin,
			"access-control-allow-headers": "Content-Type",
			"access-control-allow-methods": "POST",
			"ngrok-skip-browser-warning": "1",
		})
		res.end()
		return
	}
	handler(res)
		.then((data) => {
			res.writeHead(200, {...RESPONSE_HEADERS, "access-control-allow-origin": origin})
			res.end(JSON.stringify(data))
		})
		.catch((err) => {
			console.error("[ERROR]", err)
			res.writeHead(400, {...RESPONSE_HEADERS, "access-control-allow-origin": origin})
			res.end(JSON.stringify({error: "Error parsing your request."}))
		})
})

server.listen(8000)
console.log("hosting node.js HTTP server @", server.address())
