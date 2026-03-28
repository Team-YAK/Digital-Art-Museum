"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface RoomHUDProps {
  username: string;
  isOwner: boolean;
  onEditDescription: () => void;
}

export default function RoomHUD({ username, isOwner, onEditDescription }: RoomHUDProps) {
  const router = useRouter();
  const [fading, setFading] = React.useState(false);

  const handleBack = () => {
    setFading(true);
    setTimeout(() => router.push("/hub"), 300);
  };

  return (
    <>
      {/* Fade overlay for navigation transition */}
      {fading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#000",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease-out forwards",
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", pointerEvents: "auto" }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#d4af37",
              background: "rgba(212, 175, 55, 0.1)",
              border: "1px solid #d4af3744",
              borderRadius: "8px",
              padding: "6px 14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ← Hub
          </button>

          {/* Room title */}
          <h1
            style={{
              fontFamily: "monospace",
              fontSize: "16px",
              color: "#e0e0e0",
              margin: 0,
              fontWeight: "bold",
            }}
          >
            {isOwner ? "Your Gallery" : `${username}'s Gallery`}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "12px", pointerEvents: "auto" }}>
          {isOwner && (
            <button
              onClick={onEditDescription}
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#d4af37",
                background: "rgba(212, 175, 55, 0.1)",
                border: "1px solid #d4af3744",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              ✏️ Edit Bio
            </button>
          )}
        </div>
      </div>

      {/* Controls hint at bottom */}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#666",
          background: "rgba(0,0,0,0.5)",
          padding: "6px 16px",
          borderRadius: "20px",
          pointerEvents: "none",
        }}
      >
        A/D or ←/→ to walk · SPACE to interact
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
