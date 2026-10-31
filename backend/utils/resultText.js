// "Spark XI won by 5 runs", "Tie", "Match abandoned": one place so the result reads the same everywhere.

/**
 * @param m     { status, winner_team_id, victory_margin_type, victory_margin, decided_by? }
 * @param names { [teamId]: name }
 */
function resultText(m, names = {}) {
  if (!m || m.status !== "completed") return null;
  const winner = m.winner_team_id;
  if (!winner) return "Match tied";
  const name = names[winner] || `Team ${winner}`;
  // a tie settled afterwards: say how
  if (m.decided_by === "tie_super_over") return `Match tied · ${name} won the super over`;
  if (m.decided_by === "tie_batted_first") return `Match tied · ${name} win for batting first`;
  if (m.decided_by === "tie_manual") return `Match tied · ${name} awarded the win`;
  const n = Number(m.victory_margin);
  if (m.victory_margin_type === "runs" && n >= 0) return `${name} won by ${n} run${n === 1 ? "" : "s"}`;
  if (m.victory_margin_type === "wickets" && n >= 0) return `${name} won by ${n} wicket${n === 1 ? "" : "s"}`;
  return `${name} won`;
}

const STAGE_LABEL = { group: "Group", semi: "Semi-final", third_place: "Third-place match", final: "Final" };
const stageLabel = (stage, group, round) => {
  if (stage === "group") return group ? `Group ${group}${round ? ` · Round ${round}` : ""}` : "Group stage";
  return STAGE_LABEL[stage] || "Match";
};

module.exports = { resultText, stageLabel };
