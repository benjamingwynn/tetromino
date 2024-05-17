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

/**
 * If we need to catch up this many ticks, do nothing instead.
 * This prevents the game from running when the tab is inactive.
 */
const MAX_MISSED_TICKS = 15

const frame = () => {
	const now = Date.now()
	for (const timer of Object.values(openTimers)) {
		const diff = now - timer.timeStarted
		const n = Math.floor(diff / timer.interval) - timer.fireCount - timer.skipCount
		if (n >= MAX_MISSED_TICKS) {
			timer.skipCount += n
			console.warn("skipping", n, "setInterval callbacks")
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
	return n
}

export function clearInterval(handlerId: number) {
	if (!globalThis.window) return globalThis.clearInterval(handlerId)
	if (handlerId === undefined) return
	if (!(handlerId in openTimers)) console.warn(handlerId, "not in", openTimers)
	delete openTimers[handlerId]
}

// @ts-expect-error export to window for debugging
if (globalThis.window) window._frameIntervalOpenTimers = openTimers
