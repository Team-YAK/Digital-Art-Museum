import sys
import os

# Append the backend directory so that 'app.main' perfectly resolves within Vercel's Edge Environment
backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
sys.path.insert(0, backend_dir)

from app.main import app
