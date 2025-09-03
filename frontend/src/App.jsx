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

          <Route element={<ProtectedRoute allowedRoles={["player"]} />}>
            <Route path="/player-dashboard" element={<PlayerDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
