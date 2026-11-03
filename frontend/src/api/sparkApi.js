// Calls for the public site, the overlay desk, the team's news and the association's tools.
// Every call returns the data or throws an Error whose message is the reason the server gave.
import axios from "axios";
import axiosInstance from "./axiosConfig";

// The association head signs in as the master admin, whose token is kept apart from a team admin's.
const masterAxios = axios.create({ baseURL: axiosInstance.defaults.baseURL, headers: { "Content-Type": "application/json" } });
masterAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("masterAuthToken") || localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const run = async (promise) => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    const data = err.response?.data;
    const message = data?.message || data?.error || err.message || "Something went wrong";
    throw Object.assign(new Error(message), { status: err.response?.status });
  }
};

const get = (url, params) => run(axiosInstance.get(url, { params }));
const masterGet = (url, params) => run(masterAxios.get(url, { params }));

/** Public site: no login needed. */
export const publicApi = {
  overview: () => get("/public/overview"),
  announcements: () => get("/public/announcements"),
  teams: (q) => get("/public/teams", { q }),
  team: (id) => get(`/public/teams/${id}`),
  tournaments: (params) => get("/public/tournaments", params),
  tournament: (id) => get(`/public/tournaments/${id}`),
  matches: (params) => get("/public/matches", params),
  match: (id) => get(`/public/matches/${id}`),
  fixtures: (params) => get("/public/fixtures", params),
  teamRankings: (season) => get("/public/rankings/teams", { season }),
  playerRankings: (category, season) => get("/public/rankings/players", { category, season }),
  player: (id) => get(`/public/players/${id}`),
  ratings: (category, season) => get("/public/rankings/ratings", { category, season }),
  awards: (season) => get("/public/awards", { season }),
  sponsors: (placement) => get("/public/sponsors", { placement }),
};

/** The overlay desk (operator) and what the broadcast screen reads. */
export const overlayApi = {
  get: (matchId) => get(`/overlay/${matchId}`),
  setScene: (matchId, body) => run(axiosInstance.put(`/overlay/${matchId}/scene`, body)),
  setPlayerOfMatch: (matchId, playerId) => run(axiosInstance.put(`/overlay/${matchId}/player-of-match`, { playerId })),
  /** The scorer (logged in) makes a link; its key lets one person run this match's overlay and nothing else. */
  createOperatorLink: (matchId) => run(axiosInstance.post(`/overlay/${matchId}/operator-link`)),
};

/**
 * The overlay operator's calls. They carry the key from the operator link, so the operator needs no login.
 * Without a key (a scorer who opened the console while logged in) the normal login token is used.
 */
export const operatorApi = (key) => {
  const client = axios.create({ baseURL: axiosInstance.defaults.baseURL, headers: { "Content-Type": "application/json" } });
  client.interceptors.request.use((config) => {
    const token = key || localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return {
    get: (matchId) => run(client.get(`/overlay/${matchId}`)),
    setScene: (matchId, body) => run(client.put(`/overlay/${matchId}/scene`, body)),
    setPlayerOfMatch: (matchId, playerId) => run(client.put(`/overlay/${matchId}/player-of-match`, { playerId })),
  };
};

/** Settling a tied match, and the tournament's tie rules (host). */
export const tieBreakApi = {
  status: (matchId) => get(`/match/${matchId}/tiebreak`),
  resolve: (matchId, body) => run(axiosInstance.post(`/match/${matchId}/tiebreak`, body)),
  // the super over, played ball by ball (every call answers { superOver } and tells the stream)
  startSuperOver: (matchId) => run(axiosInstance.post(`/match/${matchId}/super-over/start`)),
  superOverBall: (matchId, body) => run(axiosInstance.post(`/match/${matchId}/super-over/ball`, body)),
  undoSuperOverBall: (matchId) => run(axiosInstance.post(`/match/${matchId}/super-over/undo`)),
  setSuperOverPlayers: (matchId, body) => run(axiosInstance.put(`/match/${matchId}/super-over/players`, body)),
  nextSuperOver: (matchId) => run(axiosInstance.post(`/match/${matchId}/super-over/next`)),
  confirmSuperOver: (matchId) => run(axiosInstance.post(`/match/${matchId}/super-over/confirm`)),
  removeSuperOver: (matchId) => run(axiosInstance.delete(`/match/${matchId}/super-over`)),
  getRules: (tournamentId) => get(`/tournament/tournaments/${tournamentId}/tie-rules`),
  setRules: (tournamentId, body) => run(axiosInstance.put(`/tournament/tournaments/${tournamentId}/tie-rules`, body)),
};

/** What a team sees about itself: notifications, announcements, its standing. */
export const teamNewsApi = {
  rankings: (season) => get("/team-admin/rankings", { season }),
  notifications: (params) => get("/team-admin/notifications", params),
  markRead: (ids) => run(axiosInstance.post("/team-admin/notifications/read", { ids })),
  announcements: () => get("/team-admin/announcements"),
  overview: () => get("/team-admin/overview"),
};

/** The association head (master admin login). */
export const associationApi = {
  announcements: () => masterGet("/association/announcements"),
  postAnnouncement: (body) => run(masterAxios.post("/association/announcements", body)),
  updateAnnouncement: (id, body) => run(masterAxios.put(`/association/announcements/${id}`, body)),
  removeAnnouncement: (id) => run(masterAxios.delete(`/association/announcements/${id}`)),

  bans: (params) => masterGet("/association/bans", params),
  searchBanSubjects: (q) => masterGet("/association/bans/search", { q }),
  ban: (body) => run(masterAxios.post("/association/bans", body)),
  revokeBan: (id, reason) => run(masterAxios.post(`/association/bans/${id}/revoke`, { reason })),

  pointsRules: () => masterGet("/association/points/rules"),
  savePointsRules: (rules) => run(masterAxios.put("/association/points/rules", { rules })),
  recalculate: () => run(masterAxios.post("/association/points/recalculate")),
  releaseSeasonPlan: () => run(masterAxios.post("/association/season-plan/release")),
  moveReservation: (id, body) => run(masterAxios.put(`/association/season-plan/${id}`, body)),
  cancelReservation: (id, reason) => run(masterAxios.post(`/association/season-plan/${id}/cancel`, { reason })),

  awardSeasons: () => masterGet("/association/awards/seasons"),
  awards: (season) => masterGet("/association/awards", { season }),
  generateAwards: (season) => run(masterAxios.post("/association/awards/generate", { season })),
  setAwardWinner: (key, body) => run(masterAxios.put(`/association/awards/${key}`, body)),
  confirmAwards: (season, keys) => run(masterAxios.post("/association/awards/confirm", { season, keys })),
  publishAwards: (season) => run(masterAxios.post("/association/awards/publish", { season })),
  unpublishAwards: (season) => run(masterAxios.post("/association/awards/unpublish", { season })),

  sponsors: () => masterGet("/association/sponsors"),
  saveSponsor: (id, form) => run(id ? masterAxios.put(`/association/sponsors/${id}`, form, multipart) : masterAxios.post("/association/sponsors", form, multipart)),
  removeSponsor: (id) => run(masterAxios.delete(`/association/sponsors/${id}`)),

  dashboard: () => masterGet("/association/dashboard"),
  hosts: () => masterGet("/association/hosts"),
  team: (id) => masterGet(`/association/teams/${id}`),
  teams: (q) => masterGet("/association/teams", { q }),
  players: (params) => masterGet("/association/players", params),
  schedules: (params) => masterGet("/association/schedules", params),
};

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export { fileUrl } from "../utils/files";

export const shortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
