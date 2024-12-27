import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Import the useAuth hook

const ProtectedRoute = ({ allowedRoles, redirectTo = "/sign-in" }) => {
  const { auth } = useAuth();

  console.log("ProtectedRoute: auth.token", auth?.token); // Log token
  console.log("ProtectedRoute: auth.role", auth?.role); // Log role
  console.log("ProtectedRoute: allowedRoles", allowedRoles); // Log allowedRoles

  // If the user is not authenticated, redirect to the appropriate login page
  if (!auth?.token) {
    console.log(`Redirecting to ${redirectTo} because no auth token found.`);
    return <Navigate to={redirectTo} />;
  }

  // If the user's role is not allowed, redirect to the home page
  if (allowedRoles && !allowedRoles.includes(auth?.role)) {
    console.log(`Redirecting to / because role ${auth?.role} is not allowed.`);
    return <Navigate to="/sign-in" replace />;
  }

  // If authenticated and role is valid, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
