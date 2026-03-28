"use client";

import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EventBus } from "@/game/EventBus";
import { getRandomRoom } from "@/lib/api";

interface HubSceneProps {
  username: string;
  onOpenChat: () => void;
}

export default function HubScene({ username, onOpenChat }: HubSceneProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const router = useRouter();

  const handleInteract = useCallback(
    async (payload: { action: string }) => {
      switch (payload.action) {
        case "chat":
          EventBus.emit("modal-opened");
          onOpenChat();
          break;
        case "my-room":
          router.push(`/room/${username}`);
          break;
        case "random-room":
          try {
            const { username: rndUser } = await getRandomRoom();
            router.push(`/room/${rndUser}`);
          } catch {
            router.push(`/room/${username}`);
          }
          break;
      }
    },
    [username, onOpenChat, router]
  );

  useEffect(() => {
    if (!divRef.current || gameRef.current) return;

    let destroyed = false;

    import("@/game/hubMain").then(({ createHubGame }) => {
      if (destroyed || !divRef.current) return;
      const game = createHubGame(divRef.current);
      gameRef.current = game;
    });

    EventBus.on("hub-interact", handleInteract);

    return () => {
      destroyed = true;
      EventBus.off("hub-interact", handleInteract);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [handleInteract]);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}
