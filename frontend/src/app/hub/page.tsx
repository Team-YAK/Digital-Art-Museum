"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@/hooks/useUser";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { ChatOverlay } from "@/components/shared/ChatOverlay";
import { EventBus } from "@/game/EventBus";

const HubScene = dynamic(() => import("@/components/hub/HubScene"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function HubPage() {
  const { username, isLoggedIn, isLoading } = useUser();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push("/");
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn || !username) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* WASD hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="font-mono text-xs text-gray-400 bg-black/50 px-3 py-1 rounded-full">
          WASD / Arrow Keys to move · SPACE to interact
        </span>
      </div>

      {/* Username badge */}
      <div className="absolute top-4 right-4 z-10 font-mono text-xs text-gray-400 bg-black/50 px-3 py-1 rounded-full">
        {username}
      </div>

      <HubScene username={username} onOpenChat={() => setChatOpen(true)} />

      {chatOpen && <ChatOverlay onClose={() => { setChatOpen(false); EventBus.emit("modal-closed"); }} />}
    </div>
  );
}
