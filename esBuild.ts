/** @format */

import esbuild from "esbuild"
import * as fsp from "node:fs/promises"
import {makeBuildOptions} from "./esOpts.ts"

const buildOptions = makeBuildOptions(false)

await fsp.rm(buildOptions.outdir, {recursive: true, force: true})
const ctx = await esbuild.build(buildOptions)

console.log(ctx)
