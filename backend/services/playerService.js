// A team admin manages the players of their own team. The team always comes from the login, never from the request.

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");

const card = (p) => ({
  id: Number(p.player_id),
  name: p.players_name,
  mobile: p.mobile_number || null,
  email: p.email || null,
  photo: p.profile_picture || null,
  banned: !!p.is_banned && (!p.banned_until || new Date(p.banned_until) > new Date()),
});

/** "98765 43210", "+91 98765-43210" -> "9876543210" (10 digits) */
function cleanMobile(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^\d{10}$/.test(digits)) throw new ScoringError("Enter a 10-digit mobile number");
  return digits;
}

function cleanDetails({ name, mobile, email }) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (cleanName.length < 2 || cleanName.length > 60) throw new ScoringError("Enter the player's name (2 to 60 letters)");
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new ScoringError("That email address does not look right");
  return { name: cleanName, mobile: cleanMobile(mobile), email: cleanEmail || null };
}

async function ownPlayer(teamId, playerId) {
  const [rows] = await db.query(`SELECT player_id, players_name, mobile_number, email, profile_picture, is_banned, banned_until FROM players_core WHERE player_id = ? AND team_id = ?`, [playerId, teamId]);
  if (!rows.length) throw new ScoringError("Player not found in your team", 404);
  return rows[0];
}

async function assertMobileFree(teamId, mobile, exceptPlayerId = 0) {
  const [rows] = await db.query(`SELECT player_id FROM players_core WHERE team_id = ? AND mobile_number = ? AND player_id <> ?`, [teamId, mobile, exceptPlayerId]);
  if (rows.length) throw new ScoringError("A player with this mobile number is already in your team", 409);
}

exports.listPlayers = async (teamId) => {
  const [rows] = await db.query(
    `SELECT player_id, players_name, mobile_number, email, profile_picture, is_banned, banned_until FROM players_core WHERE team_id = ? ORDER BY players_name`,
    [teamId]
  );
  return rows.map(card);
};

exports.createPlayer = async (teamId, input, photoPath) => {
  const d = cleanDetails(input);
  await assertMobileFree(teamId, d.mobile);
  // players do not log in yet: store a random password hash so the column is filled
  const password = await bcrypt.hash(crypto.randomBytes(9).toString("base64url"), 10);
  const [res] = await db.query(
    `INSERT INTO players_core (team_id, players_name, mobile_number, email, profile_picture, password) VALUES (?, ?, ?, ?, ?, ?)`,
    [teamId, d.name, d.mobile, d.email, photoPath || null, password]
  );
  return card(await ownPlayer(teamId, res.insertId));
};

exports.updatePlayer = async (teamId, playerId, input, photoPath) => {
  const current = await ownPlayer(teamId, playerId);
  const d = cleanDetails({ name: input.name ?? current.players_name, mobile: input.mobile ?? current.mobile_number, email: input.email ?? current.email });
  await assertMobileFree(teamId, d.mobile, Number(playerId));
  await db.query(`UPDATE players_core SET players_name = ?, mobile_number = ?, email = ?, profile_picture = ? WHERE player_id = ? AND team_id = ?`, [
    d.name,
    d.mobile,
    d.email,
    photoPath || current.profile_picture || null,
    playerId,
    teamId,
  ]);
  return card(await ownPlayer(teamId, playerId));
};

/** Remove a player. Someone who has played a ball or is in a frozen match squad stays, so old scorecards keep their names. */
exports.removePlayer = async (teamId, playerId) => {
  await ownPlayer(teamId, playerId);
  const [[played]] = await db.query(
    `SELECT COUNT(*) AS n FROM balls WHERE batsman_id = ? OR bowler_id = ? OR dismissed_player_id = ? OR fielder_id = ?`,
    [playerId, playerId, playerId, playerId]
  );
  const [[frozen]] = await db.query(
    `SELECT COUNT(*) AS n FROM match_squads ms JOIN tournament_matches tm ON tm.id = ms.tournament_match_id WHERE ms.player_id = ? AND tm.match_id IS NOT NULL`,
    [playerId]
  );
  if (Number(played.n) > 0 || Number(frozen.n) > 0) {
    throw new ScoringError("This player has been in a match, so they cannot be removed. Leave them out of your squads instead.", 409);
  }
  await db.query(`DELETE FROM tournament_squads WHERE player_id = ? AND team_id = ?`, [playerId, teamId]);
  await db.query(`DELETE FROM match_squads WHERE player_id = ? AND team_id = ?`, [playerId, teamId]);
  await db.query(`DELETE FROM players_core WHERE player_id = ? AND team_id = ?`, [playerId, teamId]);
  return { removed: Number(playerId) };
};

exports.cleanMobile = cleanMobile;
