"use client";

import React, { useState } from "react";

interface BioModalProps {
  username: string;
  description: string;
  isOwner: boolean;
  onClose: () => void;
  onEditBio?: () => void; // owner only — triggers EditBioModal
}

const panelBg = "#1a1208";
const darkBg = "#0f0c04";
const goldText = "#d4af37";
const dimGold = "#8b6914";
const shadow = "4px 4px 0px #000";

export default function BioModal({
  username,
  description,
  isOwner,
  onClose,
  onEditBio,
}: BioModalProps) {
  const [hoverEdit, setHoverEdit] = useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative w-full max-w-sm rounded-2xl flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-white/10 overflow-hidden animate-fade-in-up"
      >
        {/* Header bar */}
        <div className="bg-black/40 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖼</span>
            <div>
              <div className="text-[10px] text-cyan-400 tracking-widest uppercase mb-1">
                Artist Profile
              </div>
              <div className="text-xl font-bold text-white tracking-widest uppercase">
                {username}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="glass-button w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Bio body */}
        <div className="p-6">
          <div className="text-xs text-cyan-400 tracking-widest uppercase mb-4 border-b border-white/10 pb-2">
            About the Artist
          </div>

          {description ? (
            <p className="text-sm text-gray-300 leading-relaxed mb-6 font-light whitespace-pre-wrap">
              {description}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic mb-6">
              {isOwner
                ? "You haven't written a bio yet. Press Edit to add one!"
                : "This artist hasn't added a bio yet."}
            </p>
          )}

          {/* Owner controls */}
          {isOwner && onEditBio && (
            <button
              onClick={() => {
                onClose();
                onEditBio();
              }}
              className="mt-2 w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold text-sm transition-all shadow-lg active:scale-95 border border-white/10"
            >
              Edit Bio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
