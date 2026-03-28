"use client";

import { use } from "react";
import { useUser } from "@/hooks/useUser";
import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const RoomGame = dynamic(() => import("@/components/room/RoomGame"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function RoomPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: roomOwner } = use(params);
  const { username: currentUser, isLoggedIn } = useUser();
  const isOwner = isLoggedIn && currentUser === roomOwner;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <RoomGame username={roomOwner} isOwner={isOwner} />
    </div>
  );
}
