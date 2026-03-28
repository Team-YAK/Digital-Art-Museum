"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getComments,
  addComment,
  getLikes,
  toggleLike,
} from "@/lib/api";
import type { CommentData, LikeData } from "@/types/api";

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const pixelBox: React.CSSProperties = {
  fontFamily: "monospace",
  imageRendering: "pixelated",
};

const pixelBorder = "2px solid #d4af37";
const darkBg = "#0f0c04";
const panelBg = "#1a1208";
const goldText = "#d4af37";
const lightGold = "#ffe99a";
const dimGold = "#8b6914";
const shadow = "3px 3px 0px #000";

function CommentItem({
  comment,
  artworkId,
  onReplyAdded,
  depth = 0,
}: {
  comment: CommentData;
  artworkId: number;
  onReplyAdded: () => void;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await addComment(artworkId, replyText.trim(), comment.id);
      setReplyText("");
      setReplying(false);
      onReplyAdded();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginLeft: depth > 0 ? 14 : 0, marginTop: 6, borderLeft: depth > 0 ? `2px solid ${dimGold}` : "none", paddingLeft: depth > 0 ? 8 : 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: goldText, fontWeight: "bold", textShadow: "1px 1px 0 #000" }}>
          @{comment.username}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#666" }}>
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <p style={{ fontFamily: "monospace", fontSize: 12, color: "#ccc", margin: "2px 0 4px", lineHeight: 1.4 }}>
        {comment.text}
      </p>
      {depth < 2 && (
        <button
          onClick={() => setReplying(!replying)}
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: dimGold,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          [reply]
        </button>
      )}
      {replying && (
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder="> Reply..."
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: 11,
              background: darkBg,
              border: `2px solid ${dimGold}`,
              padding: "4px 8px",
              color: lightGold,
              outline: "none",
            }}
            disabled={submitting}
          />
          <button
            onClick={handleReply}
            disabled={submitting}
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: "bold",
              color: panelBg,
              background: goldText,
              border: `2px solid ${dimGold}`,
              padding: "4px 10px",
              cursor: "pointer",
              boxShadow: "2px 2px 0 #000",
              textTransform: "uppercase",
            }}
          >
            Send
          </button>
        </div>
      )}
      {comment.replies?.map((r) => (
        <CommentItem
          key={r.id}
          comment={r}
          artworkId={artworkId}
          onReplyAdded={onReplyAdded}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function ArtModal({
  artwork,
  isOwner,
  username,
  onClose,
  onDelete,
}: ArtModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [likeData, setLikeData] = useState<LikeData>({ liked: false, count: 0 });
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchComments = useCallback(() => {
    getComments(artwork.artworkId).then(setComments).catch(() => {});
  }, [artwork.artworkId]);

  const fetchLikes = useCallback(() => {
    getLikes(artwork.artworkId).then(setLikeData).catch(() => {});
  }, [artwork.artworkId]);

  useEffect(() => {
    fetchComments();
    fetchLikes();
  }, [fetchComments, fetchLikes]);

  useEffect(() => {
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

  const handleLike = async () => {
    try {
      const res = await toggleLike(artwork.artworkId);
      setLikeData(res);
    } catch {
      /* not logged in */
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await addComment(artwork.artworkId, newComment.trim());
      setNewComment("");
      fetchComments();
    } catch {
      /* not logged in */
    } finally {
      setSubmittingComment(false);
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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        ...pixelBox,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: panelBg,
          border: "4px solid #d4af37",
          padding: 0,
          maxWidth: 540,
          width: "92%",
          maxHeight: "90vh",
          overflow: "hidden",
          boxShadow: "8px 8px 0px #000, inset 0 0 0 2px #2a1f0a",
          display: "flex",
          flexDirection: "column",
          imageRendering: "pixelated",
        }}
      >
        {/* Image section */}
        <div
          style={{
            position: "relative",
            background: darkBg,
            borderBottom: `3px solid ${goldText}`,
          }}
        >
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "contain",
              display: "block",
              background: "#000",
            }}
          />
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: panelBg,
              border: `2px solid ${goldText}`,
              color: goldText,
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              padding: "2px 10px",
              fontFamily: "monospace",
              boxShadow: shadow,
              textShadow: "1px 1px 0 #000",
            }}
          >
            X
          </button>
        </div>

        {/* Content section */}
        <div
          style={{
            padding: "12px 16px",
            overflowY: "auto",
            maxHeight: "calc(90vh - 300px)",
          }}
        >
          {/* Title + Like row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              borderBottom: `2px solid ${dimGold}`,
              paddingBottom: 8,
            }}
          >
            <h2
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                color: goldText,
                margin: 0,
                fontWeight: "bold",
                textShadow: "2px 2px 0 #000",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {artwork.title}
            </h2>
            <button
              onClick={handleLike}
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                fontWeight: "bold",
                color: likeData.liked ? "#e74c3c" : dimGold,
                background: likeData.liked ? "rgba(231,76,60,0.1)" : "transparent",
                border: `2px solid ${likeData.liked ? "#e74c3c" : dimGold}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                boxShadow: "2px 2px 0 #000",
                textShadow: "1px 1px 0 #000",
              }}
            >
              {likeData.liked ? "\u2764" : "\u2661"} {likeData.count}
            </button>
          </div>

          {/* Description */}
          {artwork.description && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#bba866",
                lineHeight: 1.6,
                margin: "0 0 10px 0",
                textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
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
                fontSize: 11,
                fontWeight: "bold",
                color: "#c0392b",
                background: "rgba(192, 57, 43, 0.08)",
                border: "2px solid #c0392b44",
                padding: "6px 14px",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.5 : 1,
                marginBottom: 10,
                boxShadow: "2px 2px 0 #000",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isDeleting ? "Removing..." : "[Remove Artwork]"}
            </button>
          )}

          {/* Comments section */}
          <div
            style={{
              borderTop: `3px solid ${goldText}`,
              paddingTop: 10,
              marginTop: 4,
            }}
          >
            <h3
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: "bold",
                color: goldText,
                margin: "0 0 8px",
                textShadow: "1px 1px 0 #000",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Comments ({comments.length})
            </h3>

            {/* Comment input */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="> Leave a thought..."
                style={{
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: darkBg,
                  border: `2px solid ${dimGold}`,
                  padding: "8px 10px",
                  color: lightGold,
                  outline: "none",
                  textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
                }}
                disabled={submittingComment}
              />
              <button
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: "bold",
                  color: submittingComment || !newComment.trim() ? "#555" : panelBg,
                  background: submittingComment || !newComment.trim() ? "#2a1f0a" : goldText,
                  border: `2px solid ${dimGold}`,
                  padding: "8px 14px",
                  cursor: submittingComment || !newComment.trim() ? "not-allowed" : "pointer",
                  boxShadow: submittingComment || !newComment.trim() ? "none" : shadow,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Post
              </button>
            </div>

            {/* Comment list */}
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {comments.length === 0 && (
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#555",
                    fontStyle: "italic",
                  }}
                >
                  No comments yet. Be the first!
                </p>
              )}
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  artworkId={artwork.artworkId}
                  onReplyAdded={fetchComments}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
