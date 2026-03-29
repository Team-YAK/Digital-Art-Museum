"""
Guide NPC service.

Two-layer approach:
  1. search_rooms()  -- SQL keyword search across users, rooms, artworks (no RAG/embeddings)
  2. guide_chat()    -- injects search results as context into an OpenAI gpt-4o-mini call

Your friend can layer vector/embedding search on top of search_rooms() later
without touching this file's structure -- just swap out or extend _keyword_search().
"""

import os
from sqlalchemy.orm import Session
from sqlalchemy import or_
import base64
from app.models import User, Room, Artwork
from app.config import OPENAI_API_KEY, UPLOAD_DIR

# Load system prompt once at import time
_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "guide_system.txt")
try:
    with open(_PROMPT_PATH) as f:
        _SYSTEM_PROMPT = f.read().strip()
except FileNotFoundError:
    _SYSTEM_PROMPT = "You are a helpful museum guide. Suggest rooms based on search results."

_FALLBACKS = [
    "Welcome to the Digital Art Museum! Try exploring a random room to get started.",
    "I couldn't find an exact match, but every gallery here has something unique to offer!",
    "That's a great question — try browsing some rooms and see what catches your eye!",
    "The museum is always growing. Check back soon for new artists and galleries!",
]
_fallback_index = 0


# ---------------------------------------------------------------------------
# Layer 1: Keyword search
# ---------------------------------------------------------------------------

def search_rooms(query: str, db: Session) -> list[dict]:
    """
    Keyword search across usernames, artist descriptions, artwork titles
    and descriptions. Returns up to 5 scored results.

    Each result dict has:
        username    -- room owner's username
        reason      -- human-readable match explanation
        score       -- integer relevance score (higher = better)
        artworks    -- list of matching artwork titles
    """
    terms = [t.strip().lower() for t in query.split() if len(t.strip()) > 2]
    if not terms:
        # Return a few random rooms as suggestions
        rooms = db.query(Room).join(User).limit(5).all()
        return [{"username": r.owner.username, "reason": "Random suggestion", "score": 0, "artworks": []} for r in rooms]

    results: dict[str, dict] = {}  # keyed by username

    def add(username: str, reason: str, score: int, artwork_title: str = ""):
        if username not in results:
            results[username] = {"username": username, "reason": reason, "score": 0, "artworks": []}
        results[username]["score"] += score
        if artwork_title and artwork_title not in results[username]["artworks"]:
            results[username]["artworks"].append(artwork_title)
        # Update reason with highest-scoring match
        if score >= results[username].get("_top_score", 0):
            results[username]["reason"] = reason
            results[username]["_top_score"] = score

    for term in terms:
        like = f"%{term}%"

        # Username exact prefix match (high score)
        users = db.query(User).filter(User.username.ilike(f"{term}%")).all()
        for u in users:
            add(u.username, f"Artist named '{u.username}'", 10)

        # Artist description match
        rooms = (
            db.query(Room)
            .join(User)
            .filter(Room.artist_description.ilike(like))
            .all()
        )
        for r in rooms:
            add(r.owner.username, f"Artist description mentions '{term}'", 5)

        # Artwork title match (high relevance)
        artworks = db.query(Artwork).join(Room).join(User).filter(Artwork.title.ilike(like)).all()
        for a in artworks:
            add(a.room.owner.username, f"Has artwork titled '{a.title}'", 8, a.title)

        # Artwork description match
        artworks_desc = (
            db.query(Artwork).join(Room).join(User).filter(Artwork.description.ilike(like)).all()
        )
        for a in artworks_desc:
            add(a.room.owner.username, f"Artwork '{a.title}' matches your interest", 3, a.title)

    # Sort by score descending, return top 5
    sorted_results = sorted(results.values(), key=lambda x: x["score"], reverse=True)[:5]
    # Strip internal score key
    for r in sorted_results:
        r.pop("_top_score", None)
    return sorted_results


def _build_context(query: str, search_results: list[dict]) -> str:
    if not search_results:
        return f"Visitor query: '{query}'\n\nNo matching rooms found in the museum."

    lines = [f"Visitor query: '{query}'\n", "Matching rooms found:"]
    for i, r in enumerate(search_results, 1):
        artworks_str = ", ".join(r["artworks"][:3]) if r["artworks"] else "no indexed artworks"
        lines.append(f"  {i}. @{r['username']} — {r['reason']} (artworks: {artworks_str})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Layer 2: OpenAI chat
# ---------------------------------------------------------------------------

def _encode_image_file(image_url: str) -> str | None:
    try:
        import urllib.parse
        parsed = urllib.parse.urlparse(image_url)
        path = parsed.path 
        if "/media/uploads/" in path:
            rel_path = path.split("/media/uploads/")[-1] 
            abs_path = os.path.join(UPLOAD_DIR, rel_path)
            if os.path.exists(abs_path):
                with open(abs_path, "rb") as image_file:
                    return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
    return None

def guide_chat(query: str, db: Session, context: str | None = None, image_url: str | None = None) -> dict:
    """
    Returns {"response": str, "suggestions": [{"username": str, "reason": str}]}

    Falls back to a canned response if OpenAI is unavailable or the key is missing.
    """
    global _fallback_index

    search_results = search_rooms(query, db)
    suggestions = [{"username": r["username"], "reason": r["reason"]} for r in search_results]

    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-your"):
        # No real key -- return formatted search results as text
        if search_results:
            names = ", ".join(f"@{r['username']}" for r in search_results[:3])
            response = f"I found some rooms you might enjoy: {names}. Click a suggestion below to visit!"
        else:
            response = _FALLBACKS[_fallback_index % len(_FALLBACKS)]
            _fallback_index += 1
        return {"response": response, "suggestions": suggestions}

    # Build context from search results
    full_context = _build_context(query, search_results)
    if context:
        full_context += f"\n\n[IMPORTANT: THE VISITOR IS CURRENTLY VIEWING THIS SPECIFIC ARTWORK]:\n{context}\nAnswer their query mainly about this artwork if relevant!"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)

        user_content = [{"type": "text", "text": full_context}]
        
        if image_url:
            base64_img = _encode_image_file(image_url)
            if base64_img:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_img}", "detail": "high"}
                })
            elif image_url.startswith("http") and "localhost" not in image_url and "127.0.0.1" not in image_url:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"}
                })

        completion = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            temperature=0.7,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        response_text = completion.choices[0].message.content or _FALLBACKS[0]
    except Exception as e:
        # Any OpenAI error -- graceful degradation
        if search_results:
            names = ", ".join(f"@{r['username']}" for r in search_results[:2])
            response_text = f"Based on your interest, I'd recommend visiting {names}!"
        else:
            response_text = _FALLBACKS[_fallback_index % len(_FALLBACKS)]
            _fallback_index += 1

    return {"response": response_text, "suggestions": suggestions}
