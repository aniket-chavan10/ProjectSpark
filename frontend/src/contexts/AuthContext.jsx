import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const AuthContext = createContext();

// Create provider component
export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({ token: null, role: null });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    console.log("AuthProvider: Initial localStorage token", token);
    console.log("AuthProvider: Initial localStorage role", role);

    if (token && role) {
      setAuth({ token, role });
    }
  }, []);

  const login = ({ token, role }) => {
    setAuth({ token, role });
    localStorage.setItem("authToken", token);
    localStorage.setItem("userRole", role);
    console.log("AuthProvider: login called with token", token, "role", role);
  };

// In your AuthContext

const logout = () => {
  // Clear the token and role from localStorage
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");

  // Clear the context state
  setAuth(null); // or whatever your state update function is
};

// Call logout when the user logs out

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


// Create custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
