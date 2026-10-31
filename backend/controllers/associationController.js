// The association head (the master-admin login): announcements, bans, ranking points, season plan.
const db = require("../dbconfigure");
const announcements = require("../services/announcementService");
const bans = require("../services/banService");
const points = require("../services/pointsService");
const fixtureNotifier = require("../services/fixtureNotifier");
const postMatchHooks = require("../services/postMatchHooks");
const awards = require("../services/awardService");
const sponsors = require("../services/sponsorService");
const association = require("../services/associationService");
const { handle, intParam } = require("../utils/handle");

const who = (req) => (req.masterAdmin && (req.masterAdmin.id || req.masterAdmin.adminId)) || null;

exports.listAnnouncements = handle("Could not load the announcements", 200, () => announcements.listAll());
exports.createAnnouncement = handle("Could not post the announcement", 201, (req) => announcements.create(req.body, who(req)));
exports.updateAnnouncement = handle("Could not update the announcement", 200, (req) => announcements.update(intParam(req, "id"), req.body));
exports.deleteAnnouncement = handle("Could not remove the announcement", 200, (req) => announcements.remove(intParam(req, "id")));

exports.listBans = handle("Could not load the bans", 200, (req) => bans.list({ filter: req.query.filter, type: req.query.type }));
exports.searchBanSubjects = handle("Could not search", 200, (req) => bans.searchSubjects(req.query.q));
exports.createBan = handle("Could not save the ban", 201, (req) => bans.create(req.body, who(req)));
exports.revokeBan = handle("Could not revoke the ban", 200, (req) => bans.revoke(intParam(req, "id"), { by: who(req), reason: req.body && req.body.reason }));

exports.getPointsRules = handle("Could not load the points", 200, () => points.getRules());
exports.updatePointsRules = handle("Could not save the points", 200, (req) => points.updateRules(req.body && req.body.rules));
// re-run every finished match with the current rules (also fills in matches finished before this feature existed)
exports.recalculate = handle("Could not recalculate", 200, () => postMatchHooks.rebuildAll(db));

exports.releaseSeasonPlan = handle("Could not release the season plan", 200, () => fixtureNotifier.seasonPlanReleased());

/* ---------------------------------- awards ---------------------------------- */
exports.awardSeasons = handle("Could not load the seasons", 200, () => awards.seasons());
exports.listAwards = handle("Could not load the awards", 200, (req) => awards.list(req.query.season));
exports.generateAwards = handle("Could not work out the awards", 200, (req) => awards.generate(req.body && req.body.season));
exports.setAwardWinner = handle("Could not change the winner", 200, (req) => awards.setWinner({ ...req.body, awardKey: req.params.key }, who(req)));
exports.confirmAwards = handle("Could not confirm the awards", 200, (req) => awards.confirm(req.body && req.body.season, req.body && req.body.keys));
exports.publishAwards = handle("Could not publish the awards", 200, (req) => awards.publish(req.body && req.body.season));
exports.unpublishAwards = handle("Could not take the awards down", 200, (req) => awards.unpublish(req.body && req.body.season));

/* --------------------------------- sponsors --------------------------------- */
const logoOf = (req) => (req.file ? `uploads/${req.file.filename}` : null);
exports.listSponsors = handle("Could not load the sponsors", 200, () => sponsors.listAll());
exports.createSponsor = handle("Could not add the sponsor", 201, (req) => sponsors.create(req.body, logoOf(req)));
exports.updateSponsor = handle("Could not update the sponsor", 200, (req) => sponsors.update(intParam(req, "id"), req.body, logoOf(req)));
exports.removeSponsor = handle("Could not remove the sponsor", 200, (req) => sponsors.remove(intParam(req, "id")));

/* ------------------------- everything the association sees ------------------------- */
exports.allTeams = handle("Could not load the teams", 200, (req) => association.teams({ q: req.query.q }));
exports.allPlayers = handle("Could not load the players", 200, (req) => association.players(req.query));
exports.allSchedules = handle("Could not load the schedules", 200, (req) => association.schedules(req.query));
exports.moveReservation = handle("Could not move the dates", 200, (req) => association.moveReservation(intParam(req, "id"), req.body || {}));
exports.cancelReservation = handle("Could not cancel the dates", 200, (req) => association.cancelReservation(intParam(req, "id"), req.body && req.body.reason));
