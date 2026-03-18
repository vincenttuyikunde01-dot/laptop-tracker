"""
=============================================================
  UR LAPTOP TRACKER - WINDOWS AGENT
  University of Rwanda Anti-Theft System
  Runs silently in background, pings server every 5 minutes
=============================================================
"""

import requests
import socket
import uuid
import getpass
import platform
import subprocess
import time
import logging
import os
import sys
import json
from datetime import datetime

# ─────────────────────────────────────────
#  CONFIG — Change SERVER_URL after deploy
# ─────────────────────────────────────────
SERVER_URL = "https://ur-laptop-tracker.onrender.com/api/ping"  # your Render URL
PING_INTERVAL = 300        # seconds (5 minutes)
LOG_FILE = os.path.join(os.environ.get("APPDATA", ""), "WinSysHelper", "agent.log")
DEVICE_ID_FILE = os.path.join(os.environ.get("APPDATA", ""), "WinSysHelper", "device.id")

# ─────────────────────────────────────────
#  LOGGING SETUP (hidden log file)
# ─────────────────────────────────────────
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def log(msg):
    logging.info(msg)


# ─────────────────────────────────────────
#  DEVICE ID — persistent unique hardware ID
# ─────────────────────────────────────────
def get_device_id():
    """Generate or load a persistent unique device ID."""
    if os.path.exists(DEVICE_ID_FILE):
        with open(DEVICE_ID_FILE, "r") as f:
            return f.read().strip()

    # Generate from MAC address + machine hostname (stable across reboots)
    mac = hex(uuid.getnode()).replace("0x", "").upper()
    hostname = platform.node()
    device_id = f"UR-{hostname}-{mac}"

    with open(DEVICE_ID_FILE, "w") as f:
        f.write(device_id)

    log(f"Generated new device_id: {device_id}")
    return device_id


# ─────────────────────────────────────────
#  COLLECT IP & GEO LOCATION
# ─────────────────────────────────────────
def get_ip_and_location():
    """Get public IP and approximate location using ip-api.com (free, no key needed)."""
    try:
        response = requests.get("http://ip-api.com/json/", timeout=8)
        data = response.json()
        if data.get("status") == "success":
            return {
                "ip_address": data.get("query"),
                "latitude": data.get("lat"),
                "longitude": data.get("lon"),
                "city": data.get("city"),
                "country": data.get("country"),
                "isp": data.get("isp"),
                "region": data.get("regionName")
            }
    except Exception as e:
        log(f"IP/Location fetch failed: {e}")

    # Fallback: try to get local IP only
    try:
        ip = socket.gethostbyname(socket.gethostname())
        return {"ip_address": ip}
    except:
        return {"ip_address": "unknown"}


# ─────────────────────────────────────────
#  COLLECT WIFI INFO (Windows)
# ─────────────────────────────────────────
def get_wifi_info():
    """Get WiFi SSID and BSSID (router MAC) using netsh on Windows."""
    wifi_name = "unknown"
    wifi_bssid = "unknown"

    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, text=True, timeout=5
        )
        output = result.stdout

        for line in output.splitlines():
            line = line.strip()
            if line.startswith("SSID") and "BSSID" not in line:
                wifi_name = line.split(":", 1)[-1].strip()
            elif line.startswith("BSSID"):
                wifi_bssid = line.split(":", 1)[-1].strip()

    except Exception as e:
        log(f"WiFi info fetch failed: {e}")

    return {"wifi_name": wifi_name, "wifi_bssid": wifi_bssid}


# ─────────────────────────────────────────
#  COLLECT OS USERNAME
# ─────────────────────────────────────────
def get_os_user():
    """Get the currently logged-in Windows username."""
    try:
        return getpass.getuser()
    except:
        return os.environ.get("USERNAME", "unknown")


# ─────────────────────────────────────────
#  COLLECT GMAIL ACCOUNTS (Windows Chrome)
# ─────────────────────────────────────────
def get_gmail_accounts():
    """
    Detect Gmail accounts signed into Google Chrome on Windows.
    Reads Chrome's local profile preferences (no password needed).
    """
    gmail_accounts = []

    try:
        chrome_base = os.path.join(
            os.environ.get("LOCALAPPDATA", ""),
            "Google", "Chrome", "User Data"
        )

        if not os.path.exists(chrome_base):
            return []

        # Scan all Chrome profiles (Default, Profile 1, Profile 2, ...)
        profiles = ["Default"] + [f"Profile {i}" for i in range(1, 10)]

        for profile in profiles:
            prefs_path = os.path.join(chrome_base, profile, "Preferences")
            if not os.path.exists(prefs_path):
                continue

            try:
                with open(prefs_path, "r", encoding="utf-8", errors="ignore") as f:
                    prefs = json.load(f)

                # Check account_info in profile
                account_info = prefs.get("account_info", [])
                for account in account_info:
                    email = account.get("email", "")
                    if "@" in email and email not in gmail_accounts:
                        gmail_accounts.append(email)
                        log(f"Found Gmail account: {email} in {profile}")

                # Also check signin info
                signin_email = prefs.get("google", {}).get("last_login_info", {}).get("email", "")
                if signin_email and signin_email not in gmail_accounts:
                    gmail_accounts.append(signin_email)

            except Exception as e:
                log(f"Could not read profile {profile}: {e}")
                continue

    except Exception as e:
        log(f"Gmail detection failed: {e}")

    return gmail_accounts


# ─────────────────────────────────────────
#  BUILD & SEND PING
# ─────────────────────────────────────────
def send_ping(device_id):
    """Collect all data and send a ping to the tracking server."""
    try:
        location_data = get_ip_and_location()
        wifi_data = get_wifi_info()
        os_user = get_os_user()
        gmail_accounts = get_gmail_accounts()

        payload = {
            "device_id": device_id,
            "os_user": os_user,
            "gmail_accounts": gmail_accounts,
            **location_data,
            **wifi_data
        }

        log(f"Sending ping: IP={payload.get('ip_address')}, "
            f"WiFi={payload.get('wifi_name')}, "
            f"User={os_user}, "
            f"Gmail={gmail_accounts}, "
            f"City={payload.get('city')}")

        response = requests.post(SERVER_URL, json=payload, timeout=10)

        if response.status_code == 200:
            data = response.json()
            command = data.get("command", "OK")
            log(f"Ping accepted. Server command: {command}")

            # If server says LOCK — lock the Windows machine
            if command == "LOCK":
                log("🔒 LOCK command received — locking workstation!")
                lock_machine()

        else:
            log(f"Ping rejected: {response.status_code} - {response.text}")

    except requests.exceptions.ConnectionError:
        log("No internet connection. Ping skipped.")
    except Exception as e:
        log(f"Ping error: {e}")


# ─────────────────────────────────────────
#  REMOTE LOCK (Windows)
# ─────────────────────────────────────────
def lock_machine():
    """Lock the Windows workstation remotely."""
    try:
        import ctypes
        ctypes.windll.user32.LockWorkStation()
        log("Workstation locked successfully.")
    except Exception as e:
        log(f"Lock failed: {e}")
        # Fallback: use rundll32
        try:
            subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"])
        except:
            pass


# ─────────────────────────────────────────
#  MAIN LOOP
# ─────────────────────────────────────────
def main():
    log("=" * 50)
    log("UR Laptop Tracker Agent Started")
    log(f"Platform: {platform.system()} {platform.release()}")
    log(f"Ping interval: {PING_INTERVAL}s")
    log("=" * 50)

    device_id = get_device_id()
    log(f"Device ID: {device_id}")

    while True:
        send_ping(device_id)
        time.sleep(PING_INTERVAL)


if __name__ == "__main__":
    main()
