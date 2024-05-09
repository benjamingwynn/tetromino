/**
 * Provides drop-in `setInterval` and `clearInterval` replacements that are hooked to
 * requestAnimationFrame instead of actual JS timers.
 *
 * This should help prevent stutter on some phones(?), and prevents timers firing while
 * the tab is no longer in the foreground on Chrome android.
 *
 * @author Benjamin Gwynn <benjamin@benjamingwynn.com>
 *
 * @file
 * @format
 */

const openTimers: Record<number, {callback: () => void; interval: number; timeStarted: number; fireCount: number; skipCount: 0}> = {}
let lastHandlerId = 1

// NOTE: this is just a debug counter, we echo this onto the game's debug text and reset it back to 0. we won't be keeping this.
globalThis._totalSkippedFrameIntervals = 0

const frame = () => {
	const now = Date.now()
	for (const timer of Object.values(openTimers)) {
		const diff = now - timer.timeStarted
		const n = Math.floor(diff / timer.interval) - timer.fireCount - timer.skipCount
		if (n >= 15) {
			//   ^ what should this number be?
			timer.skipCount += n
			console.warn("skipping", n, "setInterval callbacks")
			globalThis._totalSkippedFrameIntervals += n
		} else if (n >= 1) {
			for (let i = 0; i < n; i++) {
				timer.callback()
				timer.fireCount++
			}
		}
	}
	requestAnimationFrame(frame)
}

export function setInterval(callback: () => void, interval: number) {
	if (!globalThis.window) return globalThis.setInterval(callback, interval)
	requestAnimationFrame(frame)

	const n = lastHandlerId++
	openTimers[n] = {callback, interval, timeStarted: Date.now(), fireCount: 0, skipCount: 0}
	return n as unknown as ReturnType<typeof globalThis.setInterval>
}

export function clearInterval(handlerId: number) {
	if (!globalThis.window) return globalThis.clearInterval(handlerId)
	if (handlerId === undefined) return
	if (!(handlerId in openTimers)) console.warn(handlerId, "not in", openTimers)
	delete openTimers[handlerId]
}

// @ts-expect-error export to window for debugging
if (globalThis.window) window._frameIntervalOpenTimers = openTimers
