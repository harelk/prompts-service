import { useState, useEffect, useCallback } from "react";
import { getStoredPassword, setStoredPassword, clearStoredPassword } from "../api/client";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(getStoredPassword())
  );

  const login = useCallback(async (password: string): Promise<boolean> => {
    setStoredPassword(password);
    try {
      const res = await fetch("/api/health");
      if (res.status === 200) {
        // Health is unauthenticated, verify with a real auth request
        const authRes = await fetch("/api/services", {
          headers: { Authorization: `Bearer ${password}` },
        });
        if (authRes.ok) {
          setIsAuthenticated(true);
          return true;
        }
      }
      clearStoredPassword();
      setIsAuthenticated(false);
      return false;
    } catch {
      clearStoredPassword();
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredPassword();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  return { isAuthenticated, login, logout };
}
