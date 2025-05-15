/** @format */

/** fires the callback if the application was in a visually suspended state (off-screen/tabbed out) for at least the number of ms provided. callback fires when user comes back to the app. */
export function afterSuspend(maxSuspendTime: number, callback: () => void) {
	let lastFrameTime: number = performance.now()
	let nextFrame: number = requestAnimationFrame(frame)
	function frame() {
		const diff = performance.now() - lastFrameTime
		if (diff > maxSuspendTime) {
			callback()
		}
		lastFrameTime = performance.now()
		nextFrame = requestAnimationFrame(frame)
	}

	const disposer = () => {
		cancelAnimationFrame(nextFrame)
	}

	return disposer
}
