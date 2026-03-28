"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function RoomPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: roomOwner } = use(params);
  const { username: currentUser } = useUser();
  const router = useRouter();
  const isOwner = currentUser === roomOwner;

  // Placeholder -- replaced with Phaser room in Session 3
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4 gap-6">
      <h1 className="text-4xl font-mono font-bold text-white">
        {roomOwner}&apos;s Gallery
      </h1>
      {isOwner && (
        <p className="text-purple-400 font-mono">This is your room!</p>
      )}
      <p className="text-gray-500 font-mono text-sm">
        2D Phaser room coming in Session 3
      </p>
      <button
        onClick={() => router.push("/hub")}
        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-mono transition-colors"
      >
        Back to Hub
      </button>
    </div>
  );
}
