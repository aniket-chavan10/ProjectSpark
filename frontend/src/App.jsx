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

function App() {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<Home/>} />
              <Route path="/sign-in" element={<LoginPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/master-admin" element={<MasterAdminDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/player-dashboard" element={<PlayerDashboard/>} />
          </Routes>
      </Router>
  );
}

export default App;
