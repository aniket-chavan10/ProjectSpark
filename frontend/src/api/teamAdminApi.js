// What a team's admin (the team representative) does for their own team: players and squads.
// The team always comes from the login token, so none of these calls names a team.
// Every call either returns the data or throws an Error whose message is the reason the server gave.
import axiosInstance from "./axiosConfig";

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

// a player form with an optional photo goes up as multipart
const playerForm = ({ name, mobile, email, photo }) => {
  const form = new FormData();
  form.append("name", name);
  form.append("mobile", mobile);
  form.append("email", email || "");
  if (photo) form.append("profile_picture", photo);
  return form;
};
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

/** Uploaded photos are served by the backend next to the API. */
export const photoUrl = (path) => {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  const origin = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");
  return `${origin}/${String(path).replace(/^\/+/, "")}`;
};

const teamAdminApi = {
  // players of my team
  listPlayers: () => run(axiosInstance.get("/team-admin/players")),
  addPlayer: (player) => run(axiosInstance.post("/team-admin/players", playerForm(player), multipart)),
  updatePlayer: (id, player) => run(axiosInstance.put(`/team-admin/players/${id}`, playerForm(player), multipart)),
  removePlayer: (id) => run(axiosInstance.delete(`/team-admin/players/${id}`)),

  // tournaments my team is in, my fixtures there, and the squad (playing XI + reserves)
  myTournaments: () => run(axiosInstance.get("/team-admin/tournaments")),
  myMatches: (tournamentId) => run(axiosInstance.get(`/team-admin/tournaments/${tournamentId}/matches`)),
  getTournamentSquad: (tournamentId) => run(axiosInstance.get(`/team-admin/tournaments/${tournamentId}/squad`)),
  saveTournamentSquad: (tournamentId, squad) => run(axiosInstance.put(`/team-admin/tournaments/${tournamentId}/squad`, squad)),

  // the squad for one match (changeable until the toss)
  getMatchSquad: (fixtureId) => run(axiosInstance.get(`/team-admin/matches/${fixtureId}/squad`)),
  saveMatchSquad: (fixtureId, squad) => run(axiosInstance.put(`/team-admin/matches/${fixtureId}/squad`, squad)),
  resetMatchSquad: (fixtureId) => run(axiosInstance.delete(`/team-admin/matches/${fixtureId}/squad`)),
};

export default teamAdminApi;
