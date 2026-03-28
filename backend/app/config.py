import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'data', 'museum.db')}"
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PIXEL_DIR = os.path.join(UPLOAD_DIR, "pixel")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
