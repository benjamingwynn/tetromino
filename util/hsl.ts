/** @format */

const hslCache = new WeakMap<number[], string>()
/** formats the `[h,s,l]` array into a valid `hsl()` string for use in CSS/Canvas */
export function hsl(array: number[]) {
	const cached = hslCache.get(array)
	if (cached) {
		return cached
	}
	const rtn = `hsl(${array.map((x, i) => (i > 0 ? x + "%" : x)).join(" ")})`
	hslCache.set(array, rtn)
	return rtn
}
