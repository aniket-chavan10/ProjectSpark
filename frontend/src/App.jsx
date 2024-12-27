import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LogInPage";
import Home from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import MasterAdminDashboard from "./pages/MasterAdminDashboard"; // Correct import path
import PlayerDashboard from "./pages/PlayerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute"; // Import the ProtectedRoute component
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider
import SignInMasterAdmin from "./pages/SignInMasterAdmin";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/sign-in" element={<LoginPage />} />
          <Route path="/masteradmin-signin" element={<SignInMasterAdmin />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["master-admin"]} />}>
            <Route
              path="/master-admin-dashboard"
              element={<MasterAdminDashboard />}
            />
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
