import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import playersApi from "../api/playerApi";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
  
    const loginData = { email, password };
  
    try {
      let response;
      if (email.includes("admin")) {
        response = await adminApi.loginAdmin(loginData);
      } else {
        response = await playersApi.playerLogin(loginData);
      }
  
      console.log("Login Response:", response.data);
  
      if (response.data) {
        const { token, role, team_id, team_name, logo } = response.data;
  
        // Decode the token manually
        const decodedToken = decodeToken(token);
        console.log("Decoded Token Payload:", decodedToken);
  
        const admin_id = decodedToken.id; // Extract the admin_id from the token
  
        // Store token and other information in localStorage
        localStorage.setItem("authToken", token);
        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", admin_id);  // Store admin_id as userId
        localStorage.setItem("teamId", team_id);
        localStorage.setItem("teamName", team_name || "");
        localStorage.setItem("teamLogo", logo || "");
  
        // Redirect based on role
        if (role === "admin") {
          console.log("Navigating to /admin-dashboard");
          navigate("/admin-dashboard");
        } else if (role === "master-admin") {
          console.log("Navigating to /master-admin-dashboard");
          navigate("/master-admin-dashboard");
        } else if (role === "player") {
          console.log("Navigating to /player-dashboard");
          navigate("/player-dashboard");
        } else {
          console.log("Unexpected role:", role);
          setError("Unexpected role. Please contact support.");
        }
      } else {
        setError("Invalid response from server. Please try again.");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to manually decode JWT token
  const decodeToken = (token) => {
    const base64Url = token.split('.')[1];  // Get the payload part
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');  // Replace URL-safe characters
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  return (
    <div className="relative">
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
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
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
