from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Room
from app.schemas import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/register", response_model=TokenResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip().lower()

    if not username or len(username) < 2 or len(username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 2-20 characters")
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(username=username, password_hash=hash_password(data.password))
    db.add(user)
    db.flush()

    room = Room(owner_user_id=user.id, artist_description="")
    db.add(room)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_token(username), username=username)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    username = data.username.strip().lower()
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.password_hash:
        raise HTTPException(status_code=401, detail="Account has no password set. Please re-register.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return TokenResponse(access_token=create_token(username), username=username)


@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    """Legacy endpoint - creates user with password."""
    username = data.username.strip().lower()

    if not username or len(username) < 2 or len(username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 2-20 characters")

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(username=username, password_hash=hash_password(data.password))
    db.add(user)
    db.flush()

    room = Room(owner_user_id=user.id, artist_description="")
    db.add(room)
    db.commit()
    db.refresh(user)
    db.refresh(room)

    return UserResponse(
        id=user.id,
        username=user.username,
        room_id=room.id,
        created_at=user.created_at.isoformat(),
    )


@router.get("/{username}", response_model=UserResponse)
def get_user(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        username=user.username,
        room_id=user.room.id,
        created_at=user.created_at.isoformat(),
    )
