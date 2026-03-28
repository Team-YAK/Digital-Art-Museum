"use client";

import { useState, useEffect, useCallback } from "react";
import { getRoom } from "@/lib/api";
import type { Room } from "@/types/api";

export function useRoom(username: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getRoom(username);
      setRoom(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch room");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  return { room, isLoading, error, refetch: fetchRoom };
}
