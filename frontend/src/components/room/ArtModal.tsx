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
  const [commentError, setCommentError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);

  // ---- AI Guide Chat State ----
  const [activeTab, setActiveTab] = useState<"comments" | "guide">("comments");
  const [guideMessages, setGuideMessages] = useState<{ role: "user" | "guide"; text: string }[]>([
    { role: "guide", text: `I am the Museum Guide! What would you like to know about "${artwork.title}"?` }
  ]);
  const [guideInput, setGuideInput] = useState("");
  const [isGuideThinking, setIsGuideThinking] = useState(false);

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
    setLikeError(null);
    try {
      const res = await toggleLike(artwork.artworkId);
      setLikeData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.includes("authenticated")) {
        setLikeError("Log in to like artwork");
      } else {
        setLikeError("Could not update like");
      }
      setTimeout(() => setLikeError(null), 2500);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      await addComment(artwork.artworkId, newComment.trim());
      setNewComment("");
      fetchComments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.includes("authenticated")) {
        setCommentError("You must be logged in to comment.");
      } else {
        setCommentError(msg || "Failed to post comment.");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleGuideSubmit = async () => {
    if (!guideInput.trim() || isGuideThinking) return;

    const userMsg = guideInput.trim();
    setGuideMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setGuideInput("");
    setIsGuideThinking(true);

    try {
      const { chatWithGuide } = await import("@/lib/api");
      const ctx = `Title: ${artwork.title}\nDescription: ${artwork.description || "No description provided."}`;
      const res = await chatWithGuide(userMsg, ctx, artwork.imageUrl);
      setGuideMessages((prev) => [...prev, { role: "guide", text: res.response }]);
    } catch (err) {
      setGuideMessages((prev) => [...prev, { role: "guide", text: "Sorry, I am having trouble connecting to the museum archives right now." }]);
    } finally {
      setIsGuideThinking(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-none p-4 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up"
        style={{ background: panelBg, border: `3px solid ${goldText}`, boxShadow: shadow, fontFamily: "monospace" }}
      >
        {/* Header/Close Button */}
        <div style={{ padding: "16px 20px", background: darkBg, borderBottom: `2px solid ${dimGold}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 20 }}>🖼️</span>
            <span style={{ fontWeight: "bold", color: goldText, letterSpacing: 1, marginLeft: 10, textTransform: "uppercase" }}>
              Artwork Viewer
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: dimGold, fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
          >
            X
          </button>
        </div>

        {/* Image Section */}
        <div style={{ padding: 16, background: "#000", borderBottom: `2px solid ${dimGold}`, display: "flex", justifyContent: "center" }}>
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            style={{ maxHeight: "35vh", objectFit: "contain", imageRendering: "pixelated", border: `2px solid ${dimGold}` }}
          />
        </div>

        {/* Content Section */}
        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <h2 style={{ fontSize: 24, fontWeight: "bold", color: lightGold, textTransform: "uppercase", margin: 0 }}>
              {artwork.title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <button
                onClick={handleLike}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: likeData.liked ? "#3a0000" : darkBg,
                  border: `2px solid ${likeData.liked ? "#ff4444" : dimGold}`, color: likeData.liked ? "#ff8888" : goldText,
                  cursor: "pointer", fontFamily: "monospace", textTransform: "uppercase", fontWeight: "bold"
                }}
              >
                <span style={{ fontSize: 16 }}>{likeData.liked ? "♥" : "♡"}</span>
                <span>{likeData.count}</span>
              </button>
              {likeError && <span style={{ fontSize: 10, color: "#ff8888", marginTop: 4 }}>{likeError}</span>}
            </div>
          </div>

          {artwork.description && (
            <p style={{ color: "#ccc", lineHeight: 1.5, marginBottom: 24, fontSize: 14 }}>
              {artwork.description}
            </p>
          )}

          {isOwner && onDelete && artwork.positionIndex !== undefined && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                alignSelf: "flex-start", padding: "6px 12px", background: "#3a0000", border: "2px solid #ff4444", color: "#ff8888",
                cursor: "pointer", fontFamily: "monospace", textTransform: "uppercase", fontSize: 11, marginBottom: 24, fontWeight: "bold"
              }}
            >
              {isDeleting ? "Removing..." : "Remove Artwork"}
            </button>
          )}

          {/* Discussion / AI Guide Section */}
          <div style={{ borderTop: `2px solid ${dimGold}`, paddingTop: 20 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 24, marginBottom: 20, borderBottom: `2px solid ${dimGold}` }}>
              <button
                onClick={() => setActiveTab("comments")}
                style={{
                  background: "none", border: "none", cursor: "pointer", paddingBottom: 8, fontFamily: "monospace", fontSize: 14,
                  fontWeight: "bold", textTransform: "uppercase", color: activeTab === "comments" ? lightGold : dimGold,
                  borderBottom: activeTab === "comments" ? `2px solid ${lightGold}` : "none", marginBottom: -2
                }}
              >
                Discussion ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab("guide")}
                style={{
                  background: "none", border: "none", cursor: "pointer", paddingBottom: 8, fontFamily: "monospace", fontSize: 14,
                  fontWeight: "bold", textTransform: "uppercase", color: activeTab === "guide" ? lightGold : dimGold,
                  borderBottom: activeTab === "guide" ? `2px solid ${lightGold}` : "none", marginBottom: -2, display: "flex", gap: 8, alignItems: "center"
                }}
              >
                <span>AI Guide</span>
                <span style={{ background: dimGold, color: panelBg, padding: "2px 6px", fontSize: 9 }}>BETA</span>
              </button>
            </div>
            
            {activeTab === "comments" ? (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    placeholder="Share your thoughts..."
                    disabled={submittingComment}
                    style={{
                      flex: 1, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, background: darkBg, border: `2px solid ${dimGold}`,
                      color: lightGold, outline: "none"
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    style={{
                      fontFamily: "monospace", fontSize: 12, fontWeight: "bold", color: panelBg, background: goldText, border: `2px solid ${dimGold}`,
                      padding: "10px 20px", cursor: "pointer", boxShadow: "2px 2px 0 #000", textTransform: "uppercase",
                      opacity: (submittingComment || !newComment.trim()) ? 0.5 : 1
                    }}
                  >
                    Post
                  </button>
                </div>

                {commentError && <div style={{ padding: "8px 12px", background: "#3a0000", border: "2px solid #ff4444", color: "#ff8888", fontSize: 12, marginBottom: 16 }}>{commentError}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {comments.length === 0 && (
                    <p style={{ color: dimGold, fontStyle: "italic", textAlign: "center", padding: 16 }}>No comments yet. Start the conversation!</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} style={{ background: darkBg, border: `2px solid ${dimGold}`, padding: 16 }}>
                      <CommentItem comment={c} artworkId={artwork.artworkId} onReplyAdded={fetchComments} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: 320, background: darkBg, border: `2px solid ${dimGold}`, padding: 16 }}>
                {/* Guide messages list */}
                <div style={{ flex: 1, overflowY: "auto", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
                  {guideMessages.map((msg, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        padding: 12, maxWidth: "85%",
                        background: msg.role === "user" ? "#31260e" : panelBg,
                        border: `2px solid ${msg.role === "user" ? goldText : dimGold}`,
                        color: lightGold
                      }}>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isGuideThinking && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: 12, maxWidth: "80%", background: panelBg, border: `2px solid ${dimGold}`, color: dimGold, opacity: 0.7 }}>
                        <p style={{ margin: 0, fontSize: 13 }}>Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Guide input line */}
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    type="text"
                    value={guideInput}
                    onChange={(e) => setGuideInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGuideSubmit()}
                    placeholder="Ask about this artwork..."
                    disabled={isGuideThinking}
                    style={{ flex: 1, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, background: "#000", border: `2px solid ${dimGold}`, color: lightGold, outline: "none" }}
                  />
                  <button
                    onClick={handleGuideSubmit}
                    disabled={isGuideThinking || !guideInput.trim()}
                    style={{
                      fontFamily: "monospace", fontSize: 12, fontWeight: "bold", color: panelBg, background: goldText, border: `2px solid ${dimGold}`,
                      padding: "10px 20px", cursor: "pointer", boxShadow: "2px 2px 0 #000", textTransform: "uppercase",
                      opacity: (isGuideThinking || !guideInput.trim()) ? 0.5 : 1
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
