"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "museum_username";

export function useUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setUsername(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setUsername(name);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
  }, []);

  return {
    username,
    isLoggedIn: !!username,
    isLoading,
    login,
    logout,
  };
}
