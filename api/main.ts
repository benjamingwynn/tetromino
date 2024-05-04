/** @format */
import {Game} from "../src/tetris/Game.ts"

const log =
	'{"18":[4],"30":[4],"32":[4],"34":[4],"36":[4],"37":[4],"39":[4],"40":[4],"42":[4],"44":[4],"46":[4],"47":[4],"49":[4],"51":[4],"53":[4],"54":[4],"56":[4],"58":[4],"59":[4],"61":[4],"63":[4],"64":[4],"66":[4],"68":[4],"70":[4],"71":[4],"73":[4],"74":[4],"77":[2],"86":[4],"99":[4],"100":[4],"101":[3],"147":[4],"159":[4],"161":[4],"163":[4],"164":[4],"166":[4],"168":[4],"169":[4],"171":[4],"173":[4],"174":[4],"176":[4],"178":[4],"179":[4],"181":[4],"183":[4],"184":[4],"186":[4],"199":[4],"200":[2],"218":[1],"227":[2],"230":[4],"240":[4],"248":[1],"257":[2],"266":[2],"271":[4],"276":[1],"280":[4],"293":[4],"294":[4],"296":[4],"298":[4],"299":[4],"301":[4],"303":[4],"304":[4],"306":[4],"307":[4],"309":[4],"310":[3],"327":[4],"332":[3],"344":[4],"353":[4],"366":[2],"379":[2,4],"390":[4],"399":[2],"402":[4],"410":[4],"413":[2],"425":[4],"438":[4,3],"448":[4],"461":[4],"463":[4],"464":[4],"466":[4],"468":[4],"485":[4],"499":[4],"508":[4],"516":[4],"525":[4],"534":[4],"544":[4],"556":[2],"558":[4],"567":[4],"569":[2],"578":[4],"579":[2],"592":[1],"603":[4],"608":[3],"619":[4],"620":[3],"634":[1],"643":[1],"657":[3],"669":[4],"691":[4],"703":[4],"705":[4],"707":[4],"708":[4],"710":[4],"720":[4],"733":[3],"743":[3],"752":[3],"760":[3],"772":[4],"794":[4],"807":[4],"808":[2],"824":[4],"829":[2],"841":[2],"843":[2],"845":[2],"847":[2],"849":[2],"855":[4],"863":[3],"878":[4],"890":[4],"891":[4],"893":[4],"895":[4],"897":[4],"898":[4],"900":[4],"902":[4],"904":[4],"905":[4],"915":[4],"934":[4],"951":[4],"959":[4],"968":[2],"994":[4],"1000":[3],"1015":[3],"1017":[4],"1026":[3,4],"1035":[4,3],"1044":[4],"1056":[4],"1058":[4],"1060":[4],"1062":[4],"1063":[4],"1065":[4],"1067":[4],"1068":[4],"1070":[4],"1072":[4],"1073":[4],"1075":[4],"1077":[4],"1078":[4],"1080":[4],"1082":[4],"1083":[4],"1085":[4],"1087":[4],"1091":[2],"1102":[2],"1117":[1],"1127":[2,1],"1137":[2],"1145":[4],"1155":[4],"1167":[4],"1169":[4],"1170":[4],"1172":[4],"1174":[4],"1176":[4],"1178":[4],"1179":[4],"1180":[4],"1183":[4],"1184":[4],"1186":[4],"1188":[4],"1189":[4],"1191":[4],"1193":[4],"1194":[4],"1248":[4],"1261":[4],"1262":[4],"1264":[4],"1266":[4],"1268":[4],"1269":[4],"1271":[4],"1273":[4],"1274":[4],"1276":[4],"1278":[4],"1279":[4],"1281":[4],"1283":[4],"1284":[4],"1286":[4],"1288":[4],"1289":[4],"1291":[4],"1293":[4],"1294":[4],"1296":[4],"1298":[4],"1299":[4],"1301":[4],"1303":[4],"1304":[4],"1306":[4],"1308":[4],"1310":[4],"1311":[4],"1313":[4],"1315":[4],"1317":[4],"1318":[4],"1320":[4],"1321":[4],"1323":[4],"1325":[4],"1327":[4],"1328":[4],"1330":[4],"1331":[4],"1333":[4],"1335":[4],"1336":[4],"1338":[4],"1340":[4],"1341":[4],"1343":[4],"1345":[4],"1346":[4],"1348":[4],"1350":[4],"1352":[4],"1353":[4],"1355":[4],"1357":[4],"1358":[4],"1360":[4],"1362":[4],"1363":[4],"1365":[4],"1367":[4],"1368":[4],"1370":[4],"1372":[4],"1374":[4],"1375":[4],"1377":[4],"1378":[4],"1380":[4],"1382":[4],"1384":[4],"1385":[4],"1387":[4],"1388":[4],"1390":[4],"1392":[4],"1394":[4],"1395":[4],"1397":[4],"1399":[4],"1401":[4],"1402":[4],"1404":[4],"1406":[4],"1408":[4],"1409":[4],"1411":[4],"1412":[4],"1414":[4],"1416":[4],"1417":[4],"1419":[4],"1421":[4],"1422":[4],"1424":[4],"1426":[4],"1427":[4],"1429":[4],"1431":[4],"1432":[4],"1434":[4],"1436":[4],"1437":[4],"1439":[4],"1441":[4],"1442":[4],"1444":[4],"1446":[4],"1448":[4],"1449":[4],"1451":[4],"1452":[4],"1508":[4],"1520":[4],"1521":[4],"1523":[4],"1525":[4],"1526":[4],"1528":[4],"1530":[4],"1531":[4],"1533":[4],"1535":[4],"1536":[4],"1538":[4]}'
const seed = 28580872
const score = 250
const max = 1541

type HighScoreSubmission = {username: string; log: string; seed: number; score: number; max: number}

const MAX_TICKS = 10_000_000
const MAX_SEED = 1_000_000_000
const MAX_USERNAME_LENGTH = 16

export function isValidSubmission(obj: any): obj is HighScoreSubmission {
	const rtn =
		typeof obj === "object" &&
		typeof obj.seed === "number" &&
		obj.seed > 0 &&
		obj.seed < MAX_SEED &&
		typeof obj.username === "string" &&
		obj.username.length < MAX_USERNAME_LENGTH &&
		typeof obj.score === "number" &&
		obj.score > 0 &&
		typeof obj.max === "number" &&
		obj.max > 0 &&
		obj.max < MAX_TICKS

	if (!rtn) console.error("INVALID SUBMISSION:", obj)
	return rtn
}

function replay(seed: number, score: number, max: number, log: any) {
	const game2 = new Game({
		enableAudio: false,
		seed,
	})
	game2.playerToggleDebug()

	const success = game2.replay(log, max)
	const theScore = game2.getScore()
	let ok = false
	if (success && score === theScore) {
		console.log("**** SUCCESS!! ****")
		ok = true
	} else if (!success && score === theScore) {
		console.warn("**** NON-SUCCESS BUT MATCHING SCORE!! ****")
		//change this to false if we want to be stricter
		ok = true
	} else {
		console.error("**** FAILURE!! ****")
	}

	game2.destroy()
	return ok
}

function storeHighScore(submission: HighScoreSubmission) {
	// todo: database and whatever
	console.log(submission.username, "scored", submission.score)
}

export function submitScore(submission: HighScoreSubmission): boolean {
	const {username, seed, score, log, max} = submission
	try {
		const okay = replay(seed, score, max, JSON.parse(log))
		if (okay) {
			storeHighScore(submission)
			return true
		}
		return false
	} catch {
		// } catch (err) {
		// console.warn(err)
		return false
	}
}

console.log("...")
submitScore({username: "benjamin", log, seed, score, max})
console.log("done")