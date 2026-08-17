"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, clearToken, saveUser } from "@/lib/auth";
import { getMe } from "@/lib/api";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  logout: () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    const token = getToken();
    
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getMe();
      setUser(userData);
      saveUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      clearToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}