/** @format */

import esbuild from "esbuild"
import * as fsp from "node:fs/promises"
import {buildOptions} from "./esOpts.ts"

// HACK: wait arbitrary amount of time, if node.js ran with `--watch` since the last port still may be bound to the going down process
await new Promise<void>((resolve) => setTimeout(resolve, 1000))

const outdir = ".esdev"
await fsp.rm(outdir, {recursive: true, force: true})
const ctx = await esbuild.context({
	...buildOptions,
	outdir,
	sourcemap: true,
	define: {DEV: "true"},
})

ctx.watch()

const server = await ctx.serve({port: 1234, fallback: "/index.html", servedir: outdir})
console.log(`watching & listening at http://${server.host}:${server.port}`)
// console.log("(end)")
