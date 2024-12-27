import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";  // Import the useAuth hook

const ProtectedRoute = ({ allowedRoles }) => {
  const { auth } = useAuth();

  console.log("ProtectedRoute: auth.token", auth.token);  // Log token
  console.log("ProtectedRoute: auth.role", auth.role);  // Log role
  console.log("ProtectedRoute: allowedRoles", allowedRoles);  // Log allowedRoles

  // Check if the user is authenticated and if their role is allowed
  if (!auth.token) {
    console.log("Redirecting to /sign-in because no auth token found.");
    return <Navigate to="/sign-in" />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    // If the user is authenticated but doesn't have the required role, redirect to login
    console.log("Redirecting to /sign-in because role is not allowed.");
    return <Navigate to="/sign-in" />;
  }

  // If authenticated and role is valid, render the child routes
  return <Outlet />;
};


export default ProtectedRoute;
