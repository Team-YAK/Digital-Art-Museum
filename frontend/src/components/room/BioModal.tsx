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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.82)",
        fontFamily: "monospace",
        imageRendering: "pixelated",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: panelBg,
          border: "4px solid #d4af37",
          boxShadow: `${shadow}, inset 0 0 0 2px #2a1f0a`,
          maxWidth: 420,
          width: "90%",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: darkBg,
            borderBottom: `3px solid ${goldText}`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* decorative pixel icon */}
            <span style={{ fontSize: 18, lineHeight: 1 }}>🖼</span>
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: dimGold,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                ~ Artist Profile ~
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: goldText,
                  fontWeight: "bold",
                  textShadow: "2px 2px 0 #000",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {username}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: panelBg,
              border: `2px solid ${goldText}`,
              color: goldText,
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: "bold",
              padding: "2px 10px",
              cursor: "pointer",
              boxShadow: "2px 2px 0 #000",
              textShadow: "1px 1px 0 #000",
            }}
          >
            X
          </button>
        </div>

        {/* Bio body */}
        <div style={{ padding: "14px 18px 18px" }}>
          <div
            style={{
              fontSize: 10,
              color: dimGold,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
              borderBottom: `1px solid ${dimGold}44`,
              paddingBottom: 6,
            }}
          >
            About the Artist
          </div>

          {description ? (
            <p
              style={{
                fontSize: 13,
                color: "#c9b98a",
                lineHeight: 1.7,
                margin: "0 0 14px",
                whiteSpace: "pre-wrap",
                textShadow: "1px 1px 0 rgba(0,0,0,0.6)",
              }}
            >
              {description}
            </p>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "#555",
                fontStyle: "italic",
                margin: "0 0 14px",
              }}
            >
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
              onMouseEnter={() => setHoverEdit(true)}
              onMouseLeave={() => setHoverEdit(false)}
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: "bold",
                color: hoverEdit ? darkBg : goldText,
                background: hoverEdit ? goldText : "transparent",
                border: `2px solid ${goldText}`,
                padding: "6px 18px",
                cursor: "pointer",
                boxShadow: hoverEdit ? "none" : "2px 2px 0 #000",
                textTransform: "uppercase",
                letterSpacing: 1,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              [ Edit Bio ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
