"use client";

import { useEffect } from "react";
import { EventBus } from "@/game/EventBus";

export function useGameEvent(event: string, handler: (...args: unknown[]) => void) {
  useEffect(() => {
    EventBus.on(event, handler);
    return () => {
      EventBus.off(event, handler);
    };
  }, [event, handler]);
}
