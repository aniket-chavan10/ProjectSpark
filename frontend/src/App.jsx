import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LogInPage";
import Home from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import AdminDash from "./pages/AdminDash";  // Import the Admin Dashboard component
import MasterAdminDashboard from "../src/pages/MasterAdminDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";  // Import the ProtectedRoute component
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider
import SignInMasterAdmin from "./pages/SignInMasterAdmin";

function App() {
  return (
    // Wrap the entire App with Router
    <Router>
      {/* Wrap everything inside AuthProvider */}
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sign-in" element={<LoginPage />} />
          <Route path="/masteradmin-signin" element={<SignInMasterAdmin/>} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* Public routes */}
          <Route path="/master-admin" element={<MasterAdminDashboard />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "master-admin"]} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/master-admin-dashboard" element={<MasterAdminDashboard />} />
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
