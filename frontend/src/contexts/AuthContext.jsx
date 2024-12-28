import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    // Initialize auth from localStorage
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    return token && role ? { token, role } : null;
  });

  const login = (authData) => {
    setAuth(authData);
    localStorage.setItem("authToken", authData.token);
    localStorage.setItem("userRole", authData.role);
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
  };

  useEffect(() => {
    // Optionally re-validate token here
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
