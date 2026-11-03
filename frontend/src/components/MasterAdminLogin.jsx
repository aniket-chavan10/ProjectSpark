import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import masterAdminApi from "../api/masterAdminApi";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout, { AuthTabs } from "./layout/AuthLayout";
import { LuArrowRight, LuEye, LuEyeOff, LuShieldCheck } from "react-icons/lu";
import { Alert, Button } from "./ui/kit";
import { field, label } from "./ui/classes";

// Sign in for the association head (the master admin).
const MasterAdminLogin = () => {
  const [username, setUsername] = useState("");
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
      const response = await masterAdminApi.loginMasterAdmin({ username, password });
      if (response.data?.token && response.data?.role) {
        const { token, role } = response.data;
        localStorage.setItem("masterAuthToken", token);
        localStorage.setItem("userRole", role);
        login({ token, role });
        navigate("/master-admin");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setError("Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Master admin"
      title="Association sign-in"
      subtitle="Sign in with your association username."
    >
      <AuthTabs active="association" />
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-ink-950 px-4 py-3 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-volt-400 to-indigo-500">
          <LuShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-xs text-ink-200">
          <span className="block text-sm font-extrabold text-white">Restricted area</span>
          Approve teams, plan the season, publish rankings and awards.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <label htmlFor="ma-user" className={label}>
            Username
          </label>
          <input id="ma-user" type="text" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="ma-pass" className={label}>
            Password
          </label>
          <div className="relative">
            <input id="ma-pass" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} />
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
          Sign in as master admin
        </Button>
      </form>
    </AuthLayout>
  );
};

export default MasterAdminLogin;
