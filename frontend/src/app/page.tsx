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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#0f0c04", padding: 16 }}>
      
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontFamily: "monospace", fontSize: 48, fontWeight: "bold", color: "#d4af37", textTransform: "uppercase", textShadow: "4px 4px 0 #000", margin: "0 0 16px 0", letterSpacing: 2 }}>
          Digital Art Museum
        </h1>
        <p style={{ fontFamily: "monospace", color: "#ffe99a", fontSize: 16, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
          Create your personalized, explorable gallery. Discover incredible pixel artwork and share your creativity with the world.
        </p>
      </div>

      <div style={{ 
        background: "#1a1208", 
        border: "3px solid #d4af37", 
        boxShadow: "6px 6px 0 #000", 
        padding: "40px", 
        width: "100%", 
        maxWidth: 420 
      }}>
        <UsernameForm />
      </div>

      <div style={{ position: "absolute", bottom: 24, fontFamily: "monospace", color: "#8b6914", fontSize: 13, letterSpacing: 4, fontWeight: "bold" }}>
        EXPLORE • CREATE • SHARE
      </div>
    </div>
  );
}
