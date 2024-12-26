import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import masterAdminApi from "../api/masterAdminApi";
import playersApi from "../api/playerApi";

export default function Login() {
  const [isVisible, setIsVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // For master admin login
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin"); // Default to "admin"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loginData =
      role === "master-admin"
        ? { username, password }
        : { email, password };

    try {
      if (role === "master-admin") {
        const response = await masterAdminApi.loginMasterAdmin(loginData);
        console.log("Master Admin Login successful:", response.data);
        alert("Master Admin Login successful!");
        navigate("/master-admin"); // Redirect to master admin dashboard
      } else if (role === "admin") {
        const response = await adminApi.loginAdmin(loginData);
        console.log("Admin Login successful:", response.data);
        alert("Admin Login successful!");
        navigate("/admin-dashboard"); // Redirect to admin dashboard
      } else {
        const response = await playersApi.playerLogin(loginData);
        console.log("Player Login successful:", response.data);
        alert("Player Login successful!");
        navigate("/player-dashboard"); // Redirect to player dashboard
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Close"
      >
        &#x2715; {/* Unicode for "X" */}
      </button>

      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            alt="Your Company"
            src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
            className="mx-auto h-10 w-auto"
          />
          <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            {/* Conditionally render Email/Username field */}
            {(role === "admin" || role === "player") && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
            )}
            {role === "master-admin" && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-900">
                  Username
                </label>
                <div className="mt-2">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-900">
                Select Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
              >
                <option value="admin">Admin</option>
                <option value="master-admin">Master Admin</option>
                <option value="player">Player</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
