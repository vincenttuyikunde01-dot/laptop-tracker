# 🕵️ UR Laptop Tracker — Windows Agent

The silent tracking agent that runs on every University of Rwanda student laptop.

---

## 📦 Files
| File | Purpose |
|------|---------|
| `agent.py` | Main agent — collects data & pings server |
| `install.py` | One-time installer — sets up startup & runs agent |
| `build.py` | Compiles agent to `.exe` for easy distribution |
| `requirements.txt` | Python dependencies |
| `migration_add_gmail.sql` | Run in Supabase to add Gmail tracking column |

---

## 🔍 What The Agent Collects Every 5 Minutes

| Data | How |
|------|-----|
| **Public IP Address** | ip-api.com (free) |
| **GPS Coordinates** | IP-based geolocation |
| **City & Country** | IP-based geolocation |
| **ISP Name** | IP-based geolocation |
| **WiFi Network Name (SSID)** | `netsh wlan show interfaces` |
| **WiFi Router MAC (BSSID)** | `netsh wlan show interfaces` |
| **Windows Username** | `getpass.getuser()` |
| **Gmail Accounts** | Chrome profile Preferences file |

---

## 🚀 Installation Guide

### Option A: Python Script (for testing)
```bash
# 1. Install Python 3.x on the laptop
# 2. Install dependencies
pip install -r requirements.txt

# 3. Edit agent.py — set your SERVER_URL
# Change this line:
SERVER_URL = "https://ur-laptop-tracker.onrender.com/api/ping"

# 4. Run the installer (sets up startup + launches agent)
python install.py

# To uninstall:
python install.py --uninstall
```

### Option B: Compile to .exe (for mass deployment)
```bash
# 1. Install pyinstaller
pip install pyinstaller

# 2. Build the exe
python build.py

# 3. Distribute dist/WinSysHelper.exe to all laptops
# 4. On each laptop, run install.py alongside the .exe
```

---

## 🔒 Security & Privacy Notes
- The agent runs as **WinSysHelper** — a disguised name
- Logs are stored in `%APPDATA%\WinSysHelper\agent.log`
- The agent only **reads** Chrome preferences — it never reads passwords
- All data is sent to your own private server (no third parties)
- Only university admins can view the tracking data

---

## 🔜 How the LOCK command works
If a laptop is reported stolen:
1. Server marks it as `is_reported_stolen = TRUE`
2. Next time the laptop pings, server responds with `{"command": "LOCK"}`
3. Agent immediately calls `LockWorkStation()` — Windows login screen appears
4. Thief is locked out! 🔒

---

## ⚙️ Customization
- Change `PING_INTERVAL` in `agent.py` to ping more/less often (default: 300s = 5 min)
- Change `SERVER_URL` to point to your deployed server
- Add more Chrome-based browsers (Edge, Brave) by adding their AppData paths
