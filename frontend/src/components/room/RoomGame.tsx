"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRoom } from "@/hooks/useRoom";
import { EventBus } from "@/game/EventBus";
import { createGame } from "@/game/main";
import type { ArtInteractPayload, EmptySlotPayload, ArtworkUploadedPayload } from "@/types/game";
import type { Artwork } from "@/types/api";
import ArtModal from "./ArtModal";
import UploadModal from "./UploadModal";
import RoomHUD from "./RoomHUD";
import EditBioModal from "./EditBioModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RoomGameProps {
  username: string;
  isOwner: boolean;
}

export default function RoomGame({ username, isOwner }: RoomGameProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { room, isLoading, error, refetch } = useRoom(username);

  // Modal states
  const [artModal, setArtModal] = useState<(ArtInteractPayload & { positionIndex?: number }) | null>(null);
  const [uploadSlot, setUploadSlot] = useState<number | null>(null);
  const [editBioOpen, setEditBioOpen] = useState(false);
  const [currentBio, setCurrentBio] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Update bio when room data loads
  useEffect(() => {
    if (room) {
      setCurrentBio(room.artist_description || "");
    }
  }, [room]);

  // EventBus handlers
  const handleArtInteract = useCallback((payload: ArtInteractPayload) => {
    // Find position_index from room data
    const artwork = room?.artworks.find((a) => a.id === payload.artworkId);
    setArtModal({ ...payload, positionIndex: artwork?.position_index });
    EventBus.emit("modal-opened");
  }, [room]);

  const handleEmptySlot = useCallback((payload: EmptySlotPayload) => {
    setUploadSlot(payload.positionIndex);
    EventBus.emit("modal-opened");
  }, []);

  // Initialize Phaser game
  useEffect(() => {
    if (!room || !divRef.current || gameRef.current) return;

    const game = createGame(divRef.current, room, isOwner);
    gameRef.current = game;

    // Listen for Phaser events
    EventBus.on("interact-art", handleArtInteract);
    EventBus.on("interact-empty-slot", handleEmptySlot);

    return () => {
      EventBus.off("interact-art", handleArtInteract);
      EventBus.off("interact-empty-slot", handleEmptySlot);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [room, isOwner, handleArtInteract, handleEmptySlot]);

  // Close modal helper
  const closeArtModal = useCallback(() => {
    setArtModal(null);
    EventBus.emit("modal-closed");
  }, []);

  const closeUploadModal = useCallback(() => {
    setUploadSlot(null);
    EventBus.emit("modal-closed");
  }, []);

  // Handle upload success
  const handleUploaded = useCallback((artwork: Artwork) => {
    const payload: ArtworkUploadedPayload = {
      id: artwork.id,
      positionIndex: artwork.position_index,
      pixelImageUrl: `${API_URL}/${artwork.pixel_image_url}`,
      title: artwork.title,
    };
    EventBus.emit("artwork-uploaded", payload);
    setUploadSlot(null);
    EventBus.emit("modal-closed");

    // Show success toast
    setToast("Art uploaded!");
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Handle artwork deletion
  const handleDelete = useCallback((positionIndex: number) => {
    EventBus.emit("artwork-deleted", { positionIndex });
    setArtModal(null);
    EventBus.emit("modal-closed");
  }, []);

  // Handle bio saved
  const handleBioSaved = useCallback((newBio: string) => {
    setCurrentBio(newBio);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100vh",
          backgroundColor: "#1a1a2e",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#d4af37",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          Loading gallery…
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100vh",
          backgroundColor: "#1a1a2e",
          gap: "16px",
        }}
      >
        <p style={{ fontFamily: "monospace", color: "#ff4444", fontSize: "16px" }}>
          {error}
        </p>
        <button
          onClick={refetch}
          style={{
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#d4af37",
            background: "rgba(212, 175, 55, 0.1)",
            border: "1px solid #d4af3744",
            borderRadius: "8px",
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Phaser game container */}
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />

      {/* HUD overlay */}
      <RoomHUD
        username={username}
        isOwner={isOwner}
        onEditDescription={() => {
          setEditBioOpen(true);
          EventBus.emit("modal-opened");
        }}
      />

      {/* Art viewer modal */}
      {artModal && (
        <ArtModal
          artwork={artModal}
          isOwner={isOwner}
          username={username}
          onClose={closeArtModal}
          onDelete={handleDelete}
        />
      )}

      {/* Upload modal */}
      {uploadSlot !== null && (
        <UploadModal
          positionIndex={uploadSlot}
          username={username}
          onClose={closeUploadModal}
          onUploaded={handleUploaded}
        />
      )}

      {/* Edit bio modal */}
      {editBioOpen && (
        <EditBioModal
          username={username}
          currentBio={currentBio}
          onClose={() => {
            setEditBioOpen(false);
            EventBus.emit("modal-closed");
          }}
          onSaved={handleBioSaved}
        />
      )}

      {/* Success toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #d4af37, #f5d061)",
            color: "#1a1a2e",
            fontFamily: "monospace",
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 24px",
            borderRadius: "24px",
            zIndex: 2000,
            animation: "toastIn 0.3s ease-out",
            boxShadow: "0 8px 32px rgba(212, 175, 55, 0.3)",
          }}
        >
          ✨ {toast}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
