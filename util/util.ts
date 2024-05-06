/** @format */

export const noop = () => undefined

export function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}
