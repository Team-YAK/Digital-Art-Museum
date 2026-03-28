from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room", back_populates="owner", uselist=False)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    artist_description = Column(Text, default="")

    owner = relationship("User", back_populates="room")
    artworks = relationship("Artwork", back_populates="room", order_by="Artwork.position_index")


class Artwork(Base):
    __tablename__ = "artworks"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    image_url = Column(String, nullable=False)
    pixel_image_url = Column(String, nullable=False)
    position_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room", back_populates="artworks")

    __table_args__ = (
        UniqueConstraint("room_id", "position_index", name="uq_room_position"),
    )
