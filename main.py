#!/usr/bin/env python3
"""
Launcher for Digital Art Museum.
Clears ports 3000 and 8000 before starting, so it always works cleanly.
Usage: python3 main.py
"""

import subprocess
import sys
import os
import time
import signal


def free_port(port: int):
    """Kill any process currently using the given port."""
    result = subprocess.run(
        ["lsof", "-ti", f":{port}"],
        capture_output=True, text=True
    )
    pids = result.stdout.strip().split()
    for pid in pids:
        if pid:
            subprocess.run(["kill", "-9", pid], capture_output=True)
    if pids:
        print(f"  Freed port {port} (killed {len(pids)} process(es))")


def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_dir, "backend")
    frontend_dir = os.path.join(project_dir, "frontend")
    backend_venv = os.path.join(backend_dir, "venv", "bin", "activate")

    processes = []

    def cleanup(signum, frame):
        print("\nShutting down...")
        for p in processes:
            if p and p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("Stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("Digital Art Museum")
    print("=" * 40)

    # Clear any stale processes on both ports
    print("Clearing ports...")
    free_port(8000)
    free_port(3000)
    time.sleep(1)

    # Start backend
    print("Starting backend on http://localhost:8000 ...")
    backend_process = subprocess.Popen(
        f"source {backend_venv} && python run.py",
        shell=True,
        cwd=backend_dir,
    )
    processes.append(backend_process)
    time.sleep(3)

    # Start frontend
    print("Starting frontend on http://localhost:3000 ...")
    frontend_process = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=frontend_dir,
    )
    processes.append(frontend_process)

    print("=" * 40)
    print("Open http://localhost:3000")
    print("API docs: http://localhost:8000/docs")
    print("Press Ctrl+C to stop")
    print("=" * 40)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup(None, None)


if __name__ == "__main__":
    main()
