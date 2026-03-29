import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_default_db = f"sqlite:///{os.path.join(BASE_DIR, 'data', 'museum.db')}"
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PIXEL_DIR = os.path.join(UPLOAD_DIR, "pixel")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# Supabase S3 Configuration (Fallback to local if disabled)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "artworks")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
