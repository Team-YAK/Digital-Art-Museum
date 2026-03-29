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

const panelBg = "#1a1208";
const darkBg = "#0f0c04";
const goldText = "#d4af37";
const dimGold = "#8b6914";
const lightGold = "#ffe99a";
const shadow = "4px 4px 0px #000";

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
      if (e.key === "Escape" && !isUploading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isUploading]);

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontFamily: "monospace",
    fontSize: "13px",
    background: darkBg,
    border: `2px solid ${dimGold}`,
    color: lightGold,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      onClick={() => { if (!isUploading) onClose(); }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-none p-4 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md flex flex-col animate-fade-in-up"
        style={{ background: panelBg, border: `3px solid ${goldText}`, boxShadow: shadow, fontFamily: "monospace" }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", background: darkBg, borderBottom: `2px solid ${dimGold}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>🖼️</span>
            <span style={{ fontWeight: "bold", color: goldText, letterSpacing: 1 }}>
              UPLOAD TO SLOT {positionIndex + 1}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: dimGold, fontSize: "16px", fontWeight: "bold", cursor: "pointer"
            }}
          >
            X
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "70vh" }}>
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: preview ? `2px solid ${goldText}` : `2px dashed ${dimGold}`,
              background: darkBg, padding: 24
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{ maxHeight: 160, objectFit: "contain", imageRendering: "pixelated" }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, color: dimGold, marginBottom: 8 }}>+</div>
                <p style={{ fontSize: 12, color: dimGold, textTransform: "uppercase", letterSpacing: 1 }}>
                  Click to select image
                </p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Title input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: goldText, textTransform: "uppercase", fontWeight: "bold", letterSpacing: 1 }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Artwork title..."
              required
              style={inputStyle}
            />
          </div>

          {/* Description input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: goldText, textTransform: "uppercase", fontWeight: "bold", letterSpacing: 1 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Optional description..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ padding: "8px 12px", background: "#3a0000", border: "2px solid #ff4444", color: "#ff8888", fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 16, borderTop: `2px solid ${dimGold}`, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{ background: "none", color: dimGold, border: "none", fontFamily: "monospace", cursor: "pointer", textTransform: "uppercase" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isUploading}
              style={{
                fontFamily: "monospace", fontSize: 12, fontWeight: "bold", color: panelBg, background: goldText, border: `2px solid ${dimGold}`,
                padding: "8px 16px", cursor: "pointer", boxShadow: "2px 2px 0 #000", textTransform: "uppercase",
                opacity: (!file || !title.trim() || isUploading) ? 0.5 : 1
              }}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
