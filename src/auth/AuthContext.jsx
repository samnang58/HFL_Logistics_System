import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService } from "../services/resourceService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("hfl_auth_token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.me();
      const currentUser = response?.data ?? response;

      setUser(currentUser);
    } catch (error) {
      console.error("Auth check failed:", error);

      localStorage.removeItem("hfl_auth_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login({
      email,
      password,
    });

    const token =
      response?.data?.token ||
      response?.token;

    if (!token) {
      throw new Error("Login succeeded but no authentication token was returned.");
    }

    localStorage.setItem("hfl_auth_token", token);

    const meResponse = await authService.me();
    const currentUser =
      meResponse?.data ?? meResponse;

    setUser(currentUser);

    return currentUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("hfl_auth_token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
