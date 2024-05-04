/** @format */

import RandomNumberGenerator from "mersenne-twister"
import {tetrominoes, tetrominoIndices, tetrominoKeys, TetrominoType} from "./tetrominoes.ts"
// import {tetrominoes, tetrominoIndices, tetrominoKeys, TetrominoType} from "./debug_tetrominoes.ts"

const noop = () => undefined

function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

function hsl(stuff: number[]) {
	return `hsl(${stuff.map((x, i) => (i > 0 ? x + "%" : x)).join(" ")})`
}

type Tetromino = [TetrominoType, number, number, number]

/**
 * 1: Spin
 * 2: Move Right
 * 3: Move Left
 * 4: Speed up
 */
type LoggedMove = 1 | 2 | 3 | 4

export class Game {
	private ctx: CanvasRenderingContext2D

	private rows = 20
	private columns = 10
	private nextFrame?: number

	public readonly seed: number

	/**
	 * The grid of placed items.
	 * **ATTENTION: this is stored bottom-to-top, this may be the opposite of what you're expecting!**
	 */
	private grid: number[][] = [
		// [1, 4, 1, 1, 1, 1, 1, 1, 7, 3],
		// [3, 2, 3, 4, 5, 6, 7, 1, 5, 1],
		// [4, 6, 1, 1, 2, 1, 1, 4, 1, 6],
		// [6, 1, 3, 2, 3, 4, 5, 6, 7, 1],
		// [1, 2, 1, 5, 3, 1, 5, 4, 3, 5],
		// [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
		// [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
		// [0, 0, 1, 1, 3, 1, 1, 1, 1, 1],
	]
	private size!: number

	/** array of [h,s,l] */
	private colors = [
		[180, 90, 60], // I
		[60, 90, 60], // O
		[300, 90, 60], // T
		[240, 90, 60], // J
		[30, 90, 60], // L
		[120, 90, 60], // S
		[255, 90, 60], // Z
	]

	/**
	 * [
	 * 0: type,
	 * 1: distance from left,
	 * 2: distance from top,
	 * 3: rotation state
	 * ]
	 */
	private tetromino?: Tetromino

	private audioCtx?: AudioContext
	private oscillatorGainNode?: GainNode
	private previewCtx?: CanvasRenderingContext2D
	private tickInterval?: ReturnType<typeof setTimeout>

	private canvas?: HTMLCanvasElement = undefined
	private previewCanvas?: HTMLCanvasElement = undefined
	private onUpdate: (data: {score: number; gameOver: boolean}) => void = noop

	private randomGenerator: RandomNumberGenerator

	constructor({
		canvas,
		onUpdate,
		previewCanvas,
		enableAudio,
		seed,
	}: {
		canvas?: HTMLCanvasElement
		onUpdate?: (data: {score: number; gameOver: boolean}) => void
		previewCanvas?: HTMLCanvasElement
		enableAudio?: boolean
		seed?: number
	}) {
		if (onUpdate) this.onUpdate = onUpdate

		if (canvas) {
			this.canvas = canvas
			const ctx = canvas.getContext("2d")
			if (!ctx) throw new Error("Canvas is not available on this platform.")
			ctx.imageSmoothingEnabled = false
			this.ctx = ctx
			this.nextFrame = requestAnimationFrame(this.render)
		}

		if (previewCanvas) {
			this.previewCanvas = previewCanvas
			const previewCtx = previewCanvas.getContext("2d")
			if (!previewCtx) throw new Error("Canvas is not available on this platform.")
			previewCtx.imageSmoothingEnabled = false
			this.previewCtx = previewCtx
		}

		this.seed = seed ?? Math.floor(Date.now() / 60_000)
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
				// meh
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

	/** Start the game regularly. Sets up the tick to happen at a human-playable speed */
	public play() {
		this.enableAsyncAnimatedScoring = true
		this.tickInterval = setInterval(() => {
			this.tick()
		}, 20)
	}

	/** returns `true` if terminate with game over, `false` if terminated early */
	public replay(log: typeof this.gameLog, max: number): boolean {
		const t = performance.now()
		this.enableAsyncAnimatedScoring = false
		let n = 0
		let c = 0
		while (!this.gameOver) {
			if (n === max) {
				// console.warn("WARNING: hit maximum during replay before gameOver, bailing!")
				return false
			}
			n++
			const actions = log[this.tickCounter]
			if (actions) {
				for (const action of actions) {
					c++
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
		const timeTaken = performance.now() - t
		// console.log(
		// 	"Replayed",
		// 	c,
		// 	"moves over",
		// 	this.tickCounter,
		// 	"ticks in",
		// 	timeTaken,
		// 	"ms",
		// 	`(${Math.floor(this.tickCounter / (timeTaken / 1000))} ticks/sec)`
		// )
		return true
	}

	public soundBeep(note = 0, msDelay: number = 0, msDuration: number = 100, pitch = 0) {
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
			// meh
		}
	}

	private layout() {
		if (!this.canvas) throw new Error("layout() fired without this.canvas available.")
		this.size = Math.min(this.canvas.width, this.canvas.height) / this.columns
	}

	private drawCell(x: number, y: number, colorIndex: number) {
		let [h, s, l] = this.colors[colorIndex - 1]
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

		const size = this.size
		this.ctx.fillRect((x + 0) * size, y * size, size, size)

		this.ctx.strokeStyle = hsl([h, s + 20, l - 20])
		this.ctx.lineWidth = 2
		this.ctx.strokeRect((x + 0) * size + 2, y * size + 2, size - 4, size - 4)
	}

	private lastStep = 0
	private minStepInterval = 3
	private startStepInterval = 50
	private stepInterval = this.startStepInterval
	private giveTetrominoInterval = 13
	private tickLostTetromino: number = 0
	private paused = false
	private gameOver = false
	private score = 0

	public getScore() {
		return this.score
	}

	/** [0: row number, 1: start time] */
	private animateRow?: [number, number]
	private animationDurationBase = 500
	private animationDuration = this.animationDurationBase
	private lastX = 0
	private drawDebug = false
	private giveCount = 0
	private moveLog: LoggedMove[] = []
	public gameLog: Record<number, typeof this.moveLog> = {}

	private pushToMoveLog(move: LoggedMove) {
		this.moveLog.push(move)
	}

	private compressGameLog() {
		const entries = Object.entries(this.gameLog)
		const filtered = entries.filter(([key, val]) => val.length)
		this.gameLog = Object.fromEntries(filtered)
		// console.log("game log compression removed entries:", entries.length - filtered.length)
	}

	private enableAsyncAnimatedScoring = false

	private step = () => {
		const tetromino = this.tetromino
		// const tetromino = this.tetromino
		if (tetromino) {
			// see if we're in range of the grid
			const [type, xOrigin, yOrigin, rot] = tetromino
			const bitmap = tetrominoes[type][rot]

			const onCollision = () => {
				// that's a collision, add this to the grid
				this.lastX = tetromino[1]
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
				if (this.enableAsyncAnimatedScoring) {
					;(async () => {
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

								this.animateRow = undefined
								this.grid.splice(i, 1)
								i-- // <- because we splice from the array we're searching, we need to fix the search index
								count++
								this.score += SCORE_BASE * multiplier
								multiplier += SCORE_MULTIPLIER
								this.onUpdate({score: this.score, gameOver: this.gameOver})
							}
						}
					})()
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

			if (this.wouldTetrominoCollide(xOrigin + 0, yOrigin + 1, rot)) {
				onCollision()
			} else {
				tetromino[2] += 1
			}
		}
	}

	private debugBoxes: {stroke: string; x: number; y: number}[] = []

	/** returns 1 for collide with grid, 2 for collide with floor */
	private wouldTetrominoCollide = (x: number, y: number, rot: number) => {
		const tetromino = this.tetromino
		if (tetromino) {
			// see if we're in range of the grid
			const [type] = tetromino
			const bitmap = tetrominoes[type][rot]

			for (let i = 0; i < bitmap.length; i++) {
				const row = bitmap[i]
				for (let j = 0; j < row.length; j++) {
					if (row[j]) {
						// ^ if shape filled
						const partX = j + x
						const partY = i + y

						this.debugBoxes.push({stroke: "red", x: partX, y: partY})
						if (partY === this.rows) {
							this.debugBoxes.push({stroke: "limegreen", x: partX, y: partY - 1})
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
											this.debugBoxes.push({stroke: "limegreen", x: partX, y: partY})
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

	private nextTetrominoType!: TetrominoType

	private tickCounter = 0

	public getTicks() {
		return this.tickCounter
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

		this.moveLog = []
		this.gameLog[this.tickCounter] = this.moveLog
		this.tickCounter++

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
							let [h, s, l] = this.colors[color - 1]
							this.previewCtx.fillStyle = hsl([h, s, l])

							const size = this.size
							this.previewCtx.fillRect(j * size, i * size, size, size)

							this.previewCtx.strokeStyle = hsl([h, s + 20, l - 20])
							this.previewCtx.lineWidth = 1
							this.previewCtx.strokeRect((j + 0) * size + 2, i * size + 2, size - 4, size - 4)
						}
					}
				}
			}

			const tetromino: Tetromino = [shape, this.lastX, -tetrominoes[shape][0].length - 0, 0]

			// the spawned tetromino can technically be outside the right of the game, fix that
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino[1] > maxX) tetromino[1] = maxX
			this.tetromino = tetromino
			this.giveCount++

			// **speed up the game**
			if (this.giveCount % 5 === 0) {
				this.stepInterval = Math.floor(this.startStepInterval - this.score / 125)
				this.stepInterval = Math.max(this.minStepInterval, this.stepInterval)
			}
		}
		if (this.tickCounter >= this.lastStep + this.stepInterval) {
			this.step()
			this.lastStep = this.tickCounter
		}
	}

	public render = () => {
		if (!this.canvas) throw new Error("render() fired without this.canvas available.")

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

					if (col) {
						this.drawCell(x, y, col)
					}
				}
			}
		}

		// draw the tetromino
		const tetromino = this.tetromino

		const debug: string[] = [
			this.paused ? `PAUSED` : `Running`,
			"Score: " + this.score,
			this.gameOver ? "GAME OVER" : "Playing",
			this.animateRow?.join(",") ?? "-",
			"Given: " + this.giveCount,
			"Seed: " + this.seed,
			"Interval:" + this.stepInterval,
			"Tick: " + this.tickCounter,
			"Drawn: " + Date.now(),
		]
		if (tetromino) {
			const [type, x, y, rot] = tetromino
			// const color = tetromino_COLORS[type]
			const color = tetrominoIndices[type] + 1
			const bitmap = tetrominoes[type][rot]
			for (let i = 0; i < bitmap.length; i++) {
				const row = bitmap[i]
				for (let j = 0; j < row.length; j++) {
					const filled = row[j]
					if (filled) {
						this.drawCell(x + j, y + i, color)
					}
				}
			}
			debug.push(`tetromino=${tetromino}`)
		}

		// draw debug boxes
		if (this.drawDebug) {
			this.debugBoxes.forEach((box) => {
				this.ctx.lineWidth = 4
				this.ctx.strokeStyle = box.stroke
				this.ctx.strokeRect(box.x * this.size, box.y * this.size, this.size, this.size)
			})
		}
		this.debugBoxes = []

		// draw debug text
		if (this.drawDebug) {
			this.ctx.fillStyle = "white"
			const fontSize = 9
			this.ctx.font = fontSize + "px RedAlert"

			for (let i = 0; i < debug.length; i++) {
				this.ctx.fillText(debug[i], 2, fontSize * (i + 1))
			}
		}

		// queue a new frame
		this.nextFrame = requestAnimationFrame(this.render)
	}

	private playerLose() {
		if (!this.gameOver) {
			// put end game music here
			const dist = 50
			const count = 10
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
		}
	}

	/** @public */
	public destroy() {
		if (this.nextFrame) {
			cancelAnimationFrame(this.nextFrame)
		}
		clearInterval(this.tickInterval)
	}

	private getTetrominoXMax(tetromino: NonNullable<typeof this.tetromino>) {
		const [type, x, y, rot] = tetromino

		return this.columns - 1 - Math.max(...tetrominoes[type][rot].map((y) => y.findLastIndex((x) => x === 1)))
	}

	/** @public */
	public playerRotate() {
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(1)
		const tetromino = this.tetromino
		if (tetromino) {
			const t = tetromino[0]
			const max = tetrominoes[t].length
			const nextRot = tetromino[3] + 1
			const rot = nextRot >= max ? 0 : nextRot
			const x = tetromino[1]
			const y = tetromino[2]

			if (this.wouldTetrominoCollide(x, y, rot)) {
			} else {
				tetromino[3] = rot
			}

			// fix X position
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino[1] > maxX) {
				tetromino[1] = maxX
			}
		}
	}

	/** @public */
	public playerMoveRight() {
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(2)
		const tetromino = this.tetromino

		if (tetromino) {
			const [type, x, y, rot] = tetromino

			if (this.wouldTetrominoCollide(x + 1, y, rot)) {
				return
			}

			tetromino[1]++

			// fix X position
			const maxX = this.getTetrominoXMax(tetromino)
			if (tetromino[1] > maxX) {
				tetromino[1] = maxX
			}
		}
	}

	/** @public */
	public playerMoveLeft() {
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(3)
		const tetromino = this.tetromino
		if (tetromino) {
			const [type, x, y, rot] = tetromino

			if (this.wouldTetrominoCollide(x - 1, y, rot)) {
				return
			}

			tetromino[1]--

			// fix X position
			if (tetromino[1] <= 0) {
				tetromino[1] = 0
			}
		}
	}

	/** @public */
	public playerSpeedUp() {
		if (this.paused || this.animateRow || this.gameOver) return
		this.pushToMoveLog(4)
		this.step()
	}

	/** @public */
	public playerPause() {
		this.paused = !this.paused
	}
	/** @public */
	public playerToggleDebug() {
		this.drawDebug = !this.drawDebug
	}
}
