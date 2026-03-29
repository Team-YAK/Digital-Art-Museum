from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ChatRequest, ChatResponse, ChatSuggestion
from app.services.guide_service import guide_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/guide", response_model=ChatResponse)
def chat_with_guide(data: ChatRequest, db: Session = Depends(get_db)):
    result = guide_chat(query=data.query, db=db, context=data.context, image_url=data.image_url)
    return ChatResponse(
        response=result["response"],
        suggestions=[
            ChatSuggestion(username=s["username"], reason=s["reason"])
            for s in result["suggestions"]
        ],
    )
