/**
 * This file is built by `esBuild.ts` to register service workers
 *
 * @format
 * @file
 */

/** service workers that were built, esbuild injects this array */
declare const SERVICE_WORKERS: string[]

export const registerSW = async () => {
	console.log("WORKERS:", SERVICE_WORKERS)

	console.log("Unregistering all service workers...")
	const registrations = await navigator.serviceWorker.getRegistrations()
	const alreadyHave: string[] = []
	for (const registration of registrations) {
		if (!registration.active) continue
		const p = new URL(registration.active.scriptURL).pathname
		if (SERVICE_WORKERS.includes(p)) {
			console.warn("skipping re-registration of:", p)
			alreadyHave.push(p)
			continue
		}
		console.log("Unregistering:", p, "...")
		try {
			const ok = await registration.unregister()
			if (!ok) throw new Error("unregister() was unsuccessful")
			console.log("Unregistered:", p)
		} catch (err) {
			console.error("failed to unregister worker", err)
		}
	}
	console.log("Finished unregistering any out-of-date service workers.")

	console.log("Registering new service workers...")
	for (const p of SERVICE_WORKERS) {
		if (alreadyHave.includes(p)) continue
		console.log("Registering:", p)
		try {
			await navigator.serviceWorker.register(p, {scope: "/"})
			console.log("registered", p, "successfully")
		} catch (err) {
			console.error("failed to register worker", err)
		}
	}

	console.log("Service workers are now up to date!")
}

registerSW()
