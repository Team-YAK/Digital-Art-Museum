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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-mesh px-4 overflow-hidden">
      {/* Decorative top glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 text-center mb-12 animate-fade-in-up">
        <h1 className="text-6xl font-black mb-6 tracking-tighter text-gradient drop-shadow-lg">
          Digital Art Museum
        </h1>
        <p className="max-w-xl mx-auto text-xl text-gray-300 font-light leading-relaxed">
          Create your personalized, explorable gallery. Discover incredible artwork, leave comments, and share your creativity with the world.
        </p>
      </div>

      <div className="relative z-10 glass-panel rounded-3xl p-10 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <UsernameForm />
        <p className="mt-8 text-center text-sm text-gray-400">
          Enter a username or login to explore
        </p>
      </div>

      <div className="absolute bottom-6 text-gray-500 text-sm tracking-widest font-mono">
        EXPLORE • CREATE • SHARE
      </div>
    </div>
  );
}
