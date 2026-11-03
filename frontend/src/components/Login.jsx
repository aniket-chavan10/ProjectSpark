import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout, { AuthTabs } from "./layout/AuthLayout";
import { LuArrowRight, LuEye, LuEyeOff } from "react-icons/lu";
import { Alert, Button } from "./ui/kit";
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

// Sign in for a team admin (a team representative, who is also the host when the association reserves dates for the team).
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await adminApi.loginAdmin({ email, password });

      const { token, team_id, team_name, logo } = response.data;
      const decoded = decodeToken(token);
      const userId = decoded?.id;
      if (!userId) throw new Error("Invalid token: User ID is missing");

      login({ token, role: "admin", userId, teamId: team_id, teamName: team_name, teamLogo: logo });
      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("userId", userId);
      if (team_id) localStorage.setItem("teamId", team_id);
      if (team_name) localStorage.setItem("teamName", team_name);
      if (logo) localStorage.setItem("teamLogo", logo);

      navigate("/admin-dashboard");
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
      subtitle="Sign in to manage your squad, host tournaments and run your matches."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span>
            New team?{" "}
            <Link to="/sign-up" className="font-bold text-spark-600 hover:underline">
              Register your village
            </Link>
          </span>
          <span className="text-xs text-ink-400">Trouble signing in? Your association office can help.</span>
        </div>
      }
    >
      <AuthTabs active="team" />

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
          <div className="relative">
            <input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} placeholder="Your password" />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ink-400 transition hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spark-400"
            >
              {show ? <LuEyeOff className="h-5 w-5" aria-hidden="true" /> : <LuEye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" busy={isSubmitting} className="w-full" iconRight={LuArrowRight}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
