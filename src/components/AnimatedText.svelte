<!-- @format -->
<script lang="ts">
	import {onMount} from "svelte"

	export let text: string
	export let duration: number = 600
	export let loop = false

	let start: number
	let string: string
	let nextFrame: undefined | number = undefined

	$: {
		text
		start = performance.now()
		string = ""

		nextFrame = requestAnimationFrame(frame)
	}

	const frame = (now: number) => {
		const willEndAt = start + duration
		const delta = Math.min(1, (now - start) / (willEndAt - start))
		const len = Math.floor(delta * (text.length + 1))
		const txt = text.substring(0, len)
		string = txt
		if (delta < 1) {
			nextFrame = requestAnimationFrame(frame)
		} else if (loop) {
			start = performance.now()
			nextFrame = requestAnimationFrame(frame)
		}
	}

	onMount(() => {
		start = performance.now()
		nextFrame = requestAnimationFrame(frame)
		return () => {
			if (nextFrame) {
				cancelAnimationFrame(nextFrame)
			}
		}
	})
</script>

{string}
