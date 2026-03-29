import sys
import os

# Resolve the backend directory (one level up from frontend/, then into backend/)
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from app.main import app
