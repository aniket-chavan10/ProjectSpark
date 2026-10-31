// Tournament format: groups of teams play a knockout each, the group winners meet in the semi-finals
// (the host chooses who meets whom), the semi-final winners play the final, and a third-place match
// is optional. Pure functions, no DB access.

const { ScoringError } = require("./errors");

const isPowerOfTwo = (n) => Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;

// Match stages
const STAGE = { GROUP: "group", SEMI: "semi", THIRD: "third_place", FINAL: "final" };

/**
 * Group winners meet each other, e.g. [["A","C"],["B","D"]]. Any pairing of the four groups is fine.
 * With the groups in alphabetical order the default is A v C and B v D.
 */
function defaultSemiPairs(groupNames) {
  if (groupNames.length !== 4) return [];
  const [a, b, c, d] = groupNames;
  return [
    [a, c],
    [b, d],
  ];
}

function validateSemiPairs(groupNames, semiPairs) {
  if (groupNames.length !== 4) return;
  const flat = (semiPairs || []).flat();
  const ok =
    Array.isArray(semiPairs) &&
    semiPairs.length === 2 &&
    semiPairs.every((p) => Array.isArray(p) && p.length === 2) &&
    flat.length === 4 &&
    new Set(flat).size === 4 &&
    flat.every((g) => groupNames.includes(g));
  if (!ok) throw new ScoringError("Semi-final pairs must use each group exactly once, e.g. A v C and B v D");
}

/**
 * Build every fixture of the tournament.
 *
 * @param groups  [{ group_name: "A", teams: [teamId | {id}, ...] }]  teams in the order the host wants them
 *                paired: 1 v 2, 3 v 4, 5 v 6, 7 v 8 (a group size of 2, 4, 8 or 16 works)
 * @param options { semiPairs, thirdPlaceMatch }
 * @returns { matches, groupWinnerMatchNo }
 *   match: { match_no, stage, group, round, label, team1Id, team2Id,
 *            dep1: {matchNo, type} | null, dep2: {matchNo, type} | null, team1Label, team2Label }
 *   type is "winner" or "loser"
 */
function buildFixtures(groups, { semiPairs, thirdPlaceMatch = false } = {}) {
  if (!Array.isArray(groups) || groups.length === 0) throw new ScoringError("No groups to schedule");
  if (groups.length !== 2 && groups.length !== 4) {
    throw new ScoringError("Groups must be 2 or 4 so the winners can meet in a final or semi-finals");
  }
  const groupNames = groups.map((g) => g.group_name);
  if (new Set(groupNames).size !== groupNames.length) throw new ScoringError("Group names must be different");

  const matches = [];
  const groupWinnerMatchNo = {};
  let counter = 0;

  const push = (m) => {
    const match = { dep1: null, dep2: null, team1Id: null, team2Id: null, ...m, match_no: ++counter };
    matches.push(match);
    return match;
  };

  // ---- one knockout per group: 8 teams = 4 + 2 + 1 matches, numbered in play order ----
  groups.forEach((g) => {
    const ids = (g.teams || []).map((t) => (t !== null && typeof t === "object" ? t.id : t));
    if (!isPowerOfTwo(ids.length)) {
      throw new ScoringError(`Group ${g.group_name} has ${ids.length} teams. It needs 2, 4, 8 or 16 teams.`);
    }
    if (new Set(ids.map(String)).size !== ids.length) {
      throw new ScoringError(`Group ${g.group_name} has the same team more than once`);
    }
    const totalRounds = Math.log2(ids.length);

    const build = (slice) => {
      if (slice.length === 1) return { teamId: slice[0] };
      const half = slice.length / 2;
      const left = build(slice.slice(0, half));
      const right = build(slice.slice(half));
      const round = Math.log2(slice.length);
      const match = push({
        stage: STAGE.GROUP,
        group: g.group_name,
        round,
        label: round === totalRounds ? `Group ${g.group_name} final` : `Group ${g.group_name} · Round ${round}`,
        team1Id: left.teamId ?? null,
        team2Id: right.teamId ?? null,
        dep1: left.matchNo ? { matchNo: left.matchNo, type: "winner" } : null,
        dep2: right.matchNo ? { matchNo: right.matchNo, type: "winner" } : null,
      });
      return { matchNo: match.match_no };
    };
    groupWinnerMatchNo[g.group_name] = build(ids).matchNo;
  });

  // ---- semi-finals (or straight to the final with two groups) ----
  let finalists;
  const semis = [];
  if (groups.length === 4) {
    const pairs = semiPairs || defaultSemiPairs(groupNames);
    validateSemiPairs(groupNames, pairs);
    pairs.forEach(([g1, g2], i) => {
      semis.push(
        push({
          stage: STAGE.SEMI,
          group: null,
          round: Math.log2(groups[0].teams.length) + 1,
          label: `Semi-final ${i + 1}`,
          dep1: { matchNo: groupWinnerMatchNo[g1], type: "winner" },
          dep2: { matchNo: groupWinnerMatchNo[g2], type: "winner" },
        })
      );
    });
    finalists = semis.map((s) => ({ matchNo: s.match_no, type: "winner" }));
  } else {
    finalists = groupNames.map((name) => ({ matchNo: groupWinnerMatchNo[name], type: "winner" }));
  }

  // ---- optional third-place match, then the final ----
  const finalRound = Math.log2(groups[0].teams.length) + (groups.length === 4 ? 2 : 1);
  if (thirdPlaceMatch && semis.length === 2) {
    push({
      stage: STAGE.THIRD,
      group: null,
      round: finalRound,
      label: "Third place",
      dep1: { matchNo: semis[0].match_no, type: "loser" },
      dep2: { matchNo: semis[1].match_no, type: "loser" },
    });
  }
  push({
    stage: STAGE.FINAL,
    group: null,
    round: finalRound,
    label: "Final",
    dep1: finalists[0],
    dep2: finalists[1],
  });

  // Text for a slot whose team is not known yet ("Group A winner", "Loser of Match 29")
  const groupOfWinnerMatch = Object.fromEntries(Object.entries(groupWinnerMatchNo).map(([g, no]) => [no, g]));
  const slotLabel = (dep) => {
    if (!dep) return null;
    if (dep.type === "winner" && groupOfWinnerMatch[dep.matchNo]) return `Group ${groupOfWinnerMatch[dep.matchNo]} winner`;
    return `${dep.type === "winner" ? "Winner" : "Loser"} of Match ${dep.matchNo}`;
  };
  matches.forEach((m) => {
    m.team1Label = slotLabel(m.dep1);
    m.team2Label = slotLabel(m.dep2);
  });

  return { matches, groupWinnerMatchNo };
}

/**
 * Final positions from the matches played so far.
 *
 * 1st / 2nd: winner and loser of the final.
 * 3rd / 4th: the winner and loser of the third-place match when it was played. When there is no
 * third-place match, the semi-final loser who lost to the champion takes 3rd and the one who lost
 * to the runner-up takes 4th (the teams already met, so nobody has to play again).
 *
 * @param matches [{ match_no, stage, status, team1_id, team2_id, winner_team_id }]
 * @returns [{ position, teamId, decidedBy }]  only the positions that are already known
 */
function computeStandings(matches) {
  const done = (m) => m && m.status === "completed" && m.winner_team_id;
  const loserOf = (m) => (Number(m.winner_team_id) === Number(m.team1_id) ? m.team2_id : m.team1_id);

  const final = matches.find((m) => m.stage === STAGE.FINAL);
  const third = matches.find((m) => m.stage === STAGE.THIRD);
  const semis = matches.filter((m) => m.stage === STAGE.SEMI);
  const out = [];

  if (!done(final)) return out;
  const champion = final.winner_team_id;
  const runnerUp = loserOf(final);
  out.push({ position: 1, teamId: champion, decidedBy: "final" });
  out.push({ position: 2, teamId: runnerUp, decidedBy: "final" });

  if (third) {
    if (done(third)) {
      out.push({ position: 3, teamId: third.winner_team_id, decidedBy: "third_place_match" });
      out.push({ position: 4, teamId: loserOf(third), decidedBy: "third_place_match" });
    }
    return out;
  }

  if (semis.length === 2 && semis.every(done)) {
    const semiOf = (teamId) => semis.find((s) => Number(s.team1_id) === Number(teamId) || Number(s.team2_id) === Number(teamId));
    const lostToChampion = semiOf(champion);
    const lostToRunnerUp = semiOf(runnerUp);
    if (lostToChampion && lostToRunnerUp) {
      out.push({ position: 3, teamId: loserOf(lostToChampion), decidedBy: "semi_final_loser" });
      out.push({ position: 4, teamId: loserOf(lostToRunnerUp), decidedBy: "semi_final_loser" });
    }
  }
  return out;
}

module.exports = { STAGE, buildFixtures, computeStandings, defaultSemiPairs, validateSemiPairs, isPowerOfTwo };
