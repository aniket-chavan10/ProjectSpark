import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LogInPage";
import Home from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import MasterAdminDashboard from "./pages/MasterAdminDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import SignInMasterAdmin from "./pages/SignInMasterAdmin";
import MatchRoom from "./pages/match/MatchRoom";
import OverlayPage from "./pages/overlay/OverlayPage";
import OperatorConsole from "./pages/operator/OperatorConsole";
import ResultsPage from "./pages/public/ResultsPage";
import MatchPage from "./pages/public/MatchPage";
import TeamsPage from "./pages/public/TeamsPage";
import TeamPage from "./pages/public/TeamPage";
import TournamentsPage from "./pages/public/TournamentsPage";
import TournamentPage from "./pages/public/TournamentPage";
import RankingsPage from "./pages/public/RankingsPage";
import PlayerPage from "./pages/public/PlayerPage";
import AwardsPage from "./pages/public/AwardsPage";
import AwardShow from "./pages/public/AwardShow";
import { AuthProvider } from "./contexts/AuthContext";
import { TournamentProvider } from "./contexts/TournamentContext";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/sign-in" element={<LoginPage />} />
          <Route path="/ma-signin" element={<SignInMasterAdmin />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* The public site: finished matches, scorecards, teams, rankings (no login) */}
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/matches/:id" element={<MatchPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/players/:id" element={<PlayerPage />} />
          <Route path="/awards" element={<AwardsPage />} />
          <Route path="/awards/show" element={<AwardShow />} />

          {/* Broadcast score bar for the streaming software: public, no login */}
          <Route path="/overlay/:matchId" element={<OverlayPage />} />

          {/* The graphics operator's own console. The key in the scorer's link is the login, for this match only */}
          <Route path="/operator/:matchId" element={<OperatorConsole />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route
              path="/admin-dashboard"
              element={
                <TournamentProvider>
                  <AdminDashboard />
                </TournamentProvider>
              }
            />
          </Route>

            <Route
              path="/master-admin"
              element={<MasterAdminDashboard />}
            />

          {/* The scorer opens a match in its own tab: squads, toss, scoring */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/match/:fixtureId" element={<MatchRoom />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["player"]} />}>
            <Route path="/player-dashboard" element={<PlayerDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
