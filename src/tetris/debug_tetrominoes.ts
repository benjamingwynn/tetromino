/**
 * swap this in for the tetromino.ts import to make the game significantly easier (for debugging)
 *
 * @format
 * @file
 */

export type TetrominoType = "O"

/**
 * bitmaps for the game pieces
 */
export const tetrominoes: {
	O: number[][][]
} = {
	O: [
		// A
		[
			[1, 1],
			[1, 1],
		],
		[[1]],
		[[1], [1], [1], [1], [1]],
		[
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
	],
}

/** Keys of available tetromino types, e.g. I, O, T, etc */
export const tetrominoKeys = Object.keys(tetrominoes)
/** Map of tetromino type to number of its index, e.g. O = 1. */
export const tetrominoIndices = Object.fromEntries(tetrominoKeys.map((i, x) => [i, x]))
