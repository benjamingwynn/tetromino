/** @format */

const hslCache = new WeakMap<number[], string>()
/** formats the `[h,s,l]` array into a valid `hsl()` string for use in CSS/Canvas */
export function hsl(stuff: number[]) {
	const cached = hslCache.get(stuff)
	if (cached) {
		return cached
	}
	const rtn = `hsl(${stuff.map((x, i) => (i > 0 ? x + "%" : x)).join(" ")})`
	hslCache.set(stuff, rtn)
	return rtn
}
