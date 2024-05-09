/** @format */

import esbuild from "esbuild"
import * as fsp from "node:fs/promises"
import {makeBuildOptions} from "./esOpts.ts"

const buildOptions = makeBuildOptions(true)

// HACK: wait arbitrary amount of time, if node.js ran with `--watch` since the last port still may be bound to the going down process
await new Promise<void>((resolve) => setTimeout(resolve, 1000))

const outdir = buildOptions.outdir
await fsp.rm(outdir, {recursive: true, force: true})
const ctx = await esbuild.context(buildOptions)

ctx.watch()

const server = await ctx.serve({port: 1234, fallback: "/index.html", servedir: outdir})
console.log(`watching & listening at http://${server.host}:${server.port}`)
// console.log("(end)")
