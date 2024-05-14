/** @format */
import App from "./App.svelte"

if (DEV) {
	console.warn("This is a development build of the game.")
	window.onload = () => {
		new EventSource("/esbuild").addEventListener("change", () => location.reload())
		console.warn("Live reload enabled.")
	}
} else {
	console.log("This is the production build of the game.")
	console.log("Source code is freely available at: https://github.com/benjamingwynn/tetromino")
}

new App({target: document.body})
