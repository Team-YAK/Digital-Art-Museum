from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserResponse(BaseModel):
    id: int
    username: str
    room_id: int
    created_at: str

    model_config = {"from_attributes": True}


class ArtworkResponse(BaseModel):
    id: int
    room_id: int
    title: str
    description: str
    image_url: str
    pixel_image_url: str
    position_index: int
    created_at: str

    model_config = {"from_attributes": True}


class RoomResponse(BaseModel):
    id: int
    owner_username: str
    artist_description: str
    artworks: list[ArtworkResponse]


class RoomUpdate(BaseModel):
    artist_description: str


class RandomRoomResponse(BaseModel):
    username: str


class ChatRequest(BaseModel):
    query: str


class ChatSuggestion(BaseModel):
    username: str
    reason: str


class ChatResponse(BaseModel):
    response: str
    suggestions: list[ChatSuggestion]


class CommentCreate(BaseModel):
    text: str
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    artwork_id: int
    user_id: int
    username: str
    parent_id: Optional[int]
    text: str
    created_at: str
    replies: list["CommentResponse"] = []


class LikeResponse(BaseModel):
    liked: bool
    count: int


class FeaturedArtworkResponse(BaseModel):
    id: int
    title: str
    pixel_image_url: str
    owner_username: str
