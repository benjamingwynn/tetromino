/**
 * @format
 * @file
 */

export type TetrominoType = "I" | "O" | "T" | "J" | "L" | "S" | "Z"

/**
 * bitmaps for the game pieces
 */
export const tetrominoes: {
	I: number[][][]
	O: number[][][]
	T: number[][][]
	J: number[][][]
	L: number[][][]
	S: number[][][]
	Z: number[][][]
} = {
	I: [
		// A
		[
			[1], // |
			[1], // |
			[1], // |
			[1], // |
		],
		// B
		[
			// ----
			[1, 1, 1, 1],
		],
	],
	O: [
		// A
		[
			[1, 1],
			[1, 1],
		],
	],
	T: [
		// A
		[
			[1, 1, 1],
			[0, 1, 0],
		],
		// B
		[
			[1, 0],
			[1, 1],
			[1, 0],
		],
		// C
		[
			[0, 1, 0],
			[1, 1, 1],
		],
		// D
		[
			[0, 1],
			[1, 1],
			[0, 1],
		],
	],
	J: [
		// A
		[
			[0, 1],
			[0, 1],
			[1, 1],
		],
		// B
		[
			[1, 1, 1],
			[0, 0, 1],
		],
		// C
		[
			[1, 1],
			[1, 0],
			[1, 0],
		],
		// D
		[
			[1, 0, 0],
			[1, 1, 1],
		],
	],
	L: [
		// A
		[
			[1, 0],
			[1, 0],
			[1, 1],
		],
		// B
		[
			[1, 1, 1],
			[1, 0, 0],
		],
		// C
		[
			[1, 1],
			[0, 1],
			[0, 1],
		],
		// D
		[
			[0, 0, 1],
			[1, 1, 1],
		],
	],
	S: [
		// A
		[
			[0, 1, 1],
			[1, 1, 0],
		],
		// B
		[[1], [1, 1], [0, 1]],
	],
	Z: [
		// A
		[
			[1, 1, 0],
			[0, 1, 1],
		],
		// B
		[
			[0, 1],
			[1, 1],
			[1, 0],
		],
	],
}

/** Keys of available tetromino types, e.g. I, O, T, etc */
export const tetrominoKeys = Object.keys(tetrominoes)
/** Map of tetromino type to number of its index, e.g. O = 1. */
export const tetrominoIndices = Object.fromEntries(tetrominoKeys.map((i, x) => [i, x]))
