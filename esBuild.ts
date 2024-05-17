/** @format */

import path from "node:path"
import esbuild from "esbuild"
import * as fsp from "node:fs/promises"
import {makeBuildOptions} from "./esOpts.ts"
import {stage} from "util/stage.ts"

// 0. cleanup
await stage("Cleanup environment", () => cleanup())
// 1. build the main program from the html
const builtAssets = await stage("Build main program", () => buildMainProgram())
// 2. build the service workers that can refer to assets built from the main program
const serviceWorkers = await stage("Build service workers", () => buildServiceWorkers(builtAssets))
// 3. build the service worker registering program that can refer to the service workers built
const toInject = await stage("Build service worker registrar", () => buildServiceWorkerRegistrar(serviceWorkers))
// 4. inject the sw reg program into the output main html
await stage("Add service worker registrar to HTML", () => injectScriptIntoDistHtml(toInject))
// 5. esbuild-plugin-html unfortunately does not understand the social media meta tags, so copy over assets we need for them
await stage("Copy meta assets", () => copyMeta())

async function cleanup() {
	const buildOptions = makeBuildOptions(false)
	await fsp.rm(buildOptions.outdir, {recursive: true, force: true})
}

async function buildServiceWorkerRegistrar(SERVICE_WORKERS: string[]) {
	const opts = makeBuildOptions(false, {
		define: {
			SERVICE_WORKERS: JSON.stringify(SERVICE_WORKERS),
		},
	})
	opts.entryPoints = ["./esServiceRegistrar.ts"]
	const out = opts.outdir
	opts.entryNames = "reg/[name]-[hash]"
	const ctx = await esbuild.build(opts)
	return Object.keys(ctx.metafile?.outputs ?? []).map((x) => "/" + path.relative(out, x))
}

async function injectScriptIntoDistHtml(scripts: string[]) {
	const p = "./dist/index.html"
	const outHTML = await fsp.readFile(p)
	// (remove leading slash for HTML script src to match others from esbuild-plugin-html)
	const src = scripts.map((url) => `<script src="${url.substring(1)}" type="application/javascript"></script>`)
	await fsp.writeFile(p, outHTML.toString().replace("</body></html>", src + "</body></html>"))
}

// build service workers
async function buildServiceWorkers(BUILT_ASSETS: string[]) {
	const swBuildOptions = makeBuildOptions(false, {
		define: {
			BUILT_ASSETS: JSON.stringify(
				// replace `/index.html` with `/`
				BUILT_ASSETS.map((asset) => (asset === "/index.html" ? "/" : asset))
			),
		},
	})
	swBuildOptions.entryPoints = ["./src/sw/*.ts"]
	const out = swBuildOptions.outdir
	swBuildOptions.entryNames = "sw-[name]-[hash]"

	const swCtx = await esbuild.build(swBuildOptions)

	return Object.keys(swCtx.metafile?.outputs ?? []).map((x) => "/" + path.relative(out, x))
}

async function buildMainProgram() {
	// build the main program
	const buildOptions = makeBuildOptions(false)

	const ctx = await esbuild.build({
		...buildOptions,
	})

	return Object.keys(ctx.metafile?.outputs ?? []).map((x) => "/" + path.relative(buildOptions.outdir, x))
}

async function copyMeta() {
	await fsp.cp("src/meta", "dist/meta", {recursive: true})
	//
}
