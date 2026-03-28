"""
Read-only database connection for the standalone guide agent.
Imports models from backend/ by inserting it into sys.path.
"""

import sys
import os

# Make backend/ importable
_backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
if _backend_path not in sys.path:
    sys.path.insert(0, os.path.abspath(_backend_path))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from guide.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)


def get_session():
    """Return a new database session. Caller is responsible for closing."""
    return Session()
