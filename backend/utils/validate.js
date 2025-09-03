exports.requireFields = (data, fields) => {
  for (const f of fields) {
    if (typeof data[f] === "undefined" || data[f] === undefined) {
      throw new Error(`Missing required field: ${f}`);
    }
  }
  return true;
};


// utils/validate.js

exports.validateBowlerEligibility = async (conn, inningId, bowlerId, currentOverNumber) => {
  // Sample: disallow same bowler in consecutive overs
  const [rows] = await conn.execute(
    `SELECT bowler_id FROM balls
     WHERE inning_id = ? AND over_number = ?
     LIMIT 1`,
    [inningId, currentOverNumber - 1]
  );
  const lastOver = rows[0];
  if (lastOver && lastOver.bowler_id === bowlerId) {
    throw new Error("Same bowler cannot bowl consecutive overs");
  }
};

exports.validateWicketType = ({ isWicket, wicketType, batsmanId, live }) => {
  if (!isWicket) return;
  const nonStrikerId = live.non_striker_batsman_id;

  // Example: 'stumped' or 'bowled' cannot happen to non-striker
  const restrictedWicketTypes = ['bowled', 'stumped'];
  if (batsmanId === nonStrikerId && restrictedWicketTypes.includes(wicketType)) {
    throw new Error(`Invalid dismissal: ${wicketType} cannot happen to non-striker`);
  }
};
