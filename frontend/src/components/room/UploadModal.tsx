"use client";

import React, { useState, useRef } from "react";
import { uploadArtwork } from "@/lib/api";
import type { Artwork } from "@/types/api";

interface UploadModalProps {
  positionIndex: number;
  username: string;
  onClose: () => void;
  onUploaded: (artwork: Artwork) => void;
}

export default function UploadModal({ positionIndex, username, onClose, onUploaded }: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("position_index", String(positionIndex));
      formData.append("image", file);

      const artwork = await uploadArtwork(username, formData);
      onUploaded(artwork);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
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
          padding: "28px",
          maxWidth: "480px",
          width: "90%",
          boxShadow: "0 24px 80px rgba(212, 175, 55, 0.15)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <h2
          style={{
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#d4af37",
            margin: "0 0 20px 0",
          }}
        >
          Upload Artwork — Slot {positionIndex + 1}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* File input area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #444",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "16px",
              transition: "border-color 0.2s",
              minHeight: "120px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "200px",
                  borderRadius: "8px",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🖼️</div>
                <p style={{ fontFamily: "monospace", color: "#888", fontSize: "13px", margin: 0 }}>
                  Click to select an image
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Artwork title (required)"
            required
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #333",
              background: "#0d0d1a",
              color: "#e0e0e0",
              fontFamily: "monospace",
              fontSize: "14px",
              marginBottom: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Description textarea */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #333",
              background: "#0d0d1a",
              color: "#e0e0e0",
              fontFamily: "monospace",
              fontSize: "14px",
              marginBottom: "16px",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          {/* Error display */}
          {error && (
            <p
              style={{
                color: "#ff4444",
                fontFamily: "monospace",
                fontSize: "12px",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#aaa",
                background: "transparent",
                border: "1px solid #444",
                borderRadius: "8px",
                padding: "8px 20px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isUploading}
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#1a1a2e",
                background: isUploading ? "#888" : "linear-gradient(135deg, #d4af37, #f5d061)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 24px",
                cursor: !file || !title.trim() || isUploading ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: !file || !title.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {isUploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
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
