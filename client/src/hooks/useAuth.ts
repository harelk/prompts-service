import { useState, useEffect, useCallback } from "react";
import { getStoredToken, setStoredToken, clearStoredToken, loginRequest } from "../api/client";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(getStoredToken())
  );

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginRequest(email, password);
      if (result?.token) {
        setStoredToken(result.token);
        setIsAuthenticated(true);
        return true;
      }
      clearStoredToken();
      setIsAuthenticated(false);
      return false;
    } catch {
      clearStoredToken();
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
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
