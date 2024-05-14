/** @format */

type ANSIColor = "black" | "red" | "green" | "blue" | "yellow" | "magenta" | "cyan" | "white"
type ANSIFormat = "bold" | "underline" | "inverted"
const styles = {
	fg: {
		black: "\x1b[30m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m",
		white: "\x1b[37m",
		grey: "\x1b[40m",
	},
	bg: {
		black: "\x1b[40m",
		red: "\x1b[41m",
		green: "\x1b[42m",
		yellow: "\x1b[43m",
		blue: "\x1b[44m",
		magenta: "\x1b[45m",
		cyan: "\x1b[46m",
		white: "\x1b[47m",
	},
	format: {
		bold: "\x1b[1m",
		underline: "\x1b[4m",
		inverted: "\x1b[7m",
	},
}

export function ansi(message: string, foregroundColor: ANSIColor = "white", backgroundColor?: ANSIColor, format: ANSIFormat[] = []) {
	// Reset formatting at the end
	const reset = "\x1b[0m"

	let formattedMessage = message
	// Apply formatting styles
	for (const style of format) {
		if (styles.format[style]) {
			formattedMessage = `${styles.format[style]}${formattedMessage}`
		}
	}

	return `${styles.fg[foregroundColor]}${backgroundColor ? styles.bg[backgroundColor] : ""}${formattedMessage}${reset}`
}
