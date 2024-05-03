/** @format */

import esbuild from "esbuild"
import * as fsp from "node:fs/promises"
import {buildOptions} from "./esOpts.ts"

await fsp.rm(buildOptions.outdir, {recursive: true, force: true})
const ctx = await esbuild.build({
	...buildOptions,
	outdir: buildOptions.outdir,
	sourcemap: false,
	minify: true,
})

console.log(ctx)
