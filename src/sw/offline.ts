/**
 * Loosely based on https://github.com/mdn/serviceworker-cookbook/blob/master/strategy-network-or-cache/service-worker.js
 *
 * @format
 * @file
 */

/** this is a worker, declare `self` as such */
declare const self: ServiceWorkerGlobalScope

/** a list of our built assets for our app, provided by esbuild */
declare const BUILT_ASSETS: string[]

const cacheName = "offline-app-cache"

const log = (...msg: any[]) => globalThis.console.log("[sw-offline]", ...msg)

const addResourcesToCache = async (resources: string[]) => {
	log("adding", resources.length, "items to cache")
	const cache = await caches.open(cacheName)
	await cache.addAll(resources)
}

async function install() {
	log("installing service worker...")
	log("deleting cache...")
	await caches.delete(cacheName)
	log("cache deleted, adding new assets to cache")
	await addResourcesToCache(BUILT_ASSETS)
	log("finished installing service worker")
}

self.addEventListener("install", function (evt) {
	evt.waitUntil(install())
})

self.addEventListener("fetch", function (evt) {
	evt.respondWith(
		fromNetwork(evt.request).catch(function () {
			return fromCache(evt.request)
		})
	)
})

async function fromNetwork(request: Request) {
	return await fetch(request)
}

function fromCache(request: Request) {
	return caches.open(cacheName).then(function (cache) {
		return cache.match(request).then(function (matching) {
			return matching ?? Promise.reject("no-match")
		})
	})
}
