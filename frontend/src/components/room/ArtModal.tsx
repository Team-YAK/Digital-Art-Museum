"use client";

import React from "react";
import type { Artwork } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ArtModalProps {
  artwork: {
    artworkId: number;
    title: string;
    description: string;
    imageUrl: string;
    pixelImageUrl: string;
    positionIndex?: number;
  };
  isOwner: boolean;
  username: string;
  onClose: () => void;
  onDelete?: (positionIndex: number) => void;
}

export default function ArtModal({ artwork, isOwner, username, onClose, onDelete }: ArtModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    if (!onDelete || artwork.positionIndex === undefined) return;
    if (!confirm("Remove this artwork from your gallery?")) return;

    setIsDeleting(true);
    try {
      const { deleteArtwork } = await import("@/lib/api");
      await deleteArtwork(username, artwork.positionIndex);
      onDelete(artwork.positionIndex);
      onClose();
    } catch (err) {
      console.error("Failed to delete artwork:", err);
      alert("Failed to remove artwork. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a1a2e, #16213e)",
          border: "1px solid #d4af3744",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "640px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 80px rgba(212, 175, 55, 0.15)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#888",
            fontSize: "24px",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ×
        </button>

        {/* Full-res artwork image */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            style={{
              width: "100%",
              maxHeight: "400px",
              objectFit: "contain",
              borderRadius: "8px",
              border: "2px solid #d4af37",
            }}
          />
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "monospace",
            fontSize: "22px",
            color: "#d4af37",
            margin: "0 0 8px 0",
          }}
        >
          {artwork.title}
        </h2>

        {/* Description */}
        {artwork.description && (
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: "#ccc",
              lineHeight: "1.6",
              margin: "0 0 16px 0",
            }}
          >
            {artwork.description}
          </p>
        )}

        {/* Delete button for owner */}
        {isOwner && onDelete && artwork.positionIndex !== undefined && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#ff4444",
              background: "rgba(255, 68, 68, 0.1)",
              border: "1px solid #ff444444",
              borderRadius: "8px",
              padding: "8px 20px",
              cursor: isDeleting ? "not-allowed" : "pointer",
              opacity: isDeleting ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {isDeleting ? "Removing…" : "🗑 Remove Artwork"}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
