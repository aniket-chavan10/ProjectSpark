// Everything the match screens ask the backend. Every call either returns the data or throws an Error
// whose message is the reason the server gave (so the screen can show it as it is).
import axiosInstance from "./axiosConfig";

const run = async (promise) => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    const data = err.response?.data;
    const message = data?.message || data?.error || err.message || "Something went wrong";
    throw Object.assign(new Error(message), { status: err.response?.status });
  }
};

const post = (url, body) => run(axiosInstance.post(url, body));

const scoringApi = {
  // the fixture (tournament_matches row) with both squads
  getMatchDetails: (fixtureId) => run(axiosInstance.get(`/live/${fixtureId}/details`)),

  // toss: creates the live match and its two innings
  setToss: (fixtureId, { tossWinnerId, tossDecision }) => post(`/match/${fixtureId}/set/toss`, { tossWinnerId, tossDecision }),

  // the live scoreboard (also pushed over the socket) and the full scorecard
  getScoreboard: (matchId) => run(axiosInstance.get(`/live/score/${matchId}/scoreboard`)),
  getScorecard: (matchId) => run(axiosInstance.get(`/live/score/${matchId}/scorecard`)),

  // choose the openers and the first bowler of an innings
  setInitialPlayers: (body) => post("/live/set-initial-players", body),
  setNewBatsman: (body) => post("/live/set-new-batsman", body),
  setNewBowler: (body) => post("/live/set-new-bowler", body),

  // scoring
  registerBall: (body) => post("/ball/event", body),
  undo: (body) => post("/ball/undo", body),
  retire: (body) => post("/ball/retire", body),
  changeStriker: (body) => post("/ball/change-striker", body),

  // end the current innings (all out / overs done is automatic; forceEnd ends it early)
  switchInnings: (body) => post("/inning/switch-innings", body),
};

export default scoringApi;
