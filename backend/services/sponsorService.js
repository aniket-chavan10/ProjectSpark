const dateOnly = require("../utils/dateOnly");
// Sponsors of the association, shown on the public pages. Each sponsor has a tier (how prominent), the places it
// appears (home page, footer strip, results pages, awards page) and an optional start and end date.

const db = require("../dbconfigure");
const { ScoringError } = require("../utils/errors");

const TIERS = ["title", "gold", "silver", "partner"];
const PLACEMENTS = ["home", "footer", "results", "awards"];

const shape = (r) => ({
  id: r.id,
  name: r.name,
  logo: r.logo || null,
  link: r.link_url || null,
  tagline: r.tagline || null,
  tier: r.tier,
  placements: String(r.placements || "").split(",").filter(Boolean),
  startsOn: dateOnly(r.starts_on),
  endsOn: dateOnly(r.ends_on),
  order: r.sort_order,
  active: !!r.active,
});

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s));

function clean(input) {
  const name = String(input.name || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) throw new ScoringError("Enter the sponsor's name");
  let link = String(input.link || "").trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) {
    try {
      new URL(link);
    } catch {
      throw new ScoringError("That website address does not look right");
    }
  }
  const tier = TIERS.includes(input.tier) ? input.tier : "partner";
  const wanted = (Array.isArray(input.placements) ? input.placements : String(input.placements || "").split(",")).map((p) => String(p).trim());
  const placements = PLACEMENTS.filter((p) => wanted.includes(p));
  if (!placements.length) throw new ScoringError("Choose where the sponsor is shown");
  const startsOn = input.startsOn || null;
  const endsOn = input.endsOn || null;
  if ((startsOn && !isDate(startsOn)) || (endsOn && !isDate(endsOn))) throw new ScoringError("A date is not valid");
  if (startsOn && endsOn && endsOn < startsOn) throw new ScoringError("The end date is before the start date");
  const order = Number.isInteger(Number(input.order)) ? Number(input.order) : 0;
  return {
    name, link: link || null, tagline: String(input.tagline || "").trim().slice(0, 160) || null,
    tier, placements: placements.join(","), startsOn, endsOn, order, active: input.active === false || input.active === "false" || input.active === "0" ? 0 : 1,
  };
}

const TIER_ORDER = `FIELD(tier, 'title', 'gold', 'silver', 'partner')`;

/** Everything, for the association. */
exports.listAll = async () => {
  const [rows] = await db.query(`SELECT * FROM sponsors WHERE deleted_at IS NULL ORDER BY ${TIER_ORDER}, sort_order, name`);
  return rows.map(shape);
};

/** Sponsors to show right now, optionally only for one placement. */
exports.listPublic = async (placement) => {
  const where = [`deleted_at IS NULL`, `active = 1`, `(starts_on IS NULL OR starts_on <= CURDATE())`, `(ends_on IS NULL OR ends_on >= CURDATE())`];
  const params = [];
  if (PLACEMENTS.includes(placement)) {
    where.push(`FIND_IN_SET(?, placements) > 0`);
    params.push(placement);
  }
  const [rows] = await db.query(`SELECT * FROM sponsors WHERE ${where.join(" AND ")} ORDER BY ${TIER_ORDER}, sort_order, name`, params);
  return rows.map(shape).map(({ active, startsOn, endsOn, ...open }) => open);
};

exports.create = async (input, logoPath) => {
  const d = clean(input);
  const [res] = await db.query(
    `INSERT INTO sponsors (name, logo, link_url, tagline, tier, placements, starts_on, ends_on, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.name, logoPath || null, d.link, d.tagline, d.tier, d.placements, d.startsOn, d.endsOn, d.order, d.active]
  );
  return { id: res.insertId };
};

exports.update = async (id, input, logoPath) => {
  const d = clean(input);
  const [res] = await db.query(
    `UPDATE sponsors SET name = ?, link_url = ?, tagline = ?, tier = ?, placements = ?, starts_on = ?, ends_on = ?, sort_order = ?, active = ?,
       logo = COALESCE(?, logo) WHERE id = ? AND deleted_at IS NULL`,
    [d.name, d.link, d.tagline, d.tier, d.placements, d.startsOn, d.endsOn, d.order, d.active, logoPath || null, id]
  );
  if (!res.affectedRows) throw new ScoringError("Sponsor not found", 404);
  return { id: Number(id) };
};

exports.remove = async (id) => {
  const [res] = await db.query(`UPDATE sponsors SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!res.affectedRows) throw new ScoringError("Sponsor not found", 404);
  return { removed: Number(id) };
};

exports.TIERS = TIERS;
exports.PLACEMENTS = PLACEMENTS;
exports.clean = clean;
