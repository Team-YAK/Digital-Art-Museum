#!/usr/bin/env python3
"""
Launcher script for Digital Art Museum
Starts both backend (FastAPI) and frontend (Next.js) servers
"""

import subprocess
import sys
import os
import time
import signal

def main():
    # Get the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_dir, "backend")
    frontend_dir = os.path.join(project_dir, "frontend")

    # Processes to track
    processes = []

    def cleanup(signum, frame):
        print("\n\nShutting down servers...")
        for p in processes:
            if p and p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("All servers stopped.")
        sys.exit(0)

    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("🎨 Digital Art Museum - Launcher")
    print("=" * 50)

    # Start backend
    print("\n📦 Starting backend (FastAPI on http://localhost:8000)...")
    backend_venv = os.path.join(backend_dir, "venv", "bin", "activate")
    backend_cmd = f"source {backend_venv} && python run.py"
    backend_process = subprocess.Popen(
        backend_cmd,
        shell=True,
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(backend_process)

    # Give backend time to start
    time.sleep(3)

    # Start frontend
    print("🌐 Starting frontend (Next.js on http://localhost:3000)...")
    frontend_cmd = "npm run dev"
    frontend_process = subprocess.Popen(
        frontend_cmd,
        shell=True,
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(frontend_process)

    print("\n" + "=" * 50)
    print("✅ Both servers are starting...")
    print("🎮 Open http://localhost:3000 in your browser")
    print("📚 API docs: http://localhost:8000/docs")
    print("Press Ctrl+C to stop both servers")
    print("=" * 50 + "\n")

    # Monitor processes
    try:
        while True:
            # Check if any process has died
            for i, p in enumerate(processes):
                if p and p.poll() is not None:
                    print(f"\n⚠️  Process {i} has exited")
                    # One server crashed, still let the user stop with Ctrl+C
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup(None, None)


if __name__ == "__main__":
    main()
