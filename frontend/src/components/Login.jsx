import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import playersApi from "../api/playerApi";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "./layout/AuthLayout";
import { Alert, Button, Tabs } from "./ui/kit";
import { field, label } from "./ui/classes";

const decodeToken = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

// Sign in for a team admin or a player.
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const loginData = { email, password };
      const response = selectedRole === "admin" ? await adminApi.loginAdmin(loginData) : await playersApi.playerLogin(loginData);

      const { token, team_id, team_name, logo } = response.data;
      const decoded = decodeToken(token);
      const userId = decoded?.id || decoded?.playerId;
      if (!userId) throw new Error("Invalid token: User ID is missing");

      login({ token, role: selectedRole, userId, teamId: team_id, teamName: team_name, teamLogo: logo });
      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", selectedRole);
      localStorage.setItem("userId", userId);
      if (team_id) localStorage.setItem("teamId", team_id);
      if (team_name) localStorage.setItem("teamName", team_name);
      if (logo) localStorage.setItem("teamLogo", logo);

      navigate(selectedRole === "admin" ? "/admin-dashboard" : "/player-dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your email and password and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your team, tournaments and matches."
      footer={
        <>
          New team?{" "}
          <Link to="/sign-up" className="font-semibold text-emerald-700 hover:underline">
            Register your village
          </Link>
          {" · "}
          <Link to="/ma-signin" className="font-semibold text-slate-600 hover:underline">
            Association sign-in
          </Link>
        </>
      }
    >
      <Tabs
        value={selectedRole}
        onChange={setSelectedRole}
        className="mb-6 w-full [&>button]:flex-1 [&>button]:justify-center"
        tabs={[
          { id: "admin", label: "Team admin" },
          { id: "player", label: "Player" },
        ]}
      />
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <label htmlFor="login-email" className={label}>
            Email
          </label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="name@example.com" />
        </div>
        <div>
          <label htmlFor="login-password" className={label}>
            Password
          </label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder="Your password" />
        </div>
        <Button type="submit" size="lg" busy={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
