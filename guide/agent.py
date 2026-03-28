"""
Standalone Guide Agent for the Digital Art Museum.

Usage:
    python guide/agent.py                     # interactive CLI
    python guide/agent.py "starry night"      # single query, print response and exit

The agent connects directly to the museum SQLite database (no backend server
needed) and uses OpenAI gpt-4o-mini for natural-language responses.
Falls back to formatted keyword search results if no API key is set.
"""

import os
import sys

# Ensure guide/ package is importable when run directly
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)

# Also make backend/ importable for model imports
_backend = os.path.join(_root, "backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

from guide.config import OPENAI_API_KEY
from guide.db import get_session
from app.models import User, Room, Artwork  # from backend/

# Load system prompt
_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "guide_system.txt")
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


# ---------------------------------------------------------------------------
# Keyword search (mirrors guide_service.py logic, works without FastAPI)
# ---------------------------------------------------------------------------

def _keyword_search(query: str, db) -> list[dict]:
    """Score rooms by keyword relevance. Returns up to 5 results."""
    terms = [t.strip().lower() for t in query.split() if len(t.strip()) > 2]
    if not terms:
        rooms = db.query(Room).join(User).limit(5).all()
        return [{"username": r.owner.username, "reason": "Random suggestion", "score": 0, "artworks": []} for r in rooms]

    results: dict[str, dict] = {}

    def add(username: str, reason: str, score: int, artwork_title: str = ""):
        if username not in results:
            results[username] = {"username": username, "reason": reason, "score": 0, "artworks": []}
        results[username]["score"] += score
        if artwork_title and artwork_title not in results[username]["artworks"]:
            results[username]["artworks"].append(artwork_title)
        if score >= results[username].get("_top_score", 0):
            results[username]["reason"] = reason
            results[username]["_top_score"] = score

    for term in terms:
        like = f"%{term}%"

        for u in db.query(User).filter(User.username.ilike(f"{term}%")).all():
            add(u.username, f"Artist named '{u.username}'", 10)

        for r in db.query(Room).join(User).filter(Room.artist_description.ilike(like)).all():
            add(r.owner.username, f"Artist description mentions '{term}'", 5)

        for a in db.query(Artwork).join(Room).join(User).filter(Artwork.title.ilike(like)).all():
            add(a.room.owner.username, f"Has artwork titled '{a.title}'", 8, a.title)

        for a in db.query(Artwork).join(Room).join(User).filter(Artwork.description.ilike(like)).all():
            add(a.room.owner.username, f"Artwork '{a.title}' matches your interest", 3, a.title)

    sorted_results = sorted(results.values(), key=lambda x: x["score"], reverse=True)[:5]
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
# GuideAgent class
# ---------------------------------------------------------------------------

class GuideAgent:
    """
    Standalone museum guide agent. Connects to the local SQLite database
    and uses OpenAI to answer visitor queries.
    """

    def __init__(self):
        self._fallback_index = 0

    def search(self, query: str) -> list[dict]:
        """Keyword search across rooms and artworks. Returns scored result dicts."""
        db = get_session()
        try:
            return _keyword_search(query, db)
        finally:
            db.close()

    def chat(self, query: str) -> str:
        """
        Full chat response: keyword search → OpenAI context injection → response.
        Falls back to formatted text if no API key.
        """
        search_results = self.search(query)

        if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-your"):
            if search_results:
                names = ", ".join(f"@{r['username']}" for r in search_results[:3])
                return f"I found some rooms you might enjoy: {names}. Visit them to discover their art!"
            else:
                msg = _FALLBACKS[self._fallback_index % len(_FALLBACKS)]
                self._fallback_index += 1
                return msg

        context = _build_context(query, search_results)
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=200,
                temperature=0.7,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": context},
                ],
            )
            return completion.choices[0].message.content or _FALLBACKS[0]
        except Exception as e:
            if search_results:
                names = ", ".join(f"@{r['username']}" for r in search_results[:2])
                return f"Based on your interest, I'd recommend visiting {names}!"
            msg = _FALLBACKS[self._fallback_index % len(_FALLBACKS)]
            self._fallback_index += 1
            return msg

    def list_rooms(self) -> list[dict]:
        """Return all rooms with their artwork titles."""
        db = get_session()
        try:
            rooms = db.query(Room).join(User).all()
            result = []
            for room in rooms:
                result.append({
                    "username": room.owner.username,
                    "artist_description": room.artist_description or "(no description)",
                    "artworks": [a.title for a in sorted(room.artworks, key=lambda x: x.position_index)],
                })
            return result
        finally:
            db.close()

    def describe_room(self, username: str) -> str:
        """Return a formatted description of a room and its artworks."""
        db = get_session()
        try:
            user = db.query(User).filter(User.username == username.lower()).first()
            if not user or not user.room:
                return f"No room found for @{username}."
            room = user.room
            artworks = sorted(room.artworks, key=lambda a: a.position_index)
            lines = [
                f"Gallery: @{user.username}",
                f"Bio: {room.artist_description or '(no description)'}",
                f"Artworks ({len(artworks)}):",
            ]
            for a in artworks:
                lines.append(f"  [{a.position_index}] {a.title} — {a.description[:80]}...")
            return "\n".join(lines)
        finally:
            db.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _print_banner():
    print("=" * 55)
    print("  Digital Art Museum — Guide Agent")
    print("  Type a query to find rooms, or 'rooms' to list all.")
    print("  Type 'quit' or Ctrl+C to exit.")
    print("=" * 55)


def main():
    agent = GuideAgent()

    # Single-query mode: python guide/agent.py "my query"
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(agent.chat(query))
        return

    # Interactive mode
    _print_banner()
    while True:
        try:
            query = input("\nVisitor: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGuide: Goodbye! Come back and explore anytime.")
            break

        if not query:
            continue
        if query.lower() in ("quit", "exit", "q"):
            print("Guide: Goodbye! Come back and explore anytime.")
            break
        if query.lower() == "rooms":
            rooms = agent.list_rooms()
            if not rooms:
                print("Guide: No rooms in the museum yet!")
            else:
                print(f"Guide: Found {len(rooms)} galleries:")
                for r in rooms:
                    titles = ", ".join(r["artworks"]) if r["artworks"] else "empty"
                    print(f"  @{r['username']}: {titles}")
        elif query.lower().startswith("describe "):
            username = query[9:].strip()
            print(f"Guide: {agent.describe_room(username)}")
        else:
            print(f"Guide: {agent.chat(query)}")


if __name__ == "__main__":
    main()
