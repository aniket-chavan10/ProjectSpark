import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  LuAward,
  LuBan,
  LuCalendarCog,
  LuCalendarRange,
  LuHandshake,
  LuHistory,
  LuInbox,
  LuLayoutDashboard,
  LuMegaphone,
  LuTrophy,
  LuUserCog,
  LuUsers,
  LuUsersRound,
} from "react-icons/lu";
import AppShell from "../components/layout/AppShell";
import Overview from "../components/MasterAdminDashboard/Overview";
import TeamRequests from "../components/MasterAdminDashboard/TeamRequests";
import TournamentScheduler from "../components/MasterAdminDashboard/TournamentScheduler";
import Announcements from "../components/MasterAdminDashboard/Announcements";
import Bans from "../components/MasterAdminDashboard/Bans";
import RankingPoints from "../components/MasterAdminDashboard/RankingPoints";
import AwardsAdmin from "../components/MasterAdminDashboard/AwardsAdmin";
import SponsorsAdmin from "../components/MasterAdminDashboard/SponsorsAdmin";
import AssociationTeams from "../components/MasterAdminDashboard/AssociationTeams";
import AssociationPlayers from "../components/MasterAdminDashboard/AssociationPlayers";
import AssociationSchedules from "../components/MasterAdminDashboard/AssociationSchedules";
import Hosts from "../components/MasterAdminDashboard/Hosts";
import Results from "../components/MasterAdminDashboard/Results";
import masterAdminApi from "../api/masterAdminApi";

const TITLES = {
  overview: "Overview",
  "all-teams": "Teams",
  hosts: "Hosts",
  results: "Past results",
  teamRequests: "Team requests",
  managePlayers: "Players",
  tournamentManager: "Tournaments",
  schedules: "Season schedule",
  rankings: "Rankings and points",
  awards: "Awards",
  announcements: "Announcements",
  bans: "Bans",
  sponsors: "Sponsors",
};

const MasterAdminDashboard = () => {
  const [active, setActive] = useState("overview");
  const [pending, setPending] = useState(0);
  const [teamFocus, setTeamFocus] = useState(null); // a team to open on the Teams screen (from Players, Hosts ...)
  const navigate = useNavigate();

  const signedIn = !!localStorage.getItem("masterAuthToken");

  useEffect(() => {
    if (!signedIn) return;
    masterAdminApi
      .getAllVillages()
      .then((r) => setPending((r.data || []).filter((v) => v.status === "pending").length))
      .catch(() => {});
  }, [signedIn, active]);

  if (!signedIn) return <Navigate to="/ma-signin" replace />;

  const logout = () => {
    localStorage.removeItem("masterAuthToken");
    navigate("/ma-signin");
  };

  // one way to move between screens; a screen can also ask for a team to be opened
  const go = (screen, teamId) => {
    setTeamFocus(screen === "all-teams" && teamId ? teamId : null);
    setActive(screen);
  };

  const groups = [
    { items: [{ id: "overview", label: "Overview", icon: LuLayoutDashboard }] },
    {
      label: "Members",
      items: [
        { id: "teamRequests", label: "Team requests", icon: LuInbox, badge: pending },
        { id: "all-teams", label: "Teams", icon: LuUsersRound },
        { id: "managePlayers", label: "Players", icon: LuUsers },
      ],
    },
    {
      label: "Competition",
      items: [
        { id: "tournamentManager", label: "Tournaments", icon: LuCalendarCog },
        { id: "hosts", label: "Hosts", icon: LuUserCog },
        { id: "results", label: "Past results", icon: LuHistory },
        { id: "schedules", label: "Season schedule", icon: LuCalendarRange },
        { id: "rankings", label: "Rankings and points", icon: LuTrophy },
        { id: "awards", label: "Awards", icon: LuAward },
      ],
    },
    {
      label: "Communication",
      items: [
        { id: "announcements", label: "Announcements", icon: LuMegaphone },
        { id: "sponsors", label: "Sponsors", icon: LuHandshake },
        { id: "bans", label: "Bans", icon: LuBan },
      ],
    },
  ];

  const screens = {
    overview: <Overview goTo={go} />,
    teamRequests: <TeamRequests />,
    "all-teams": <AssociationTeams key={teamFocus || "list"} goTo={go} focusTeamId={teamFocus} onFocusChange={setTeamFocus} />,
    managePlayers: <AssociationPlayers goTo={go} />,
    hosts: <Hosts onOpenTeam={(id) => go("all-teams", id)} />,
    results: <Results />,
    tournamentManager: <TournamentScheduler />,
    schedules: <AssociationSchedules goTo={go} />,
    rankings: <RankingPoints />,
    awards: <AwardsAdmin />,
    announcements: <Announcements />,
    sponsors: <SponsorsAdmin />,
    bans: <Bans />,
  };

  return (
    <AppShell
      brand={{ name: "Spark", sub: "Association" }}
      groups={groups}
      active={active}
      onSelect={(id) => go(id)}
      user={{ name: "Association", role: "Super admin" }}
      onLogout={logout}
      title={TITLES[active] || "Overview"}
    >
      {screens[active]}
    </AppShell>
  );
};

export default MasterAdminDashboard;
