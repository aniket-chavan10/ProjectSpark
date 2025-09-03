import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ allowedRoles, redirectTo = "/master-admin" }) => {
  const { auth } = useAuth();

  console.log("Auth Context:", auth);
  console.log("Allowed Roles:", allowedRoles);

  if (!auth?.token) {
    console.log("No auth token found. Redirecting to:", redirectTo);
    return <Navigate to={redirectTo} />;
  }

  if (!allowedRoles.includes(auth.role)) {
    console.log(`Role ${auth.role} is not allowed. Redirecting.`);
    return <Navigate to="/master-admin" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
