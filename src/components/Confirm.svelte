<!-- @format -->
<script lang="ts">
	export let callback: (confirm: boolean) => void
	export let body: string
	export let heading = ""

	export let labelConfirm = "Confirm"
	export let labelCancel = "Cancel"
</script>

<div class="modal">
	<div class="inner">
		{#if heading}
			<h1>{heading}</h1>
		{/if}
		<h2>{body}</h2>

		<div class="bottom">
			<button class="cancel" type="button" on:click={() => callback(false)}>{labelCancel}</button>
			<button class="confirm" type="button" on:click={() => callback(true)}>{labelConfirm}</button>
		</div>
	</div>
</div>

<style lang="less">
	h2 {
		white-space: pre-line;
	}
	.modal {
		background: rgba(0, 0, 0, 0.7);
		position: fixed;
		top: 0;
		right: 0;
		left: 0;
		bottom: 0;
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 2;
	}

	.inner {
		background: rgba(0, 0, 0, 0.4);
		border: red double 1em;
		font-size: 1.3em;
		padding: 1em;
		min-width: ~"min(15em, 100vw)";
		max-width: 31em;
	}

	.bottom {
		display: flex;
		margin-top: 1em;
		justify-content: flex-end;
	}

	button {
		font: inherit;
		font-size: 1.5em;
		color: inherit;
		background: none;
		border: none;
		outline: none;
		appearance: none;
		padding: 0.5em;

		&:focus {
			color: yellow;
		}
	}
</style>
