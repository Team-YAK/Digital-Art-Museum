"""
Chat router for the Guide NPC.

The actual search/RAG logic will be implemented by another team member
in services/guide_service.py. This router provides the endpoint shell
and a basic fallback response.
"""

from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse, ChatSuggestion

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Fallback responses when guide_service is not yet wired up
_FALLBACK_RESPONSES = [
    "Welcome to the Digital Art Museum! Feel free to explore the galleries.",
    "Each artist has their own room filled with unique creations. Try visiting a random room!",
    "The museum is always growing as new artists join. Check back often for new galleries!",
    "I'd love to help you find something specific. Try asking about a style or artist!",
]

_response_index = 0


@router.post("/guide", response_model=ChatResponse)
def chat_with_guide(data: ChatRequest):
    """
    Guide NPC endpoint.

    Currently returns fallback responses. Once guide_service.py is
    implemented with search/RAG, this will be wired up to return
    real search results and AI-generated responses.
    """
    global _response_index

    # TODO: Wire up to guide_service.search_rooms() + guide_service.guide_chat()
    # once the RAG/search implementation is complete.
    #
    # Expected integration:
    #   from app.services.guide_service import guide_chat
    #   result = guide_chat(data.query)
    #   return ChatResponse(response=result["response"], suggestions=result["suggestions"])

    response_text = _FALLBACK_RESPONSES[_response_index % len(_FALLBACK_RESPONSES)]
    _response_index += 1

    return ChatResponse(
        response=response_text,
        suggestions=[],
    )
