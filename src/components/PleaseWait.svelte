<!-- @format -->
<script lang="ts">
	import AnimatedText from "./AnimatedText.svelte"

	export let text = "Please wait"
</script>
<h4><AnimatedText {text} /><AnimatedText text={"..."} duration={1000} loop={true} /></h4>
