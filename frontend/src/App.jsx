import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LogInPage";
import Home from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import AdminDash from "./pages/AdminDash";  // Import the Admin Dashboard component
import MasterAdminDashboard from "../src/pages/MasterAdminDashboard";

function App() {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<MasterAdminDashboard />} />
          </Routes>
      </Router>
  );
}

export default App;
