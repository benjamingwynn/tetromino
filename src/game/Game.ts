/** @format */

import {noop, sleep} from "util/util.ts"
import {hsl} from "util/hsl.ts"
import RandomNumberGenerator from "mersenne-twister"
import {tetrominoes, tetrominoIndices, tetrominoKeys, TetrominoType} from "./tetrominoes.ts"
import {setInterval, clearInterval} from "./frameSetInterval.ts"
import {generateSeed} from "./seed.ts"
// import {tetrominoes, tetrominoIndices, tetrominoKeys, TetrominoType} from "./debug_tetrominoes.ts"

type Tetromino = {
	type: TetrominoType
	/** left-most point to render at */
	xOrigin: number
	/** top-most point to render at */
	yOrigin: number
	/** rotation/alternate shape number */
	rot: number
}

type Playback = {
	nextFrame?: number
	log: GameLog
	max: number
	duration: number
	startTime: number
	timeSpentAnimating: number
	done: () => void
	reject: () => void
	lastPauseTime?: number
	timeSpentPaused: number
	/** if true, whether when this playback finishes it'll start again */
	loop: boolean
}

/**
 * 1: Spin
 * 2: Move Right
 * 3: Move Left
 * 4: Speed up
 */
type LoggedMove = 1 | 2 | 3 | 4

export type GameLog = Record<number, LoggedMove[]>

export const MAX_MOVES_PER_TICK = 4

export class Game {
	/**
	 * The number of rows in cells the game should take up, the height of the game.
	 * Please note that this should fit evenly into your canvas height, or you may encounter collision problems.
	 */
	private rows = 20
	/**
	 * The number of columns in cells the game should take up, the width of the game.
	 * Please note that this should fit evenly into your canvas width, or you may encounter collision problems.
	 */
	private columns = 10

	/**
	 * The width/height of cells in pixels.
	 * This is determined automatically based on the size of the `canvas`
	 */
	private cellRenderSize!: number

	/** The seed */
	public seed: number

	/**
	 * The grid of placed items.
	 * This is an array of arrays, an array of rows. Each row contains either a number pointing to the index of `this.colors`, or `undefined`/`null` if it's not to be drawn.
	 * **ATTENTION: this is stored bottom-to-top, this may be the opposite of what you're expecting!**
	 */
	public grid: number[][] = []

	/** array of [h,s,l] */
	private colors = [
		[0, 0, 90], // (dead)
		[180, 90, 60], // I
		[60, 90, 60], // O
		[300, 90, 60], // T
		[240, 90, 60], // J
		[30, 90, 60], // L
		[120, 90, 60], // S
		[255, 90, 60], // Z
	]

	/** the shape we're dropping, if any. if we don't have a shape we'll get one depending on `tickLostTetromino` and `giveTetrominoInterval` */
	private tetromino?: Tetromino

	/** optional audio context, if defined we can make sounds as long as `muteSounds` is `false`. */
	private audioCtx?: AudioContext

	/** If true, sounds will not be played via the `audioCtx` */
	public muteSounds = false

	/** this gain node prevents clipping and lowers the volume of game sounds */
	private oscillatorGainNode?: GainNode
	/** `setInterval` result for the next game tick */
	private tickInterval?: number
	/** when we expect the next tick to be (in ms) */
	private expectedNextTickTime?: number
	/** number of ms we're behind our expected next tick time */
	private tickMsBehind?: number
	private tickMsBehindMin?: number
	private tickMsBehindMax?: number

	/** If defined, the game will be drawn onto the canvas. */
	private canvas?: HTMLCanvasElement = undefined
	private ctx?: CanvasRenderingContext2D

	/** This holds the number of the requested animation frame for a redraw of the `canvas` */
	private nextFrame?: number

	/** If defined, whenever the next tetromino is   */
	private previewCanvas?: HTMLCanvasElement = undefined
	private previewCtx?: CanvasRenderingContext2D

	/** Hook onto updates for the GUI */
	public onUpdate: (data: {score: number; gameOver: boolean}) => void = noop

	/** This is the pseudo random number generator. It defines what tetromino comes next. When this is recreated with the same seed it'll produce the same sequence of numbers. */
	private randomGenerator: RandomNumberGenerator

	/** If defined then we are running the score animation. */
	private scoreAnimationPromise?: Promise<void>
	/** If defined then we are running the lose animation. */
	public loseAnimationPromise?: Promise<void>

	/** If defined then a playback is currently in progress */
	private playbackInProgress?: Playback

	/** wait this many ticks before restarting playback if looping */
	private playbackLoopGap = 1

	/** start `stepInterval` at this number. this is the number of ticks until dropping the players held tetromino by 1 space */
	private startStepInterval = 50
	/** current ticks/step to fire the step interval */
	private stepInterval = this.startStepInterval
	/** last tick that the step interval was fired */
	private lastStep = 0
	/** keep lowering the step interval until it reaches this number (ticks/step) */
	private minStepInterval = 6

	/**
	 * when the player hits this score, switch to the `endgameStepInterval`
	 * a good player will usually hit 10k in 10min, so this should make the game
	 * significantly harder after 20 min
	 */
	private endgameStartsAt = 20_000
	private endgameStepInterval = 3

	/** after this score, try to kill the player */
	private killScreenStartsAt = 100_000
	private killScreenStepInterval = 1

	/** give a tetromino to the player when we lost it this many ticks ago (or more)  */
	private giveTetrominoInterval = 13

	/** time we placed the last tetromino */
	private tickLostTetromino: number = 0
	/**
	 * how the score decreases the score
	 * effectively determines the length of the game until hitting the `minStepInterval`
	 *
	 * 125 = ~10 min
	 * 250 = ~20 min
	 */
	private easiness = 250
	/** if true, the game is paused. do not fire ticks and disallow player input */
	public paused = false
	/** if true, the game is over. When this changes `onUpdate` will fire. */
	private gameOver = false
	/** the current score. When this changes `onUpdate` will fire. */
	private score = 0

	/** [0: row number, 1: start time] */
	private animateRow?: [number, number]

	/** the base time for `animationDuration` */
	private animationDurationBase = 500
	/** how long the animation should be running for, this will be made smaller after scoring points in a row */
	private animationDuration = this.animationDurationBase
	/** the last x position of a dropped tetromino */
	private lastX = 0
	/** whether to draw debug information on the screen */
	private drawDebug = false
	/** the number of tetrominoes the player has been given */
	private giveCount = 0
	/** the moves the player has made this tick */
	private moveLog: LoggedMove[] = []
	/** the moves the player has made throughout the entire game */
	public gameLog: GameLog = {}

	/** whether to animate scoring and losing, which async blocks the game from ticking */
	private enableAsyncAnimations = false

	/** debug boxes to draw on th is frame (if `drawDebug` is true) */
	private debugBoxes: {stroke: string; x: number; y: number}[] = []

	/** The next tetromino to spawn when ready, when this is changed `previewCtx` will be updated (if it's available)  */
	private nextTetrominoType!: TetrominoType

	/** The number of ticks processed by the game. */
	private tickCounter = 0

	/** public getter for getting the number of ticks passed in the game. */
	public getTicks() {
		return this.tickCounter
	}

	/** public getter for getting the score of the game. */
	public getScore() {
		return this.score
	}

	constructor({
		canvas,
		onUpdate,
		previewCanvas,
		enableAudio,
		seed,
		disableAutomaticRendering,
	}: {
		canvas?: HTMLCanvasElement
		onUpdate?: (data: {score: number; gameOver: boolean}) => void
		previewCanvas?: HTMLCanvasElement
		enableAudio?: boolean
		seed?: number
		disableAutomaticRendering?: true
	}) {
		if (onUpdate) this.onUpdate = onUpdate

		if (canvas) {
			this.canvas = canvas
			const ctx = canvas.getContext("2d")
			if (!ctx) throw new Error("Canvas is not available on this platform.")
			ctx.imageSmoothingEnabled = false
			this.ctx = ctx
			if (!disableAutomaticRendering) {
				this.nextFrame = requestAnimationFrame(this.render)
			}
		}

		if (previewCanvas) {
			this.previewCanvas = previewCanvas
			const previewCtx = previewCanvas.getContext("2d")
			if (!previewCtx) throw new Error("Canvas is not available on this platform.")
			previewCtx.imageSmoothingEnabled = false
			this.previewCtx = previewCtx
		}

		this.seed = seed ?? generateSeed()
		this.randomGenerator = new RandomNumberGenerator(this.seed)

		// get the first tetromino type after we create the RNG
		this.nextTetrominoType = this.getNextTetrominoType()

		// setup audio
		if (enableAudio) {
			try {
				// @ts-expect-error allow falling back to vendor prefixed API
				const AudioContext = window.AudioContext ?? window["webkitAudioContext"]
				this.audioCtx = new AudioContext({
					sampleRate: 8_000, // nice and crunchy
				})
				this.oscillatorGainNode = this.audioCtx.createGain()
				this.oscillatorGainNode.gain.value = 0.2
				this.oscillatorGainNode.connect(this.audioCtx.destination)
			} catch {
				console.error("Sound is not available in this browser.")
			}
		}

		// setup the canvas+context and rendering
		if (this.canvas) {
			this.layout()
			setTimeout(() => {
				requestAnimationFrame(() => {
					// HACK: when in development CSS can load late, use this to fix
					this.layout()
				})
			}, 15)
		}
	}

	public getAndSetNewSeed() {
		this.seed = generateSeed()
	}

	/** Start the game regularly. Sets up the tick to happen at a human-playable speed */
	public play() {
		this.paused = false
		this.enableAsyncAnimations = true

		this.tickInterval = setInterval(() => {
			const now = Date.now()
			if (this.expectedNextTickTime) {
				const msBehind = now - this.expectedNextTickTime

				this.tickMsBehind = msBehind
				this.tickMsBehindMax = Math.max(this.tickMsBehindMax ?? 0, msBehind)
				this.tickMsBehindMin = Math.min(this.tickMsBehindMin ?? Infinity, msBehind)
			}
			this.tick()
			this.expectedNextTickTime = now + 20
		}, 20)
	}

	/** resets *this* game, reusing the same seed and starting the game from the beginning. Note that this doesn't recreate a new game, to do that we construct a new Game() with a new seed instead. */
	private reset() {
		if (this.loseAnimationPromise || this.scoreAnimationPromise) {
			console.warn("Running an animation while asked to reset!")
		}
		if (this.tickInterval) {
			console.warn("reset() stopped running tickInterval")
			clearInterval(this.tickInterval)
			this.expectedNextTickTime = undefined
			this.tickMsBehind = undefined
			this.tickMsBehindMax = undefined
			this.tickMsBehindMin = undefined
			this.tickInterval = undefined
		}
		this.tetromino = undefined
		// recreate the RNG
		this.randomGenerator = new RandomNumberGenerator(this.seed)
		this.tickCounter = 0
		this.grid = []
		this.gameLog = []
		this.moveLog = []
		this.giveCount = 0
		this.paused = false
		this.gameOver = false
		this.stepInterval = this.startStepInterval
		this.tickLostTetromino = 0
		this.lastX = 0
		this.lastStep = 0
		this.score = 0
		this.scoreAnimationPromise = undefined
		this.loseAnimationPromise = undefined
		this.nextTetrominoType = this.getNextTetrominoType()
		// reset playback if applicable
		if (this.playbackInProgress) {
			this.playbackInProgress.startTime = Date.now()
			this.playbackInProgress.timeSpentAnimating = 0
			this.playbackInProgress.timeSpentPaused = 0
		}
		this.onUpdate({score: 0, gameOver: false})
	}

	private playbackFrame = () => {
		// if (!playback) return
		;(async () => {
			// TODO: FIXME: Some of the timings here are incorrect. When the game is played/paused or when animating this math is incorrect.

			// playback.nextFrame = undefined
			const playback = this.playbackInProgress
			if (!playback) throw new Error("wtf")
			const {duration, max, log, timeSpentAnimating, timeSpentPaused} = playback
			const startTime = playback.startTime + timeSpentPaused
			const willEndAt = startTime + duration + timeSpentAnimating + timeSpentPaused
			const now = Date.now()
			const delta = Math.min(1, (now - startTime) / (willEndAt - startTime))
			const ticksBehind = Math.ceil(delta * max - this.tickCounter)
			// console.log(timeSpentPaused, delta, ticksBehind)

			if (this.paused) {
				if (playback.lastPauseTime) {
					playback.timeSpentPaused += now - playback.lastPauseTime
				}
				playback.lastPauseTime = now
				playback.nextFrame = requestAnimationFrame(this.playbackFrame)
				return
			} else if (playback.lastPauseTime) {
				playback.lastPauseTime = undefined
			}

			if (!log) throw new Error("wtf")
			if (ticksBehind > 0) {
				// console.log("replaying", ticksBehind, "ticks")
				for (let i = 0; i < ticksBehind; i++) {
					this.replayNextTick(log)

					// wait for animations to finish
					if (this.scoreAnimationPromise) {
						const t = Date.now()
						await this.scoreAnimationPromise
						const t2 = Date.now()
						if (this.playbackInProgress) this.playbackInProgress.timeSpentAnimating += t2 - t
					}

					if (this.loseAnimationPromise) {
						const t = Date.now()
						await this.loseAnimationPromise
						const t2 = Date.now()
						if (this.playbackInProgress) this.playbackInProgress.timeSpentAnimating += t2 - t
						console.log("LOSE ANIMATION IN PROGRESS")
					}
				}
			}
			// queue a new frame
			{
				const playback = this.playbackInProgress
				if (!playback) {
					console.error("playback gone after animation, bailing")
					return // playback can be disappeared between animation and start of frame
				}
				if (this.tickCounter === playback.max || this.gameOver) {
					if (playback.loop) {
						if (now > willEndAt + this.playbackLoopGap) {
							console.log("*** playback loop end ***", {tickMaxed: this.tickCounter === playback.max, gameOver: this.gameOver})
							this.reset()
						}
						playback.nextFrame = requestAnimationFrame(this.playbackFrame)
					} else {
						console.log("*** playback finished ***", {gameOver: this.gameOver})
						playback.done()
					}
				} else {
					playback.nextFrame = requestAnimationFrame(this.playbackFrame)
				}
			}
		})() /*.catch(console.error)*/
	}

	/**
	 * visually plays the game back in the duration specified
	 */
	public playback(log: GameLog, max: number, duration: number, loop: boolean, animationTime = 300) {
		console.log("*** playback started ***")

		this.enableAsyncAnimations = true
		this.muteSounds = true

		const startPlayback = () =>
			new Promise<void>((resolve, reject) => {
				if (this.playbackInProgress) throw new Error("Already replaying.")
				this.animationDurationBase = animationTime
				this.playbackInProgress = {
					log,
					max,
					duration,
					startTime: Date.now(),
					nextFrame: requestAnimationFrame(this.playbackFrame),
					timeSpentAnimating: 0,
					timeSpentPaused: 0,
					done: () => {
						// onDone()
						resolve()
					},
					reject: () => reject(new Error("playback bailed early")),
					loop,
				}
				this.reset()
			})

		return startPlayback().finally(() => {
			delete this.playbackInProgress
		})
	}

	public replayNextTick(log: GameLog) {
		const actions = log[this.tickCounter]
		if (actions) {
			if (actions.length > MAX_MOVES_PER_TICK) {
				throw new Error("More moves this tick than the maximum allowed.")
			}
			for (const action of actions) {
				// c++
				switch (action) {
					case 1: {
						this.playerRotate()
						continue
					}
					case 2: {
						this.playerMoveRight()
						continue
					}
					case 3: {
						this.playerMoveLeft()
						continue
					}
					case 4: {
						this.playerSpeedUp()
						continue
					}
					default:
						throw new Error("Unknown action provided.")
				}
			}
		}
		this.tick()
	}

	/**
	 * Simulates the game with the GameLog provided.
	 * Returns `true` if terminate with game over, `false` if terminated early.
	 */
	public simulate(log: GameLog, max: number): boolean {
		const t = performance.now()
		// this.enableAsyncAnimatedScoring = false
		let n = 0
		let c = 0
		while (!this.gameOver) {
			if (n > max) {
				// console.warn("WARNING: hit maximum during replay before gameOver, bailing!")
				return false
			}
			n++
			if (log[this.tickCounter]) c += log[this.tickCounter].length
			this.replayNextTick(log)
		}
		const timeTaken = performance.now() - t
		console.log(
			"Replayed",
			c,
			"moves over",
			this.tickCounter,
			"ticks in",
			timeTaken,
			"ms",
			`(${Math.floor(this.tickCounter / (timeTaken / 1000))} ticks/sec)`
		)
		return true
	}

	public soundBeep(note = 0, msDelay: number = 0, msDuration: number = 100, pitch = 0) {
		if (this.muteSounds) return
		try {
			const audioCtx = this.audioCtx
			if (!audioCtx || !this.oscillatorGainNode) throw "audio not available"

			const oscillator = audioCtx.createOscillator()
			oscillator.type = "square"
			oscillator.frequency.value = 220 + note * 32 + pitch * 16

			this.oscillatorGainNode.connect(audioCtx.destination)

			oscillator.connect(this.oscillatorGainNode)
			oscillator.start(audioCtx.currentTime + msDelay / 1000)
			oscillator.stop(audioCtx.currentTime + msDelay / 1000 + msDuration / 1000)
		} catch {
			// (ignore sound errors)
		}
	}

	private layout() {
		if (!this.canvas) throw new Error("layout() fired without this.canvas available.")
		this.cellRenderSize = Math.min(this.canvas.width, this.canvas.height) / this.columns
	}

	private drawCell(x: number, y: number, colorIndex: number) {
		if (!this.ctx) throw new Error("drawCell() fired without this.ctx available.")

		let [h, s, l] = this.colors[colorIndex]
		if (this.animateRow && this.animateRow[0] === y) {
			//
			// draw an animating cell
			//
			// float between 0-1 representing how far through the animation we are
			const animationPosition = (Date.now() - this.animateRow[1]) / this.animationDuration

			const trail = 3
			const brighten = 32
			l = animationPosition > x / (this.columns + 1 + trail) ? Math.min(100, l + brighten) : l
			if (animationPosition > (x + trail) / (this.columns + 1 + trail)) {
				l = 0
			}
		}
		this.ctx.fillStyle = hsl([h, s, l])

		const size = this.cellRenderSize
		this.ctx.fillRect((x + 0) * size, y * size, size, size)

		if (size >= 5) {
			this.ctx.strokeStyle = hsl([h, s + 20, l - 20])
			this.ctx.lineWidth = size / 5
			this.ctx.strokeRect((x + 0) * size + 2, y * size + 2, size - 4, size - 4)
		}
	}

	private compressGameLog() {
		const entries = Object.entries(this.gameLog)
		const filtered = entries.filter(([key, val]) => val.length)
		this.gameLog = Object.fromEntries(filtered)
		// console.log("game log compression removed entries:", entries.length - filtered.length)
	}

	/** fires whenever the shape/tetromino you're holding should move downwards, determined by `stepInterval` */
	private step = () => {
		// get the falling shape, if we have one
		const tetromino = this.tetromino
		if (!tetromino) {
			return
		}
		const {type, xOrigin, yOrigin, rot} = tetromino

		const onCollision = () => {
			const bitmap = tetrominoes[type][rot]
			// that's a collision, add this to the grid
			this.lastX = tetromino.xOrigin
			this.tetromino = undefined
			this.tickLostTetromino = this.tickCounter // <- this will cause us to get a new tetromino from the queue

			this.soundBeep(yOrigin, 0, 50)

			// fill in the grid with the bitmap of the tetromino, remember the grid is stored bottom-to-top
			for (let bY = 0; bY < bitmap.length; bY++) {
				const row = bitmap[bY]
				for (let bX = 0; bX < row.length; bX++) {
					const fill = row[bX]
					if (fill) {
						const placeX = bX + xOrigin
						const placeY = this.rows - (yOrigin + bY) - 1
						if (!this.grid[placeY]) this.grid[placeY] = []
						const color = tetrominoIndices[type] + 1
						this.grid[placeY][placeX] = color
					}
				}
			}

			// the lose condition:
			if (this.grid.length > this.rows) {
				this.playerLose()
				return
			}

			// score points:
			const SCORE_BASE = 100
			const SCORE_MULTIPLIER = 0.5 // + 50% for every line in-a-row
			if (this.enableAsyncAnimations) {
				this.scoreAnimationPromise = (async () => {
					let multiplier = 1
					let count = 0
					for (let i = 0; i < this.grid.length; i++) {
						if (this.grid[i].filter((x) => x).length === this.columns) {
							this.animateRow = [this.rows - i - 1, Date.now()]

							this.animationDuration = Math.max(24, this.animationDurationBase / multiplier)

							// make the sounds for this row
							const soundLength = this.animationDuration / this.columns
							for (let x = 0; x < this.columns; x++) {
								this.soundBeep(x, soundLength * x, soundLength, count)
							}

							// wait a little while
							await sleep(this.animationDuration)
							if (!this.scoreAnimationPromise) return

							this.animateRow = undefined
							this.grid.splice(i, 1)
							i-- // <- because we splice from the array we're searching, we need to fix the search index
							count++
							this.score += SCORE_BASE * multiplier
							multiplier += SCORE_MULTIPLIER

							this.onUpdate({score: this.score, gameOver: this.gameOver})
						}
					}
				})().finally(() => {
					this.scoreAnimationPromise = undefined
				})
			} else {
				let multiplier = 1
				let count = 0
				for (let i = 0; i < this.grid.length; i++) {
					if (this.grid[i].filter((x) => x).length === this.columns) {
						this.grid.splice(i, 1)
						i-- // <- because we splice from the array we're searching, we need to fix the search index
						count++
						this.score += SCORE_BASE * multiplier
						multiplier += SCORE_MULTIPLIER
						this.onUpdate({score: this.score, gameOver: this.gameOver})
					}
				}
			}
		}

		// see if we're in range of the grid
		if (this.wouldTetrominoCollide(xOrigin + 0, yOrigin + 1, rot)) {
			// if we're gonna hit a shape, add this to the grid
			onCollision()
		} else {
			// move down by 1
			tetromino.yOrigin += 1
		}
	}

	/** returns 1 for collide with grid, 2 for collide with floor */
	private wouldTetrominoCollide = (x: number, y: number, rot: number) => {
		const tetromino = this.tetromino
		if (tetromino) {
			// see if we're in range of the grid
			const {type} = tetromino
			const bitmap = tetrominoes[type][rot]

			for (let i = 0; i < bitmap.length; i++) {
				const row = bitmap[i]
				for (let j = 0; j < row.length; j++) {
					if (row[j]) {
						// ^ if shape filled
						const partX = j + x
						const partY = i + y

						if (this.drawDebug) this.debugBoxes.push({stroke: "red", x: partX, y: partY})
						if (partY === this.rows) {
							if (this.drawDebug) this.debugBoxes.push({stroke: "limegreen", x: partX, y: partY - 1})
							return 2
						}
						for (let i2 = 0; i2 < this.grid.length; i2++) {
							const row = this.grid[i2]
							if (row) {
								const gridY = this.rows - i2 - 1
								for (let gridX = 0; gridX < row.length; gridX++) {
									const gridFill = row[gridX]
									if (gridFill) {
										if (partX === gridX && partY === gridY) {
											if (this.drawDebug) this.debugBoxes.push({stroke: "limegreen", x: partX, y: partY})
											return 1
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	private getNextTetrominoType() {
		const random = () => this.randomGenerator.random()
		return tetrominoKeys[Math.floor(random() * tetrominoKeys.length)] as TetrominoType
	}

	public tick = () => {
		if (this.paused) {
			return
		}
		if (this.animateRow) {
			// disable game updates while animation running
			return
		}

		if (this.gameOver) {
			return
		}

		if (this.tickCounter % 100 === 0) {
			this.compressGameLog()
		}

		this.tickCounter++
		this.moveLog = []
		this.gameLog[this.tickCounter] = this.moveLog

		// give tetromino if we don't have one
		if (!this.tetromino && this.tickCounter >= this.tickLostTetromino + this.giveTetrominoInterval) {
			// const shape = "O"
			const shape = this.nextTetrominoType
			this.nextTetrominoType = this.getNextTetrominoType()

			// draw the preview for the next shape
			if (this.previewCtx && this.previewCanvas) {
				this.previewCanvas.width = this.previewCanvas.width

				const [type, , , rot] = [this.nextTetrominoType, 0, 0, 0]
				const color = tetrominoIndices[type] + 1
				const bitmap = tetrominoes[type][rot]
				for (let i = 0; i < bitmap.length; i++) {
					const row = bitmap[i]
					for (let j = 0; j < row.length; j++) {
						const filled = row[j]
						if (filled) {
							let [h, s, l] = this.colors[color]
							this.previewCtx.fillStyle = hsl([h, s, l])

							const size = this.cellRenderSize
							this.previewCtx.fillRect(j * size, i * size, size, size)

							this.previewCtx.strokeStyle = hsl([h, s + 20, l - 20])
							this.previewCtx.lineWidth = 1
							this.previewCtx.strokeRect((j + 0) * size + 2, i * size + 2, size - 4, size - 4)
						}
					}
				}
			}

			const tetromino: Tetromino = {type: shape, xOrigin: this.lastX, yOrigin: -tetrominoes[shape][0].length - 0, rot: 0}

			// the spawned tetromino can technically be outside the right of the game, fix that
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino.xOrigin > maxX) tetromino.xOrigin = maxX
			this.tetromino = tetromino
			this.giveCount++

			// **speed up the game**
			if (this.giveCount % 5 === 0) {
				if (this.score >= this.killScreenStartsAt) {
					this.stepInterval = this.killScreenStepInterval
				} else if (this.score >= this.endgameStartsAt) {
					this.stepInterval = this.endgameStepInterval
				} else {
					const s = Math.floor(this.startStepInterval - this.score / this.easiness)
					this.stepInterval = Math.max(this.minStepInterval, s)
				}
			}
		}
		if (this.tickCounter >= this.lastStep + this.stepInterval) {
			this.step()
			this.lastStep = this.tickCounter
		}
	}

	/** renders a single frame */
	public renderFrame = () => {
		if (!this.canvas) throw new Error("render() fired without this.canvas available.")
		if (!this.ctx) throw new Error("render() fired without this.ctx available.")

		this.nextFrame = undefined
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		// draw the grid
		for (let i = 0; i < this.grid.length; i++) {
			const row = this.grid[i]
			if (row) {
				const y = this.rows - i - 1
				for (let j = 0; j < row.length; j++) {
					const col = row[j]
					const x = j

					if (col !== undefined && col !== null) {
						this.drawCell(x, y, col)
					}
				}
			}
		}

		// draw the tetromino
		const tetromino = this.tetromino

		const debug: string[] = [
			// this.paused ? `PAUSED` : `Running`,
			// this.gameOver ? "GAME OVER" : "Game in progress",
			"Seed: " + this.seed,
			"Step: " + this.stepInterval + " Given: " + this.giveCount,
			this.muteSounds ? "MUTE" : this.audioCtx ? "SOUND ON" : "SND N/A",
			"Tick #: " + this.tickCounter,
			// "BLOCK: " + (this.paused || this.animateRow || this.gameOver || this.moveLog.length >= MAX_MOVES_PER_TICK),
			"Behind: " + this.tickMsBehind,
			" Max: " + this.tickMsBehindMax,
			" Min: " + this.tickMsBehindMin,
			"Drawn: " + Date.now(),
			this.animateRow?.join(",") ?? "-",
		]
		if (tetromino) {
			const {type, xOrigin, yOrigin, rot} = tetromino
			// const color = tetromino_COLORS[type]
			const color = tetrominoIndices[type] + 1
			const bitmap = tetrominoes[type][rot]
			for (let i = 0; i < bitmap.length; i++) {
				const row = bitmap[i]
				for (let j = 0; j < row.length; j++) {
					const filled = row[j]
					if (filled) {
						this.drawCell(xOrigin + j, yOrigin + i, color)
					}
				}
			}
			debug.push(`tetromino=${Object.values(tetromino)}`)
		}

		// draw debug boxes
		if (this.drawDebug) {
			for (const box of this.debugBoxes) {
				this.ctx.lineWidth = 4
				this.ctx.strokeStyle = box.stroke
				this.ctx.strokeRect(box.x * this.cellRenderSize, box.y * this.cellRenderSize, this.cellRenderSize, this.cellRenderSize)
			}
		}
		this.debugBoxes = []

		if (this.paused) {
			const fontSize = 25
			this.ctx.font = fontSize + "px RedAlert"
			this.ctx.fillStyle = "black"
			this.ctx.fillText("PAUSED", 2, fontSize)
			this.ctx.fillStyle = "white"
			this.ctx.fillText("PAUSED", 3, fontSize + 1)
		}

		// draw debug text
		if (this.drawDebug) {
			const fontSize = 12
			this.ctx.font = fontSize + "px RedAlert"
			this.ctx.fillStyle = "rgba(255,255,255,0.5)"

			for (let i = 0; i < debug.length; i++) {
				this.ctx.fillText(debug[i], 2, fontSize * (i + 1))
			}
		}
	}

	private render = () => {
		this.renderFrame()

		// queue a new frame
		this.nextFrame = requestAnimationFrame(this.render)
	}

	private playerLose() {
		if (!this.gameOver) {
			// put end game music here
			const dist = 50
			const count = 10 // there are always 10 rows

			for (let i = 0; i < count; i++) {
				this.soundBeep(9 - i, dist * i, dist)
			}

			this.gameOver = true
			this.compressGameLog()
			this.onUpdate({score: this.score, gameOver: this.gameOver})

			// clear the preview canvas if we loose
			if (this.previewCanvas) {
				this.previewCanvas.width = this.previewCanvas.width
			}

			// const timePerY = (dist / count) * this.grid.length
			// console.warn(">>>>>>", timePerY)

			const totalTime = dist * count

			if (this.enableAsyncAnimations) {
				this.loseAnimationPromise = (async () => {
					console.log("> loseAnimation running")

					let filledCellCount = 0
					for (let i = this.grid.length - 1; i >= 0; i--) {
						const row = this.grid[i]
						if (row) {
							const n = row.length

							for (let j = n - 1; j >= 0; j--) {
								if (row[j]) {
									filledCellCount++
								}
							}
						}
					}

					for (let i = this.grid.length - 1; i >= 0; i--) {
						const row = this.grid[i]
						if (row) {
							const n = row.length
							const timePerX = totalTime / filledCellCount

							for (let j = n - 1; j >= 0; j--) {
								// const col = row[i]
								if (row[j]) {
									row[j] = 0
									await sleep(timePerX)
									if (!this.loseAnimationPromise) return
									// delete row[j]
									// await sleep(250)
								}
							}
							this.grid.splice(i, 1)
							// await sleep(250)
						}
					}
					// .
				})().finally(() => {
					console.log("< loseAnimation done")
					delete this.loseAnimationPromise
				})
			}
		}
	}

	/** @public */
	public destroy() {
		// console.warn("\n\n** GAME.DESTROY **\n\n", this)
		const playback = this.playbackInProgress
		if (playback) {
			console.log("stopping playback...")
			if (playback.nextFrame) {
				console.log("cancelled next playback frame", playback.nextFrame)
				cancelAnimationFrame(playback.nextFrame)
			}
			if (playback.reject) {
				playback.reject()
			}
			delete this.playbackInProgress
		}
		if (this.nextFrame) {
			cancelAnimationFrame(this.nextFrame)
		}
		if (this.tickInterval) {
			clearInterval(this.tickInterval)
		}
		this.expectedNextTickTime = undefined
		this.tickInterval = undefined
		this.onUpdate = noop
	}

	private getTetrominoXMax(tetromino: NonNullable<typeof this.tetromino>) {
		const {type, rot} = tetromino

		return this.columns - 1 - Math.max(...tetrominoes[type][rot].map((y) => y.findLastIndex((x) => x === 1)))
	}

	private pushToMoveLog(move: LoggedMove) {
		this.moveLog.push(move)
	}

	/** @public */
	public playerRotate() {
		if (this.moveLog.length >= MAX_MOVES_PER_TICK) {
			console.warn("SUPPRESS PLAYER ACTION - rotate/spin")
			return
		}
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(1)
		const tetromino = this.tetromino
		if (tetromino) {
			const t = tetromino.type
			const max = tetrominoes[t].length
			const nextRot = tetromino.rot + 1
			const rot = nextRot >= max ? 0 : nextRot
			const x = tetromino.xOrigin
			const y = tetromino.yOrigin

			if (this.wouldTetrominoCollide(x, y, rot)) {
			} else {
				tetromino.rot = rot
			}

			// fix X position
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino.xOrigin > maxX) {
				tetromino.xOrigin = maxX
			}
		}
	}

	/** @public */
	public playerMoveRight() {
		if (this.moveLog.length >= MAX_MOVES_PER_TICK) {
			console.warn("SUPPRESS PLAYER ACTION - move right")
			return
		}
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(2)
		const tetromino = this.tetromino

		if (tetromino) {
			if (this.wouldTetrominoCollide(tetromino.xOrigin + 1, tetromino.yOrigin, tetromino.rot)) {
				return
			}

			tetromino.xOrigin++

			// fix X position
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino.xOrigin > maxX) {
				tetromino.xOrigin = maxX
			}
		}
	}

	/** @public */
	public playerMoveLeft() {
		if (this.moveLog.length >= MAX_MOVES_PER_TICK) {
			console.warn("SUPPRESS PLAYER ACTION - move left")
			return
		}
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(3)
		const tetromino = this.tetromino
		if (tetromino) {
			if (this.wouldTetrominoCollide(tetromino.xOrigin - 1, tetromino.yOrigin, tetromino.rot)) {
				return
			}

			tetromino.xOrigin--

			// fix X position
			if (tetromino.xOrigin <= 0) {
				tetromino.xOrigin = 0
			}
		}
	}

	/** @public */
	public playerSpeedUp() {
		if (this.moveLog.length >= MAX_MOVES_PER_TICK) {
			console.warn("SUPPRESS PLAYER ACTION - speed up")
			return
		}
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(4)
		this.step()
	}

	/** @public */
	public playerToggleDebug() {
		this.drawDebug = !this.drawDebug
	}
}
