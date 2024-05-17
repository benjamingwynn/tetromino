/** @format */

export const errors = {
	NO_INTERNET: "you are not connected to the internet",
	VERSION_MISMATCH: "you are running an old version of the game",
	CONNECTION_ERROR: "could not connect to the leaderboard server",
	SCORE_MISMATCH: "could not validate your score",
	BAD_DATA: "the server did not accept the data",
	MISSING_DATA: "the server did not accept the data",
	SUBMISSION_DROPPED: "your score did not make the leaderboard",
	BAD_USERNAME: "your username is invalid",
	TOO_MUCH_DATA: "the server couldn't handle your entire submission",
	RUN_DOES_NOT_EXIST: "this score is not available to be played back",
	RUN_TOO_OLD: "this game cannot be replayed because it was done in an earlier version of the game",
	CLIENT_PARSE_ERROR: "could not understand the response from the server",
} as const
