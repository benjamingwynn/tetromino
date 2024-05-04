<!-- @format -->
<script lang="ts">
	export let onAction: () => void

	export let delay: number = 200
	export let interval: number = 16.7 * 4
	let nextTick: number | undefined = undefined
	let nextDelay: number | undefined = undefined

	const touchStop = () => {
		if (nextDelay) clearTimeout(nextDelay)
		if (nextTick) clearTimeout(nextTick)
	}

	const tick = () => {
		onAction()
		nextTick = setTimeout(tick, interval)
	}
</script>

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
