const db = require("../dbconfigure");


// services/tournamentService.js
exports.createTournamentFromSchedule = async (organizerAdminId, data) => {
  const { tentative_id, name, venue, banner_image } = data;

  // 1. Verify schedule belongs to admin
  const [schedule] = await db.query(
    `SELECT * FROM tentative_tournament_schedules 
     WHERE id = ? AND organizer_admin_id = ? AND status = 'pending'`,
    [tentative_id, organizerAdminId]
  );

  if (!schedule.length) {
    throw new Error('Invalid or unavailable schedule');
  }

  const sched = schedule[0];

  // 2. Insert tournament
  const [result] = await db.query(
    `INSERT INTO tournaments 
      (tentative_id, start_date, end_date, organizer_admin_id, name, banner_image, venue, status, organizing_team, total_slots, available_slots, application_deadline, current_step) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, 32, 32, DATE_SUB(?, INTERVAL 4 DAY), 1)`,
    [
      tentative_id,
      sched.start_date,
      sched.end_date,
      organizerAdminId,
      name,
      banner_image,
      venue,
      'My Team Name', // could be pulled dynamically if mapping to org
      sched.start_date
    ]
  );

  const tournamentId = result.insertId;

  await db.query(
    `UPDATE tentative_tournament_schedules SET status = 'allocated', tournament_id = ? WHERE id = ?`,
    [tournamentId, tentative_id]
  );

  return { tournamentId };
};

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



exports.scheduleKnockoutMatches = async (tournamentId, inputMatches) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch tournament details: start_date, end_date, venue
    const [tournamentRows] = await connection.query(
      `SELECT start_date, end_date, venue FROM tournaments WHERE id = ?`,
      [tournamentId]
    );
    if (!tournamentRows.length) throw new Error("Tournament not found");
    const { start_date, end_date, venue: tournamentVenue } = tournamentRows[0];

    // Clear existing matches
    await connection.query(`DELETE FROM tournament_matches WHERE tournament_id = ?`, [tournamentId]);

    const matchIdMap = {}; // map match_no → db id

    // Step 1: Insert matches 
    for (const match of inputMatches) {
      let team1Id = null;
      let team2Id = null;

      if (match.team1Id != null && !isNaN(match.team1Id)) team1Id = Number(match.team1Id);
      if (match.team2Id != null && !isNaN(match.team2Id)) team2Id = Number(match.team2Id);

      // Validate and clamp match_date within tournament start and end date
      let matchDate = null;
      if (match.match_date) {
        const d = new Date(match.match_date);
        const start = new Date(start_date);
        const end = new Date(end_date);

        if (d < start) {
          matchDate = start_date;
        } else if (d > end) {
          matchDate = end_date;
        } else {
          matchDate = match.match_date;
        }
      }

      // Prepare full datetime for match_time
      let matchTimeFull = null;
      if (matchTimeIsFullISO(match.match_time)) {
        // if time is already ISO datetime (e.g. from frontend)
        matchTimeFull = match.match_time;
      } else if (match.match_time && matchDate) {
        // Compose datetime from date + time like 'YYYY-MM-DD HH:mm:ss'
        matchTimeFull = `${matchDate} ${match.match_time}:00`;
      }

      // Use venue from tournament if not provided per match
      const matchVenue = match.venue && match.venue.trim() !== '' ? match.venue : tournamentVenue;

      const [res] = await connection.query(
        `INSERT INTO tournament_matches
         (match_no, tournament_id, round_number, group_name,
          team1_id, team2_id, match_date, match_time, venue,
          dependent_match1_id, dependent_match2_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'scheduled')`,
        [
          match.match_no,
          tournamentId,
          match.round,
          match.group || null,
          team1Id,
          team2Id,
          matchDate || null,
          matchTimeFull || null,
          matchVenue || null,
        ]
      );

      matchIdMap[match.match_no] = res.insertId;
    }

    // Step 2: Update dependencies
    for (const match of inputMatches) {
      let dep1Id = null;
      let dep2Id = null;

      if (typeof match.team1Id === 'string' && match.team1Id.toLowerCase().startsWith('winner of match')) {
        const depMatchNo = parseInt(match.team1Id.replace(/\D/g, ''), 10);
        dep1Id = matchIdMap[depMatchNo];
      }
      if (typeof match.team2Id === 'string' && match.team2Id.toLowerCase().startsWith('winner of match')) {
        const depMatchNo = parseInt(match.team2Id.replace(/\D/g, ''), 10);
        dep2Id = matchIdMap[depMatchNo];
      }

      if (dep1Id || dep2Id) {
        await connection.query(
          `UPDATE tournament_matches
           SET dependent_match1_id = ?, dependent_match2_id = ?
           WHERE tournament_id = ? AND match_no = ?`,
          [dep1Id, dep2Id, tournamentId, match.match_no]
        );
      }
    }

    await connection.commit();

    const [saved] = await connection.query(
      `SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY match_no ASC`,
      [tournamentId]
    );
    return saved;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Utility helper: check if match_time is full ISO datetime string
function matchTimeIsFullISO(timeStr) {
  if (!timeStr) return false;
  // Quick check for YYYY-MM-DD part (ISO format)
  return /^\d{4}-\d{2}-\d{2}/.test(timeStr);
}


exports.getScheduledMatchesByTournament = async (tournamentId) => {
  const [rows] = await db.query(
    `SELECT
       tm.id,
       tm.match_no,
       tm.tournament_id,
       tm.round_number,
       tm.group_name,
       tm.team1_id,
       tm.team2_id,
       tm.match_date,
       tm.match_time,
       tm.venue,
       tm.winner_team_id,
       t.team_name AS winner_team_name,
       tm.status,
       tm.dependent_match1_id,
       tm.dependent_match2_id,
       tm.created_at,
       tm.updated_at
     FROM tournament_matches tm
     LEFT JOIN teams t ON tm.winner_team_id = t.id
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
     WHERE tp.tournament_id = ?
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
exports.createOrUpdateTournamentProgress = async (tournamentId, progressUpdates = {}) => {
  // Default progress fields
  const defaults = {
    teams_created: 0,
    groups_created: 0,
    schedule_created: 0,
    matches_started: 0,
  };

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

  // 1. Verify schedule belongs to admin
  const [schedule] = await db.query(
    `SELECT * FROM tentative_tournament_schedules 
     WHERE id = ? AND organizer_admin_id = ? AND status = 'pending'`,
    [tentative_id, organizerAdminId]
  );

  if (!schedule.length) {
    throw new Error("Invalid or unavailable schedule");
  }

  const sched = schedule[0];

  // 2. Insert tournament
  const [result] = await db.query(
    `INSERT INTO tournaments 
      (tentative_id, start_date, end_date, organizer_admin_id, name, banner_image, venue, status, organizing_team, total_slots, available_slots, application_deadline, current_step) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, 32, 32, DATE_SUB(?, INTERVAL 4 DAY), 1)`,
    [
      tentative_id,
      sched.start_date,
      sched.end_date,
      organizerAdminId,
      name,
      banner_image,
      venue,
      'My Team Name', // Adjust if needed
      sched.start_date,
    ]
  );

  const tournamentId = result.insertId;

  // 3. Update tentative schedule status
  await db.query(
    `UPDATE tentative_tournament_schedules SET status = 'allocated', tournament_id = ? WHERE id = ?`,
    [tournamentId, tentative_id]
  );

  // 4. Insert initial tournament_progress with zeros
  await db.query(
    `INSERT INTO tournament_progress 
      (tournament_id, teams_created, groups_created, schedule_created, matches_started, last_updated) 
     VALUES (?, 0, 0, 0, 0, NOW())`,
    [tournamentId]
  );

  return { tournamentId };
};


exports.getTournamentProgress = async (tournamentId) => {
  const [rows] = await db.query(
    `SELECT * FROM tournament_progress WHERE tournament_id = ?`,
    [tournamentId]
  );
  return rows || null;
};