const db = require("../dbconfigure");


exports.getTournamentsByOrganizer = async (organizerAdminId) => {
  const [rows] = await db.query(
    `SELECT 
        s.id AS schedule_id,
        s.start_date,
        s.end_date,
        s.status AS schedule_status,
        t.id AS tournament_id,
        t.name,
        t.venue,
        t.banner_image,
        t.status AS tournament_status
     FROM tentative_tournament_schedules s
     LEFT JOIN tournaments t ON s.tournament_id = t.id
     WHERE s.organizer_admin_id = ?
       AND s.status IN ('pending', 'allocated')
     ORDER BY s.start_date ASC`,
    [organizerAdminId]
  );
  return rows;
};


// services/tournamentService.js
exports.getAppliedTeamsForOrganizer = async (organizerAdminId, tournamentId) => {
  const [tournRows] = await db.query(
    `SELECT id FROM tournaments 
     WHERE id = ? AND organizer_admin_id = ?`,
    [tournamentId, organizerAdminId]
  );
  if (!tournRows.length) {
    throw new Error("Tournament not found or access denied");
  }

  const [rows] = await db.query(
    `SELECT 
       tp.id AS application_id,
       tp.team_id,
       tp.group_name,
       tp.status,
       tp.created_at,
       tm.team_name,
       tm.logo,
       tm.team_name AS captain_name
     FROM tournament_participants tp
     JOIN teams tm ON tp.team_id = tm.id
     WHERE tp.tournament_id = ?
     ORDER BY tp.created_at DESC`,
    [tournamentId]
  );

  return rows;
};


exports.getTournamentById = async (tournamentId) => {
  const sql = `SELECT * FROM tournaments WHERE id = ?`;
  const [rows] = await db.query(sql, [tournamentId]);
  return rows.length ? rows[0] : null;
};

exports.updateTournament = async (tournamentId, updateData) => {
  const allowedFields = ["banner_image", "name", "venue"];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error(
      "No valid fields provided for update. Allowed: name, banner_image, venue."
    );
  }

  values.push(tournamentId);

  const sql = `UPDATE tournaments SET ${fields.join(
    ", "
  )}, updated_at = NOW() WHERE id = ?`;
  await db.query(sql, values);
  return exports.getTournamentById(tournamentId);
};

exports.getOpenTournaments = async () => {
  const sql = `
    SELECT t.*, 
           (t.total_slots - IFNULL(tp.applied_count, 0)) AS available_slots
    FROM tournaments t
    LEFT JOIN (
      SELECT tournament_id, COUNT(*) AS applied_count
      FROM tournament_participants
      WHERE status NOT IN ('cancelled', 'rejected')
      GROUP BY tournament_id
    ) tp ON t.id = tp.tournament_id
    WHERE t.status = 'open'
      AND (t.application_deadline IS NULL OR t.application_deadline >= ?)
    HAVING available_slots > 0
    ORDER BY t.start_date DESC
  `;

  const now = new Date();
  const formattedNow = now.toISOString().slice(0, 19).replace("T", " ");

  const [rows] = await db.query(sql, [formattedNow]);
  return rows;
};


exports.assignGroups = async (tournamentId, organizerAdminId, assignments) => {
  if (!Array.isArray(assignments) || !assignments.length) {
    throw new Error('Assignments must be a non-empty array.');
  }

  // Validate that these teams exist in the given tournament
  const teamIds = assignments.map(a => a.team_id);
  const [existing] = await db.query(
    `SELECT team_id FROM tournament_participants WHERE tournament_id = ? AND team_id IN (?)`,
    [tournamentId, teamIds]
  );

  if (existing.length !== assignments.length) {
    throw new Error('Some teams are not part of this tournament.');
  }

  // Update each team’s group_name
  for (let { team_id, group_name } of assignments) {
    if (!['A', 'B', 'C', 'D'].includes(group_name)) {
      throw new Error(`Invalid group name: ${group_name}`);
    }

    await db.query(
      `UPDATE tournament_participants SET group_name = ? WHERE tournament_id = ? AND team_id = ?`,
      [group_name, tournamentId, team_id]
    );
  }

  return { updated: assignments.length };
};



exports.getScheduledMatchesByTournament = async (tournamentId) => {
  const [rows] = await db.query(
    `SELECT
       tm.id,
       tm.match_id,
       tm.match_no,
       tm.tournament_id,
       tm.stage,
       tm.round_number,
       tm.group_name,
       tm.team1_id,
       tm.team2_id,
       t1.team_name AS team1_name,
       t2.team_name AS team2_name,
       tm.match_date,
       tm.match_time,
       DATE_FORMAT(tm.match_date, '%Y-%m-%d') AS match_date_str,
       DATE_FORMAT(tm.match_time, '%H:%i') AS start_time_str,
       tm.overs,
       tm.duration_minutes,
       tm.venue,
       tm.winner_team_id,
       t.team_name AS winner_team_name,
       tm.status,
       tm.dependent_match1_id,
       tm.dependent_match1_type,
       tm.dependent_match2_id,
       tm.dependent_match2_type,
       tm.created_at,
       tm.updated_at
     FROM tournament_matches tm
     LEFT JOIN teams t ON tm.winner_team_id = t.id
     LEFT JOIN teams t1 ON tm.team1_id = t1.id
     LEFT JOIN teams t2 ON tm.team2_id = t2.id
     WHERE tm.tournament_id = ?
     ORDER BY tm.match_no ASC`,
    [tournamentId]
  );
  return rows;
};


exports.getGroupsWithTeamsForOrganizer = async (organizerAdminId, tournamentId) => {
  // Verify tournament ownership
  const [tournRows] = await db.query(
    `SELECT id FROM tournaments 
     WHERE id = ? AND organizer_admin_id = ?`,
    [tournamentId, organizerAdminId]
  );

  if (!tournRows.length) {
    throw new Error("Tournament not found or access denied");
  }

  // Fetch all teams with assigned groups
  const [rows] = await db.query(
    `SELECT 
       tp.team_id,
       tp.group_name,
       tm.team_name,
       tm.logo
     FROM tournament_participants tp
     JOIN teams tm ON tp.team_id = tm.id
     WHERE tp.tournament_id = ? AND tp.status NOT IN ('cancelled', 'rejected')
     ORDER BY tp.group_name ASC, tm.team_name ASC`,
    [tournamentId]
  );

  // Group into { group_name, teams: [ {id, name, logo} ] }
  const groupsMap = {};
  for (const r of rows) {
    if (!groupsMap[r.group_name]) {
      groupsMap[r.group_name] = { group_name: r.group_name, teams: [] };
    }
    groupsMap[r.group_name].teams.push({
      id: r.team_id,
      name: r.team_name,
      logo: r.logo
    });
  }

  // Always return array of groups (even if empty)
  return Object.values(groupsMap);
};

// services/tournamentService.js
// This creates or updates tournament progress row with default zeros if needed
const PROGRESS_FIELDS = ["teams_created", "groups_created", "schedule_created", "matches_started", "live_match_state"];

exports.createOrUpdateTournamentProgress = async (tournamentId, progressUpdates = {}) => {
  // Default progress fields
  const defaults = {
    teams_created: 0,
    groups_created: 0,
    schedule_created: 0,
    matches_started: 0,
  };

  // Only known progress columns are accepted. Column names must never come straight from the request.
  const unknown = Object.keys(progressUpdates).filter((k) => !PROGRESS_FIELDS.includes(k));
  if (unknown.length) {
    const err = new Error(`Unknown progress field: ${unknown.join(", ")}`);
    err.status = 400;
    throw err;
  }

  // Merge defaults with provided updates
  const allFields = { ...defaults, ...progressUpdates };

  // Convert live_match_state to JSON string if present and not already string
  if ("live_match_state" in allFields) {
    let val = allFields.live_match_state;
    if (typeof val !== "string" || !/^\s*(\{|\"|\[)/.test(val.trim())) {
      allFields.live_match_state = JSON.stringify(val);
    }
  }

  const columns = Object.keys(allFields);
  const values = columns.map(k => allFields[k]);
  const setClause = columns.map(k => `${k} = ?`).join(", ");

  // Try update existing tournament_progress
  const [res] = await db.query(
    `UPDATE tournament_progress SET ${setClause}, last_updated = NOW() WHERE tournament_id = ?`,
    [...values, tournamentId]
  );

  // If no row was updated, insert a new row with defaults + provided fields
  if (res.affectedRows === 0) {
    await db.query(
      `INSERT INTO tournament_progress (tournament_id, ${columns.join(", ")}, last_updated) 
       VALUES (?, ${columns.map(() => "?").join(", ")}, NOW())`,
      [tournamentId, ...values]
    );
  }

  // Return latest tournament_progress row
  const [rows] = await db.query(
    `SELECT * FROM tournament_progress WHERE tournament_id = ?`,
    [tournamentId]
  );
  return rows[0];
};

exports.createTournamentFromSchedule = async (organizerAdminId, data) => {
  const { tentative_id, name, venue, banner_image } = data;

  if (!tentative_id || !name || !venue) {
    throw new Error("All fields (tentative_id, name, venue) are required.");
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. The reserved dates must belong to this team and still be free (locked, so a double click cannot book twice)
    const [schedule] = await conn.query(
      `SELECT * FROM tentative_tournament_schedules
       WHERE id = ? AND organizer_admin_id = ? AND status = 'pending' FOR UPDATE`,
      [tentative_id, organizerAdminId]
    );
    if (!schedule.length) {
      throw new Error("Invalid or unavailable schedule");
    }
    const sched = schedule[0];

    const [teamRows] = await conn.query(`SELECT team_name FROM teams WHERE admin_id = ? LIMIT 1`, [organizerAdminId]);
    const organizingTeam = teamRows.length ? teamRows[0].team_name : null;

    // 2. Insert tournament (32 teams can register; registration closes 4 days before the start)
    const [result] = await conn.query(
      `INSERT INTO tournaments
        (tentative_id, start_date, end_date, organizer_admin_id, name, banner_image, venue, status, organizing_team, total_slots, available_slots, application_deadline, current_step)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, 32, 32, DATE_SUB(?, INTERVAL 4 DAY), 1)`,
      [tentative_id, sched.start_date, sched.end_date, organizerAdminId, name, banner_image, venue, organizingTeam, sched.start_date]
    );
    const tournamentId = result.insertId;

    // 3. Mark the reserved dates as used
    await conn.query(
      `UPDATE tentative_tournament_schedules SET status = 'allocated', tournament_id = ? WHERE id = ?`,
      [tournamentId, tentative_id]
    );

    // 4. Insert initial tournament_progress with zeros
    await conn.query(
      `INSERT INTO tournament_progress
        (tournament_id, teams_created, groups_created, schedule_created, matches_started, last_updated)
       VALUES (?, 0, 0, 0, 0, NOW())`,
      [tournamentId]
    );

    await conn.commit();
    return { tournamentId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};


exports.getTournamentProgress = async (tournamentId) => {
  const [rows] = await db.query(
    `SELECT * FROM tournament_progress WHERE tournament_id = ?`,
    [tournamentId]
  );
  return rows || null;
};