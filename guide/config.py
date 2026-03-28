import os
from dotenv import load_dotenv

# Load API keys from backend/.env
_here = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_here, "..", "backend", ".env")
load_dotenv(_env_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DB_PATH = os.path.join(_here, "..", "backend", "data", "museum.db")
DATABASE_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"
