const dateOnly = require("../utils/dateOnly");
// Announcements from the association head. Every team sees the active ones on its dashboard,
// the public site shows them too, and each team also gets a notification when a new one is posted.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");
const notifications = require("./notificationService");

const ACTIVE = `deleted_at IS NULL AND (expires_on IS NULL OR expires_on >= CURDATE())`;

const card = (r) => ({
  id: r.id,
  title: r.title,
  body: r.body,
  pinned: !!r.pinned,
  expiresOn: dateOnly(r.expires_on),
  createdAt: r.created_at,
});

function clean(input) {
  const title = String(input.title || "").trim().replace(/\s+/g, " ");
  const body = String(input.body || "").trim();
  if (title.length < 3 || title.length > 150) throw new ScoringError("Give the announcement a title (3 to 150 letters)");
  if (body.length < 3 || body.length > 4000) throw new ScoringError("Write the announcement (up to 4000 letters)");
  let expiresOn = null;
  if (input.expiresOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.expiresOn)) || Number.isNaN(Date.parse(input.expiresOn))) throw new ScoringError("The end date is not a valid date");
    expiresOn = String(input.expiresOn);
  }
  return { title, body, pinned: input.pinned ? 1 : 0, expiresOn };
}

/** What teams and the public see: pinned first, newest first. */
exports.listActive = async (limit = 20) => {
  const [rows] = await db.query(`SELECT id, title, body, pinned, expires_on, created_at FROM announcements WHERE ${ACTIVE} ORDER BY pinned DESC, created_at DESC, id DESC LIMIT ?`, [Math.min(Number(limit) || 20, 100)]);
  return rows.map(card);
};

/** The association's own list: includes expired ones. */
exports.listAll = async () => {
  const [rows] = await db.query(`SELECT id, title, body, pinned, expires_on, created_at FROM announcements WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 200`);
  return rows.map((r) => ({ ...card(r), expired: !!r.expires_on && new Date(r.expires_on) < new Date(new Date().toDateString()) }));
};

exports.create = async (input, createdBy) => {
  const d = clean(input);
  const [res] = await db.query(`INSERT INTO announcements (title, body, pinned, expires_on, created_by) VALUES (?, ?, ?, ?, ?)`, [d.title, d.body, d.pinned, d.expiresOn, createdBy || null]);
  // a short note in every team's bell; the full text is on the dashboard
  try {
    await notifications.notifyTeams(db, await notifications.allTeamIds(db), {
      type: "announcement",
      title: `Announcement: ${d.title}`,
      body: d.body.length > 200 ? `${d.body.slice(0, 197)}...` : d.body,
      link: "announcements",
      dedupeKey: `announcement:${res.insertId}`,
    });
  } catch (err) {
    console.error("Announcement saved, but the notifications could not be sent", err.message);
  }
  return { id: res.insertId, ...d };
};

exports.update = async (id, input) => {
  const d = clean(input);
  const [res] = await db.query(`UPDATE announcements SET title = ?, body = ?, pinned = ?, expires_on = ? WHERE id = ? AND deleted_at IS NULL`, [d.title, d.body, d.pinned, d.expiresOn, id]);
  if (!res.affectedRows) throw new ScoringError("Announcement not found", 404);
  return { id: Number(id), ...d };
};

exports.remove = async (id) => {
  const [res] = await db.query(`UPDATE announcements SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!res.affectedRows) throw new ScoringError("Announcement not found", 404);
  return { removed: Number(id) };
};
