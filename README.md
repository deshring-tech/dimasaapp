# Dimasa App

A dating and community app for the Dimasa community — built with Node.js, Prisma (SQLite), React, Vite, Socket.IO, and Tailwind CSS.

---

## Quick Start (Local Development)

### First Time Only
1. Install **Node.js LTS** from [nodejs.org](https://nodejs.org)
2. Double-click **`SETUP.bat`** — installs everything, creates the database
3. Done.

### Every Day
Double-click **`START-DIMASA.bat`** — opens the app automatically at [http://localhost:5173](http://localhost:5173)

> **OTP codes** print in the **blue backend window** during development (no SMS needed).

### Stop the App
Double-click **`STOP-DIMASA.bat`**

---

## Project Structure

```
dimasa-app/
├── backend/          Express + Prisma API (port 5000)
│   ├── server.js     Entry point
│   ├── prisma/       Database schema + SQLite file
│   └── src/
│       ├── routes/   auth, users, matches, messages, places
│       ├── socket/   Real-time chat (Socket.IO)
│       ├── middleware/  JWT auth
│       └── lib/      Singleton PrismaClient
├── frontend/         React + Vite PWA (port 5173)
│   ├── src/
│   │   ├── pages/    Login, Matches, Chat, Places, Profile
│   │   ├── components/
│   │   ├── context/  Auth state
│   │   └── api/      Axios client
│   └── public/       PWA icons
├── SETUP.bat         First-time setup script
├── START-DIMASA.bat  Daily launch script
└── STOP-DIMASA.bat   Stop all servers
```

---

## Backend .env

Copy `.env.example` to `.env` and fill in the values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite: `file:./prisma/dimasa.db` |
| `JWT_SECRET` | ✅ | Long random string (change before going live!) |
| `PORT` | ✅ | `5000` |
| `CLIENT_URL` | ✅ | Frontend URL e.g. `http://localhost:5173` |
| `TWILIO_SID` | Production | For SMS OTP |
| `TWILIO_TOKEN` | Production | For SMS OTP |
| `TWILIO_PHONE` | Production | For SMS OTP |

---

## Production Deployment (Docker)

```bash
# Create .env file with production values first
cp backend/.env.example backend/.env
# Edit backend/.env with real JWT_SECRET, CLIENT_URL, etc.

# Build and start
docker compose up --build -d
```

Frontend → port 80 | Backend → port 5000

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/send-otp` | — | Send OTP to phone |
| POST | `/api/auth/verify-otp` | — | Verify OTP, get JWT |
| GET | `/api/users/me` | ✅ | Current user profile |
| PUT | `/api/users/profile` | ✅ | Update profile |
| GET | `/api/users/discover` | ✅ | Discovery profiles |
| POST | `/api/matches/interest/:id` | ✅ | Express interest |
| GET | `/api/matches` | ✅ | Get all matches |
| GET | `/api/matches/liked-me` | ✅ Premium | Who liked you |
| GET | `/api/messages/:matchId` | ✅ | Get messages (paginated) |
| GET | `/api/places` | ✅ | List places |
| POST | `/api/places` | ✅ | Add a place |
| GET | `/api/places/meta/districts` | ✅ | List districts |
| GET | `/api/health` | — | Health check |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Node.js not found` | Install from nodejs.org and restart CMD |
| App not opening | Make sure both blue + purple windows are running |
| Wrong OTP | Look in the **blue** backend window for the code |
| Database error | Re-run SETUP.bat |
| Port 5000 in use | Change `PORT=5001` in `backend/.env` |
