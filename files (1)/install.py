"""
=============================================================
  UR LAPTOP TRACKER - WINDOWS INSTALLER
  Run this ONCE as Administrator to install the agent.
  It will:
    1. Copy the agent to a hidden AppData folder
    2. Register it to run on every Windows startup
    3. Start it immediately in the background
=============================================================
  Usage: python install.py
=============================================================
"""

import os
import sys
import shutil
import subprocess
import winreg
import ctypes

# ─────────────────────────────────────────
#  PATHS
# ─────────────────────────────────────────
AGENT_NAME = "WinSysHelper"                     # disguised name (not "tracker")
APPDATA = os.environ.get("APPDATA", "")
INSTALL_DIR = os.path.join(APPDATA, AGENT_NAME)
AGENT_DEST = os.path.join(INSTALL_DIR, "syshelper.pyw")   # .pyw runs without console window
STARTUP_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"

def is_admin():
    """Check if script is running as administrator."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install():
    print("=" * 55)
    print("  UR Laptop Tracker — Agent Installer")
    print("=" * 55)

    # 1. Create hidden install directory
    os.makedirs(INSTALL_DIR, exist_ok=True)
    print(f"[1/4] Install directory ready: {INSTALL_DIR}")

    # 2. Copy agent.py to destination as .pyw (no console window)
    source = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent.py")
    if not os.path.exists(source):
        print("ERROR: agent.py not found next to installer!")
        sys.exit(1)

    shutil.copy2(source, AGENT_DEST)
    print(f"[2/4] Agent copied to: {AGENT_DEST}")

    # 3. Add to Windows Registry startup
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, STARTUP_KEY, 0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, AGENT_NAME, 0, winreg.REG_SZ, f'pythonw "{AGENT_DEST}"')
        winreg.CloseKey(key)
        print(f"[3/4] Registered in Windows startup registry as '{AGENT_NAME}'")
    except Exception as e:
        print(f"[3/4] WARNING: Could not set startup registry: {e}")
        print("      Trying Task Scheduler fallback...")
        install_via_task_scheduler()

    # 4. Launch the agent immediately (background, no window)
    try:
        subprocess.Popen(
            ["pythonw", AGENT_DEST],
            creationflags=subprocess.CREATE_NO_WINDOW,
            close_fds=True
        )
        print("[4/4] Agent started in background!")
    except Exception as e:
        print(f"[4/4] WARNING: Could not auto-start agent: {e}")
        print(f"      Run manually: pythonw \"{AGENT_DEST}\"")

    print("\n✅ Installation complete!")
    print(f"   The agent will now run silently every time this laptop starts.")
    print(f"   Logs are at: {os.path.join(INSTALL_DIR, 'agent.log')}")
    print("=" * 55)


def install_via_task_scheduler():
    """Fallback: use Windows Task Scheduler to run on startup."""
    try:
        task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger><Enabled>true</Enabled></LogonTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>pythonw</Command>
      <Arguments>"{AGENT_DEST}"</Arguments>
    </Exec>
  </Actions>
  <Settings>
    <Hidden>true</Hidden>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
  </Settings>
</Task>"""

        task_file = os.path.join(INSTALL_DIR, "task.xml")
        with open(task_file, "w", encoding="utf-16") as f:
            f.write(task_xml)

        subprocess.run(
            ["schtasks", "/create", "/tn", AGENT_NAME, "/xml", task_file, "/f"],
            capture_output=True
        )
        print("      Task Scheduler fallback registered.")
    except Exception as e:
        print(f"      Task Scheduler also failed: {e}")


def uninstall():
    """Remove the agent from the system."""
    print("Uninstalling UR Laptop Tracker Agent...")

    # Remove from registry
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, STARTUP_KEY, 0, winreg.KEY_SET_VALUE)
        winreg.DeleteValue(key, AGENT_NAME)
        winreg.CloseKey(key)
        print("✅ Removed from startup registry.")
    except:
        pass

    # Remove from task scheduler
    try:
        subprocess.run(["schtasks", "/delete", "/tn", AGENT_NAME, "/f"], capture_output=True)
        print("✅ Removed from Task Scheduler.")
    except:
        pass

    # Remove files
    try:
        shutil.rmtree(INSTALL_DIR)
        print(f"✅ Removed install directory: {INSTALL_DIR}")
    except Exception as e:
        print(f"WARNING: Could not remove files: {e}")

    print("Uninstall complete.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--uninstall":
        uninstall()
    else:
        install()
