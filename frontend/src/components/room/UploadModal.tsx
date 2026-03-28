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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative w-full max-w-md rounded-2xl flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-white/10 overflow-hidden animate-fade-in-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-black/40 border-b border-white/10">
          <span className="text-2xl">🖼️</span>
          <span className="font-bold text-white tracking-widest uppercase">
            Upload to Slot {positionIndex + 1}
          </span>
          <button
            onClick={onClose}
            className="glass-button w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-white/20">
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
              preview ? "border-cyan-500/50 bg-black/40" : "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40"
            }`}
            style={{ minHeight: 160 }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-40 object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center">
                <div className="text-4xl text-white/50 mb-2">+</div>
                <p className="text-sm text-gray-400 uppercase tracking-widest">
                  Click to select image
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs text-cyan-400 uppercase tracking-widest mb-2 font-semibold">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Artwork title..."
              required
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-xs text-cyan-400 uppercase tracking-widest mb-2 font-semibold">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans resize-y"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-white/10 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isUploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold transition-all shadow-lg border border-white/10 disabled:opacity-50 text-sm"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
