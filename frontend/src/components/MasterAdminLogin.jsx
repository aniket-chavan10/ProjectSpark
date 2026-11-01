import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import masterAdminApi from "../api/masterAdminApi";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "./layout/AuthLayout";
import { Alert, Button } from "./ui/kit";
import { field, label } from "./ui/classes";

// Sign in for the association head (the master admin).
const MasterAdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      title="Association sign-in"
      subtitle="For the association head: approve teams, plan the season, publish rankings and awards."
      footer={
        <>
          Team admin or player?{" "}
          <Link to="/sign-in" className="font-semibold text-emerald-700 hover:underline">
            Sign in here
          </Link>
        </>
      }
    >
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
          <input id="ma-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        </div>
        <Button type="submit" size="lg" busy={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default MasterAdminLogin;
