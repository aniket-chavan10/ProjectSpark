import React, { useCallback, useEffect, useState } from "react";
import jwt_decode from "jwt-decode";
import { useNavigate } from "react-router-dom";
import {
  LuBell,
  LuCalendarCog,
  LuClipboardList,
  LuFilePlus,
  LuLayoutDashboard,
  LuMail,
  LuShirt,
  LuTrophy,
  LuUserCog,
  LuUsers,
} from "react-icons/lu";

import AppShell from "../components/layout/AppShell";
import Dashboard from "../components/AdminDashboard/Dashboard";
import Profile from "../components/AdminDashboard/Profile";
import Alerts from "../components/AdminDashboard/Alerts";
import TeamResults from "../components/AdminDashboard/TeamResults";
import TeamRankings from "../components/AdminDashboard/TeamRankings";
import Invitation from "../components/AdminDashboard/Invitation";
import PlayersScreen from "../components/AdminDashboard/Team/PlayersScreen";
import SquadScreen from "../components/AdminDashboard/Team/SquadScreen";
import DesktopOnly from "../components/ui/DesktopOnly";
import OrganizerDashboard from "../components/AdminDashboard/Organizer/OrganizerFlow";
import ApplyTournament from "../components/AdminDashboard/ApplyTournament";
import { teamNewsApi } from "../api/sparkApi";
import { useAuth } from "../contexts/AuthContext";

const TITLES = {
  dashboard: "Dashboard",
  organize: "Organize a tournament",
  apply: "Apply to a tournament",
  invitations: "Invitations",
  profile: "Team profile",
  players: "My players",
  squad: "My squad",
  alerts: "Notifications",
  results: "Results",
  rankings: "Rankings",
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [unread, setUnread] = useState(0);
  const [openMatchId, setOpenMatchId] = useState(null);
  const [team, setTeam] = useState(null);
  const [organizeTarget, setOrganizeTarget] = useState(null); // { id, step } : open Organize on this tournament
  const navigate = useNavigate();
  const { logout } = useAuth();

  // the team comes from the login token; the bell shows how many notifications are new
  let teamId = null;
  try {
    teamId = Number(jwt_decode(localStorage.getItem("authToken")).team_id) || null;
  } catch {
    teamId = null;
  }

  useEffect(() => {
    let alive = true;
    const check = () => teamNewsApi.notifications({ limit: 1 }).then((d) => alive && setUnread(d.unread)).catch(() => {});
    check();
    const timer = setInterval(check, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const loadTeam = useCallback(() => teamNewsApi.overview().then(setTeam).catch(() => {}), []);
  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const openMatch = (matchId) => {
    setOpenMatchId(matchId);
    setActiveSection("results");
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem("authToken");
    navigate("/");
  };

  const goTo = (sectionId) => setActiveSection(sectionId);

  const manageTournament = (id, step) => {
    setOrganizeTarget({ id, step });
    setActiveSection("organize");
  };

  const desktopOnly = (what, node) => (
    <DesktopOnly what={what} alt={{ label: "Go to My squad", onClick: () => setActiveSection("squad") }}>
      {node}
    </DesktopOnly>
  );

  const sectionComponents = {
    dashboard: <Dashboard overview={team} unread={unread} onOpenMatch={openMatch} goTo={goTo} onManage={manageTournament} />,
    // scheduling and managing a tournament needs a big screen
    organize: desktopOnly("Organizing a tournament", <OrganizerDashboard initial={organizeTarget} onConsumed={() => setOrganizeTarget(null)} />),
    apply: <ApplyTournament />,
    invitations: <Invitation />,
    profile: <Profile team={team} onChanged={loadTeam} />,
    players: <PlayersScreen />,
    squad: <SquadScreen goToPlayers={() => setActiveSection("players")} />,
    alerts: <Alerts onOpenMatch={openMatch} onUnread={setUnread} goTo={setActiveSection} />,
    rankings: <TeamRankings teamId={teamId} />,
    results: <TeamResults teamId={teamId} openMatchId={openMatchId} clearOpen={() => setOpenMatchId(null)} />,
  };

  const groups = [
    { items: [{ id: "dashboard", label: "Dashboard", icon: LuLayoutDashboard }] },
    {
      label: "My team",
      items: [
        { id: "squad", label: "Squad", icon: LuShirt },
        { id: "players", label: "Players", icon: LuUsers },
        { id: "results", label: "Results", icon: LuClipboardList },
        { id: "rankings", label: "Rankings", icon: LuTrophy },
        { id: "profile", label: "Team profile", icon: LuUserCog },
      ],
    },
    {
      label: "Tournaments",
      items: [
        { id: "organize", label: "Organize", icon: LuCalendarCog, note: "Computer" },
        { id: "apply", label: "Apply", icon: LuFilePlus },
        { id: "invitations", label: "Invitations", icon: LuMail },
      ],
    },
    { label: "Inbox", items: [{ id: "alerts", label: "Notifications", icon: LuBell, badge: unread }] },
  ];

  const bottomTabs = [
    { id: "dashboard", label: "Home", icon: LuLayoutDashboard },
    { id: "players", label: "Players", icon: LuUsers },
    { id: "squad", label: "Squad", icon: LuShirt },
    { id: "results", label: "Results", icon: LuClipboardList },
    { id: "alerts", label: "News", icon: LuBell, badge: unread },
  ];

  return (
    <AppShell
      brand={{ name: "Spark", sub: "Team admin" }}
      groups={groups}
      active={activeSection}
      onSelect={(id) => setActiveSection(id)}
      user={{ name: team ? team.name : "Team admin", role: "Team representative" }}
      onLogout={handleLogout}
      title={TITLES[activeSection] || "Dashboard"}
      bottomTabs={bottomTabs}
    >
      {sectionComponents[activeSection]}
    </AppShell>
  );
};

export default AdminDashboard;
