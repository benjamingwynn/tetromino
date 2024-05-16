/** @format */

const classic = [
	[0, 0, 90], // (dead)
	[180, 90, 60], // I
	[60, 90, 60], // O
	[300, 90, 60], // T
	[240, 90, 60], // J
	[30, 90, 60], // L
	[120, 90, 60], // S
	[255, 90, 60], // Z
]

/** classic but mixed around */
const confusing1 = [
	[0, 0, 80], // (dead)
	[255, 90, 50], // I
	[180, 90, 50], // O
	[60, 90, 50], // T
	[300, 90, 50], // J
	[240, 90, 50], // L
	[30, 90, 50], // S
	[120, 90, 50], // Z
]

/** all shapes are blue-ish */
const blue = [
	[0, 0, 90], // (dead)
	[190, 90, 60], // I
	[225, 90, 60], // O
	[260, 85, 60], // T
	[240, 90, 60], // J
	[230, 90, 60], // L
	[220, 90, 60], // S
	[255, 70, 60], // Z
]

const blue2 = [
	[0, 0, 90], // (dead)
	[220, 91, 66], // I
	[225, 94, 70], // O
	[240, 87, 65], // T
	[245, 93, 55], // J
	[231, 86, 76], // L
	[220, 91, 42], // S
	[255, 70, 66], // Z
]

const green = [
	[0, 0, 90], // (dead)
	[118, 84, 66], // I
	[122, 85, 60], // O
	[124, 87, 65], // T
	[126, 81, 55], // J
	[128, 70, 76], // L
	[130, 88, 42], // S
	[131, 70, 66], // Z
]

/** all shapes are yellow-ish */
const yellow = [
	[60, 0, 90], // (dead)
	[60, 90, 60], // I
	[60, 90, 60], // O
	[60, 85, 60], // T
	[60, 90, 60], // J
	[60, 90, 60], // L
	[60, 90, 60], // S
	[60, 70, 60], // Z
]

const pink = [
	[300, 0, 90], // (dead)
	[310, 90, 60], // I
	[300, 90, 60], // O
	[310, 85, 60], // T
	[300, 90, 60], // J
	[310, 90, 60], // L
	[300, 90, 60], // S
	[310, 70, 60], // Z
]

const purple = [
	[285, 0, 90], // (dead)
	[275, 90, 60], // I
	[287, 90, 60], // O
	[276, 85, 60], // T
	[277, 91, 60], // J
	[288, 90, 63], // L
	[286, 90, 60], // S
	[281, 70, 61], // Z
]

const orange = [
	[30, 0, 90], // (dead)
	[40, 90, 60], // I
	[30, 90, 60], // O
	[40, 85, 60], // T
	[30, 90, 60], // J
	[40, 90, 60], // L
	[30, 90, 60], // S
	[40, 70, 60], // Z
]

/** all shapes are red-ish */
const red = [
	[0, 0, 90], // (dead)
	[15, 90, 60], // I
	[5, 90, 60], // O
	[10, 85, 60], // T
	[0, 90, 60], // J
	[15, 90, 60], // L
	[5, 90, 60], // S
	[10, 70, 60], // Z
]

const fire = [
	[30, 0, 90], // (dead)
	[19, 90, 60], // I
	[30, 90, 60], // O
	[40, 85, 60], // T
	[30, 90, 60], // J
	[17, 90, 60], // L
	[30, 90, 60], // S
	[11, 70, 60], // Z
]

const dark = [
	[30, 0, 90], // (dead)

	[255, 0, 50],
	[255, 0, 60],
	[255, 0, 70],
	[255, 0, 55],
	[255, 0, 66],
	[255, 0, 77],
	[255, 0, 88],
]

const lavender = [
	[30, 0, 90], // (dead)

	[255, 25, 90],
	[255, 25, 80],
	[255, 25, 70],
	[255, 25, 85],
	[255, 25, 76],
	[255, 25, 73],
	[255, 25, 81],
]

/** another version of classic mixed around */
const confusing2 = [
	[0, 0, 70], // (dead)
	[180, 90, 60], // I
	[240, 90, 60], // O
	[120, 90, 60], // T
	[60, 90, 60], // J
	[255, 90, 60], // L
	[300, 90, 60], // S
	[30, 90, 60], // Z
]

/** palettes to use throughout the game,
 * when we reach the end we'll loop back to the start
 */
export const palettes = [
	classic, // >0k
	pink, // >2k
	orange, // >4k
	purple, // >6k
	green, // >8k
	lavender, // >10k
	blue2, // >12k
	confusing1, // >14k
	blue, // >16k
	confusing2, // >18k
	red, // >20k
	fire, // >22k
	yellow, // >24k
	dark, // >26k
]