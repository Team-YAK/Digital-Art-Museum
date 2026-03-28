from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Artwork, Comment, Like
from app.schemas import CommentCreate, CommentResponse, LikeResponse
from app.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/artworks", tags=["interactions"])


def _comment_response(c: Comment) -> CommentResponse:
    return CommentResponse(
        id=c.id,
        artwork_id=c.artwork_id,
        user_id=c.user_id,
        username=c.author.username,
        parent_id=c.parent_id,
        text=c.text,
        created_at=c.created_at.isoformat(),
        replies=[_comment_response(r) for r in sorted(c.replies, key=lambda r: r.created_at)],
    )


@router.get("/{artwork_id}/comments", response_model=list[CommentResponse])
def get_comments(artwork_id: int, db: Session = Depends(get_db)):
    artwork = db.query(Artwork).filter(Artwork.id == artwork_id).first()
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    top_level = (
        db.query(Comment)
        .filter(Comment.artwork_id == artwork_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at)
        .all()
    )
    return [_comment_response(c) for c in top_level]


@router.post("/{artwork_id}/comments", response_model=CommentResponse)
def add_comment(
    artwork_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artwork = db.query(Artwork).filter(Artwork.id == artwork_id).first()
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")

    if data.parent_id:
        parent = db.query(Comment).filter(
            Comment.id == data.parent_id, Comment.artwork_id == artwork_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = Comment(
        artwork_id=artwork_id,
        user_id=current_user.id,
        parent_id=data.parent_id,
        text=data.text.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return _comment_response(comment)


@router.get("/{artwork_id}/likes", response_model=LikeResponse)
def get_likes(
    artwork_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    artwork = db.query(Artwork).filter(Artwork.id == artwork_id).first()
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    count = db.query(func.count(Like.id)).filter(Like.artwork_id == artwork_id).scalar()
    liked = False
    if current_user:
        liked = db.query(Like).filter(
            Like.artwork_id == artwork_id, Like.user_id == current_user.id
        ).first() is not None

    return LikeResponse(liked=liked, count=count)


@router.post("/{artwork_id}/likes", response_model=LikeResponse)
def toggle_like(
    artwork_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artwork = db.query(Artwork).filter(Artwork.id == artwork_id).first()
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    existing = db.query(Like).filter(
        Like.artwork_id == artwork_id, Like.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
    else:
        db.add(Like(artwork_id=artwork_id, user_id=current_user.id))

    db.commit()

    count = db.query(func.count(Like.id)).filter(Like.artwork_id == artwork_id).scalar()
    liked = existing is None  # toggled: was not liked, now is

    return LikeResponse(liked=liked, count=count)
