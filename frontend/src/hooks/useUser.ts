"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "museum_username";
const TOKEN_KEY = "museum_token";

export function useUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setUsername(stored);
    setIsLoading(false);
  }, []);

  const loginUser = useCallback((name: string, token: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    localStorage.setItem(TOKEN_KEY, token);
    setUsername(name);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUsername(null);
  }, []);

  return {
    username,
    isLoggedIn: !!username,
    isLoading,
    login: loginUser,
    logout,
  };
}
