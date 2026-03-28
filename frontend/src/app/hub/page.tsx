"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function HubPage() {
  const { username, isLoggedIn, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950" />
    );
  }

  // Placeholder -- replaced with 3D hub in Session 2
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4 gap-6">
      <h1 className="text-4xl font-mono font-bold text-white">Museum Hub</h1>
      <p className="text-gray-400 font-mono">Welcome, {username}!</p>
      <p className="text-gray-500 font-mono text-sm">
        3D hub coming in Session 2
      </p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => router.push(`/room/${username}`)}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-mono transition-colors"
        >
          My Room
        </button>
        <button
          onClick={() => router.push("/room/leonardo")}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-mono transition-colors"
        >
          Visit Leonardo
        </button>
      </div>
    </div>
  );
}
