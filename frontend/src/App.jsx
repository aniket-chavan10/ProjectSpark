import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LogInPage";
import Home from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import AdminDash from "./pages/AdminDash";  // Import the Admin Dashboard component

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/admin-dashboard" element={<AdminDash />} /> {/* Admin Dashboard Route */}
      </Routes>
    </Router>
  );
}

export default App;
