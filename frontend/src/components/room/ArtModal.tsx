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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-white/10 overflow-hidden animate-fade-in-up"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 glass-button w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
        >
          ✕
        </button>

        {/* Image Section */}
        <div className="relative w-full bg-black/60 border-b border-white/10 flex items-center justify-center p-4">
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="max-h-[35vh] w-auto object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-3xl font-bold text-white tracking-tight text-gradient">
              {artwork.title}
            </h2>
            <div className="flex flex-col items-end">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  likeData.liked
                    ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40"
                }`}
              >
                <span className="text-lg">{likeData.liked ? "♥" : "♡"}</span>
                <span className="font-medium">{likeData.count}</span>
              </button>
              {likeError && <span className="text-xs tracking-wider text-red-400 mt-1">{likeError}</span>}
            </div>
          </div>

          {artwork.description && (
            <p className="text-gray-300 leading-relaxed mb-6 font-light">
              {artwork.description}
            </p>
          )}

          {isOwner && onDelete && artwork.positionIndex !== undefined && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="mb-8 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
            >
              {isDeleting ? "Removing..." : "Remove Artwork"}
            </button>
          )}

          {/* Discussion / AI Guide Section */}
          <div className="mt-6 pt-6 border-t border-white/10">
            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab("comments")}
                className={`pb-2 text-lg font-semibold tracking-wide uppercase transition-colors ${
                  activeTab === "comments"
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Discussion ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab("guide")}
                className={`pb-2 text-lg font-semibold tracking-wide uppercase transition-colors flex items-center gap-2 ${
                  activeTab === "guide"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <span>AI Guide</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">Beta</span>
              </button>
            </div>
            
            {activeTab === "comments" ? (
              <>
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    placeholder="Share your thoughts..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                    disabled={submittingComment}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-xl font-medium transition-all shadow-lg active:scale-95 border border-white/10"
                  >
                    Post
                  </button>
                </div>

                {commentError && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-2 rounded-lg">{commentError}</p>}

                <div className="space-y-4">
                  {comments.length === 0 && (
                    <p className="text-gray-500 italic text-center py-4">No comments yet. Start the conversation!</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <CommentItem
                        comment={c}
                        artworkId={artwork.artworkId}
                        onReplyAdded={fetchComments}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-[320px] bg-black/30 rounded-xl border border-white/5 p-4 box-border">
                {/* Guide messages list */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/20">
                  {guideMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-3 rounded-xl max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-purple-900/40 border border-purple-500/30 text-white rounded-br-none"
                            : "bg-white/5 border border-white/10 text-gray-300 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isGuideThinking && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 text-gray-400 p-3 rounded-xl rounded-bl-none max-w-[80%] animate-pulse">
                        <p className="text-sm">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Guide input line */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={guideInput}
                    onChange={(e) => setGuideInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGuideSubmit()}
                    placeholder="Ask about this artwork..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 font-sans"
                    disabled={isGuideThinking}
                  />
                  <button
                    onClick={handleGuideSubmit}
                    disabled={isGuideThinking || !guideInput.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg active:scale-95 border border-white/10"
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
