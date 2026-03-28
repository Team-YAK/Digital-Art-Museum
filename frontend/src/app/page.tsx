"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { UsernameForm } from "@/components/shared/UsernameForm";

export default function LandingPage() {
  const { isLoggedIn, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.push("/hub");
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950" />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-mono font-bold text-white mb-4 tracking-tight">
          Digital Art Museum
        </h1>
        <p className="text-lg font-mono text-gray-400">
          Create your gallery. Share your art. Explore others.
        </p>
      </div>
      <UsernameForm />
      <p className="mt-8 text-sm font-mono text-gray-600">
        Enter a username to create your personal gallery room
      </p>
    </div>
  );
}
