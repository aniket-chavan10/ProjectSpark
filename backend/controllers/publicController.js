// The public site: no login. Only finished matches are published.
const publicService = require("../services/publicService");
const playerRanking = require("../services/playerRankingService");
const announcements = require("../services/announcementService");
const awards = require("../services/awardService");
const sponsors = require("../services/sponsorService");
const ratings = require("../services/ratingService");
const { handle, intParam } = require("../utils/handle");

exports.overview = handle("Could not load the home page", 200, () => publicService.overview());
exports.announcements = handle("Could not load the announcements", 200, () => announcements.listActive(20));

exports.teams = handle("Could not load the teams", 200, (req) => publicService.teams({ q: req.query.q }));
exports.team = handle("Could not load the team", 200, (req) => publicService.teamProfile(intParam(req, "id")));

exports.tournaments = handle("Could not load the tournaments", 200, (req) => publicService.tournaments({ q: req.query.q, season: req.query.season }));
exports.tournament = handle("Could not load the tournament", 200, (req) => publicService.tournamentDetail(intParam(req, "id")));

exports.matches = handle("Could not load the results", 200, (req) =>
  publicService.matches({ q: req.query.q, tournamentId: req.query.tournamentId, teamId: req.query.teamId, page: req.query.page, pageSize: req.query.pageSize })
);
exports.match = handle("Could not load the scorecard", 200, (req) => publicService.matchDetail(intParam(req, "id")));
exports.upcoming = handle("Could not load the fixtures", 200, (req) => publicService.upcoming({ limit: req.query.limit, teamId: req.query.teamId }));

exports.teamRankings = handle("Could not load the rankings", 200, (req) => publicService.rankings({ scope: "teams", season: req.query.season }));
exports.playerRankings = handle("Could not load the rankings", 200, (req) =>
  publicService.rankings({ scope: "players", season: req.query.season, category: req.query.category })
);
exports.player = handle("Could not load the player", 200, async (req) => {
  const p = await playerRanking.profile(intParam(req, "id"), { season: req.query.season });
  if (!p) {
    const { ScoringError } = require("../utils/errors");
    throw new ScoringError("Player not found", 404);
  }
  // ratings are an extra: a failure there must not hide the profile
  let rating = null;
  try {
    rating = await ratings.forPlayer(p.playerId, { season: req.query.season });
  } catch {
    rating = null;
  }
  return { ...p, rating };
});

exports.awards = handle("Could not load the awards", 200, async (req) => {
  const seasons = await awards.seasons(true);
  const season = Number(req.query.season) || seasons[0];
  return { seasons, ...(season ? await awards.list(season, { publishedOnly: true }) : { season: null, awards: [] }) };
});
exports.sponsors = handle("Could not load the sponsors", 200, (req) => sponsors.listPublic(req.query.placement));
exports.playerRatings = handle("Could not load the ratings", 200, async (req) => ({
  category: req.query.category || "overall",
  season: Number(req.query.season) || null,
  items: await ratings.leaderboard({ category: req.query.category, season: req.query.season, limit: 50 }),
}));
