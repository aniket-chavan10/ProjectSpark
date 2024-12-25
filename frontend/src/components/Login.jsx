import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import masterAdminApi from "../api/masterAdminApi";

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

  const toggleLoginType = () => {
    setRole(role === "admin" ? "master-admin" : "admin");
    setEmail(""); // Clear email when switching to master admin
    setUsername(""); // Clear username when switching to admin
    setError(null); // Reset error message
  };

  if (!isVisible) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loginData = role === "admin" ? { email, password } : { username, password };

    try {
      if (role === "master-admin") {
        // Login for master admin
        const response = await masterAdminApi.loginMasterAdmin(loginData);
        console.log("Master Admin Login successful:", response.data);
        alert("Master Admin Login successful!");
        navigate("/master-admin"); // Redirect to master admin dashboard
      } else {
        // Login for admin
        const response = await adminApi.loginAdmin(loginData);
        console.log("Admin Login successful:", response.data);
        alert("Admin Login successful!");
        navigate("/admin-dashboard"); // Redirect to admin dashboard
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setError("Invalid email or password.");
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
            {role === "admin" ? (
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
            ) : (
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

          <p className="mt-10 text-center text-sm text-gray-500">
            Not a member?{" "}
            <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Start a 14-day free trial
            </a>
          </p>

          {/* Toggle Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleLoginType}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Switch to {role === "admin" ? "Master Admin" : "Admin"} Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
