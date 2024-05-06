<!-- @format -->
<script lang="ts">
	import {onMount} from "svelte"

	export let onAction: () => void

	export let delay: number = 200
	export let interval: number = 16.7 * 4
	let nextTick: ReturnType<typeof setTimeout> | undefined = undefined
	let nextDelay: ReturnType<typeof setTimeout> | undefined = undefined

	const touchStop = () => {
		if (nextDelay) clearTimeout(nextDelay)
		if (nextTick) clearTimeout(nextTick)
	}

	const tick = () => {
		onAction()
		nextTick = setTimeout(tick, interval)
	}

	onMount(() => {
		return () => {
			touchStop()
		}
	})
</script>

<svelte:window on:touchend={touchStop} on:touchcancel={touchStop} />
<svelte:document on:touchend={touchStop} on:touchcancel={touchStop} />

<button
	on:contextmenu|preventDefault
	type="button"
	tabindex="-1"
	on:touchend={touchStop}
	on:touchcancel={touchStop}
	on:touchstart|preventDefault={() => {
		onAction()
		nextDelay = setTimeout(() => {
			nextTick = setTimeout(tick, interval)
		}, delay)
	}}><slot /></button
>

<style lang="less">
	button {
		font: inherit;
		width: 100%;
		appearance: none;
		border: none;
		background: transparent;
		color: white;
		padding: 0 0.2em;
	}
</style>
