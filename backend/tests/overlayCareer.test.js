// The career figures the premium overlay prints on its player intro cards and squad graphic.
// The database is a small stand-in that answers the two queries careerCards makes.

const calls = [];
jest.mock("../dbconfigure", () => ({
  query: async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    calls.push({ s, params });
    if (s.includes("FROM player_match_stats s JOIN players_core")) {
      return [
        [
          // a batter: 10 matches, 8 innings, 2 not outs, 300 runs off 240 balls
          { player_id: 11, players_name: "Rohan Patil", profile_picture: null, team_id: 1, team_name: "A", matches: 10, innings: 8, not_outs: 2, runs: 300, balls: 240, fours: 30, sixes: 10, highest: 88, fifties: 2, hundreds: 0, ducks: 0, bowled_balls: 0, runs_conceded: 0, wickets: 0, maidens: 0, best_wickets: 0, catches: 1, stumpings: 0, run_outs: 0, keeper_matches: 0, keeper_dismissals: 0 },
          // a bowler: 12 wickets, 10 overs for 70
          { player_id: 12, players_name: "Amit Joshi", profile_picture: null, team_id: 1, team_name: "A", matches: 6, innings: 1, not_outs: 1, runs: 4, balls: 5, fours: 0, sixes: 0, highest: 4, fifties: 0, hundreds: 0, ducks: 0, bowled_balls: 60, runs_conceded: 70, wickets: 12, maidens: 1, best_wickets: 4, catches: 0, stumpings: 0, run_outs: 0, keeper_matches: 0, keeper_dismissals: 0 },
        ],
      ];
    }
    if (s.startsWith("SELECT player_id, wickets, runs_conceded FROM player_match_stats")) {
      // already ordered the way the query orders them: most wickets, then fewest runs
      return [
        [
          { player_id: 12, wickets: 4, runs_conceded: 17 },
          { player_id: 12, wickets: 4, runs_conceded: 25 },
          { player_id: 12, wickets: 2, runs_conceded: 9 },
        ],
      ];
    }
    throw new Error(`unexpected query: ${s}`);
  },
}));

const ranking = require("../services/playerRankingService");

beforeEach(() => {
  calls.length = 0;
});

describe("career cards for the overlay", () => {
  test("a batter and a bowler get the figures the intro cards print", async () => {
    const cards = await ranking.careerCards([11, 12, 99]);
    expect(cards[11]).toMatchObject({ matches: 10, innings: 8, runs: 300, average: 50, strikeRate: 125, highest: 88, wickets: 0, economy: null, best: null, role: "Batter" });
    expect(cards[12]).toMatchObject({ matches: 6, wickets: 12, economy: 7, best: "4/17" });
    expect(cards[99]).toBeUndefined(); // no match played yet: left out, the card prints dashes
  });

  test("it asks only for the players it was given, each once", async () => {
    await ranking.careerCards(["11", 11, 12, 0, null]);
    const agg = calls.find((c) => c.s.includes("JOIN players_core"));
    expect(agg.s).toContain("s.player_id IN (?)");
    expect(agg.params[0]).toEqual([11, 12]);
  });

  test("no players, no query", async () => {
    expect(await ranking.careerCards([])).toEqual({});
    expect(await ranking.careerCards(undefined)).toEqual({});
    expect(calls).toHaveLength(0);
  });
});
