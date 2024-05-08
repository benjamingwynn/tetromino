/** @format */
import App from "./App.svelte"

if (DEV) {
	console.warn("This is a development build of the game.")
	window.onload = () => {
		new EventSource("/esbuild").addEventListener("change", () => location.reload())
		console.warn("Live reload enabled.")
	}
}

new App({target: document.body})
