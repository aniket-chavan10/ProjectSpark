import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // Import useNavigate
import adminApi from "../api/adminApi"; // Assuming the API functions are in this path

export default function Login() {
  const [isVisible, setIsVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null); // To capture any login errors
  const navigate = useNavigate();  // Initialize useNavigate

  // Handler to close the login form
  const handleClose = () => {
    setIsVisible(false);
  };

  // If not visible, do not render the component
  if (!isVisible) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Reset any previous errors

    const loginData = {
      email,
      password,
    };

    try {
      const response = await adminApi.loginAdmin(loginData);
      console.log("Login successful:", response.data);
      alert("Login successful!");
      
      // Redirect to the admin dashboard after successful login
      navigate("/admin-dashboard");  // Redirects to the admin dashboard route
    } catch (error) {
      console.error("Error logging in:", error);
      setError("Invalid email or password."); // Update error message
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
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
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
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
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
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
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
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm/6 text-gray-500">
            Not a member?{" "}
            <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Start a 14-day free trial
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
