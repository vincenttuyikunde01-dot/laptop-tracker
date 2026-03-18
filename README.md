# 🔒 UR Laptop Tracker
### University of Rwanda — Anti-Theft Laptop Tracking System

---

## 📌 What This System Does
- Every laptop runs a silent **agent** that pings the server every few minutes
- Each ping records: **IP address, GPS location, WiFi name, OS username, timestamp**
- If a laptop is **reported stolen**, all future pings are **flagged as suspicious**
- Admins can generate an **evidence report** to prove theft — protecting innocent students

---

## 🗂️ Project Structure
```
laptop-tracker/
├── server/
│   ├── index.js                  # Main Express server
│   ├── config/
│   │   └── db.js                 # Supabase DB connection
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── controllers/
│   │   ├── authController.js     # Register, Login
│   │   ├── laptopController.js   # Laptop management
│   │   └── locationController.js # Tracking & evidence
│   └── routes/
│       └── index.js              # All API routes
├── database/
│   └── schema.sql                # Run this in Supabase
├── .env.example                  # Copy to .env and fill in
├── package.json
└── README.md
```

---

## 🚀 Setup Guide (Step by Step)

### Step 1: Create Supabase Project (Free)
1. Go to [supabase.com](https://supabase.com) → Sign up free
2. Create a new project
3. Go to **SQL Editor** → paste the entire contents of `database/schema.sql` → Run it
4. Go to **Settings → Database** → copy your **Connection String**

### Step 2: Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `DATABASE_URL` — your Supabase connection string
- `JWT_SECRET` — any long random string (e.g. `openssl rand -base64 32`)

### Step 3: Install & Run
```bash
npm install
npm run dev       # development (auto-restart)
npm start         # production
```

### Step 4: Deploy Free on Render.com
1. Go to [render.com](https://render.com) → Sign up free
2. Create new **Web Service** → connect your GitHub repo
3. Set environment variables (same as your `.env`)
4. Deploy! You get a free URL like `https://ur-laptop-tracker.onrender.com`

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Student registers |
| POST | `/api/auth/login` | None | Student login |
| POST | `/api/auth/admin/login` | None | Admin login |
| GET | `/api/laptops/my` | Student | Get my laptop info |
| POST | `/api/laptops/report-stolen` | Student | Report laptop stolen |
| POST | `/api/laptops/register` | Admin | Register new laptop |
| GET | `/api/laptops` | Admin | List all laptops |
| GET | `/api/laptops/stolen` | Admin | List stolen laptops |
| POST | `/api/ping` | None | Agent sends location |
| GET | `/api/locations/:id` | Auth | Location history |
| GET | `/api/locations/:id/last` | Auth | Last known location |
| GET | `/api/locations/:id/evidence` | Admin | Evidence report |

---

## 🔜 Next Steps (What to Build Next)
1. **Python Laptop Agent** — runs silently on startup, pings every 5 mins
2. **Web Dashboard** — Admin UI to see all laptops on a map
3. **Remote Lock** — When laptop pings back, server sends LOCK command
4. **Email/SMS Alerts** — Notify student when stolen laptop is detected online

---

## 💡 Built by a UR Student, for UR Students
This project was born from a real problem at the University of Rwanda.
Every ping is a timestamp. Every timestamp is evidence.
