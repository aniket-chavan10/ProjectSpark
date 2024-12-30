import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId");

    return token && role && userId ? { token, role, userId } : null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem("authToken", auth.token);
      localStorage.setItem("userRole", auth.role);
      localStorage.setItem("userId", auth.userId);
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
    }
  }, [auth]);

  const login = (authData) => {
    setAuth(authData);
  };

  const logout = () => {
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
