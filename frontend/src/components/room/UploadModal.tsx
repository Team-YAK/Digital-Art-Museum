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
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        fontFamily: "monospace",
        imageRendering: "pixelated",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: panelBg,
          border: `4px solid ${goldText}`,
          boxShadow: "8px 8px 0px #000, inset 0 0 0 2px #2a1f0a",
          padding: 0,
          maxWidth: 460,
          width: "92%",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "linear-gradient(180deg, #2a1f0a 0%, #1a1208 100%)",
            borderBottom: `3px solid ${goldText}`,
          }}
        >
          <span style={{ fontSize: 18 }}>🖼️</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: "bold",
              color: goldText,
              textShadow: "1px 1px 0 #000",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Upload Artwork — Slot {positionIndex + 1}
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: "bold",
              color: goldText,
              background: "#2a1f0a",
              border: `2px solid ${goldText}`,
              cursor: "pointer",
              padding: "2px 8px",
              textShadow: "1px 1px 0 #000",
            }}
          >
            X
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "16px 18px", background: panelBg }}>
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dimGold}`,
              background: darkBg,
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 14,
              minHeight: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 2px 2px 0 #000",
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 180, display: "block", imageRendering: "pixelated" }}
              />
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 6 }}>+</div>
                <p style={{ fontFamily: "monospace", color: dimGold, fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
                  Click to select image
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

          {/* Title */}
          <label style={{ display: "block", fontSize: 10, color: goldText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="> Artwork title..."
            required
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          {/* Description */}
          <label style={{ display: "block", fontSize: 10, color: goldText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="> Optional description..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }}
          />

          {/* Error */}
          {error && (
            <p style={{ color: "#c0392b", fontFamily: "monospace", fontSize: 12, marginBottom: 12, textShadow: "1px 1px 0 #000" }}>
              [Error] {error}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: "bold",
                color: dimGold,
                background: darkBg,
                border: `2px solid ${dimGold}`,
                cursor: "pointer",
                padding: "8px 18px",
                textTransform: "uppercase",
                letterSpacing: 1,
                boxShadow: "2px 2px 0 #000",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isUploading}
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: "bold",
                color: !file || !title.trim() || isUploading ? "#555" : panelBg,
                background: !file || !title.trim() || isUploading ? "#2a1f0a" : goldText,
                border: `2px solid ${dimGold}`,
                cursor: !file || !title.trim() || isUploading ? "not-allowed" : "pointer",
                padding: "8px 24px",
                textTransform: "uppercase",
                letterSpacing: 1,
                boxShadow: !file || !title.trim() || isUploading ? "none" : shadow,
                opacity: !file || !title.trim() ? 0.5 : 1,
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
