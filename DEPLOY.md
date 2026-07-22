# Dimasa App — Deployment Guide

Free-tier stack: **Vercel** (frontend) + **Render** (backend) + **Neon** (Postgres).
Fixed cost: ₹0/month. Only cost is SMS OTPs once you wire a provider.

```
┌─────────────┐     HTTPS + WebSocket      ┌──────────────┐     SQL      ┌────────┐
│   Vercel    │ ─────────────────────────▶ │    Render    │ ───────────▶ │  Neon  │
│  (frontend) │                            │  (backend)   │              │  (DB)  │
└─────────────┘                            └──────────────┘              └────────┘
```

---

## Step 0 — Push the code to GitHub

1. Create a GitHub account if you don't have one: https://github.com
2. Create a **private** repository named `dimasa-app`
3. From `C:\dimasa-app`, run:

```bash
git init
git add .
git commit -m "Dimasa app — initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dimasa-app.git
git push -u origin main
```

> The `.gitignore` already excludes `.env`, `node_modules`, and the local SQLite DB —
> your secrets and local data will NOT be uploaded.

---

## Step 1 — Create the database (Neon)

1. Sign up at https://neon.tech (free, no card needed)
2. Create a project → name it `dimasa`
3. Copy the **connection string** — looks like:
   `postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/dimasa?sslmode=require`
4. Save it — you'll paste it into Render in Step 2.

---

## Step 2 — Deploy the backend (Render)

1. Sign up at https://render.com (free, sign in with GitHub)
2. **New → Blueprint** → connect your `dimasa-app` repo
   - Render reads `render.yaml` automatically and creates the `dimasa-api` service
   - (Alternative: New → Web Service → pick the repo → set Root Directory to `backend`,
     Build Command `npm ci && npm run build:prod`, Start Command `npm run start:prod`)
3. In the service's **Environment** tab, set:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` (should already be set by blueprint) |
   | `DATABASE_URL` | the Neon connection string from Step 1 |
   | `JWT_SECRET` | generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | `CLIENT_URL` | leave blank for now — set after Step 3 |

4. Deploy. First build takes ~3-5 minutes.
5. When live, note your backend URL: `https://dimasa-api.onrender.com` (or similar)
6. Test it: open `https://YOUR-BACKEND.onrender.com/api/health` — should show
   `{"status":"OK","app":"Dimasa App API","version":"1.0.0"}`

> **What start:prod does automatically:** pushes the Prisma schema to Neon,
> seeds the 16 sample places (NOT test users — production starts clean), starts the server.

---

## Step 3 — Deploy the frontend (Vercel)

1. Sign up at https://vercel.com (free, sign in with GitHub)
2. **Add New → Project** → import your `dimasa-app` repo
3. Configure:
   - **Root Directory:** `frontend`
   - Framework preset: Vite (auto-detected)
4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | your Render backend URL, e.g. `https://dimasa-api.onrender.com` |
   | `VITE_APP_URL` | your Vercel URL (add after first deploy, then redeploy) |

5. Deploy. Note your frontend URL: `https://dimasa-app.vercel.app` (or similar)

---

## Step 4 — Connect them (CORS)

1. Back in **Render → dimasa-api → Environment**, set:
   - `CLIENT_URL` = your Vercel URL, e.g. `https://dimasa-app.vercel.app`
   - (multiple origins? comma-separate: `https://a.vercel.app,https://www.dimasa.app`)
2. Render redeploys automatically. Done — frontend can now talk to backend.

---

## Step 5 — Keep the backend awake (UptimeRobot)

Render's free tier sleeps after 15 minutes idle (first visitor then waits ~50s).

1. Sign up at https://uptimerobot.com (free)
2. **Add New Monitor**:
   - Type: HTTP(s)
   - URL: `https://YOUR-BACKEND.onrender.com/api/health`
   - Interval: 5 minutes
3. Your backend now stays awake around the clock.

---

## Step 6 — Verify the deployment

1. Open your Vercel URL on a phone
2. The login screen loads (no Dev Quick Login section — that's dev-only ✅)
3. **⚠️ You cannot log in yet** — OTP has no SMS provider, and the `000000`
   backdoor is disabled in production. That's the last integration:

### Wiring SMS (when ready)

In `backend/src/routes/auth.js`, the Twilio call is scaffolded in comments.
- **MSG91** (Indian, cheaper ~₹0.20/SMS): https://msg91.com — use their OTP API
- **Twilio** (global): https://twilio.com — uncomment the scaffold, set
  `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_PHONE` env vars in Render

Until SMS is wired, production logins are impossible by design (secure default).

---

## Custom domain (optional)

1. Buy a domain (e.g. `dimasa.app`) from Namecheap/GoDaddy/Cloudflare
2. **Vercel → Project → Settings → Domains** → add it, follow DNS instructions
3. Add the new domain to `CLIENT_URL` in Render (comma-separated with the vercel.app URL)
4. Update `VITE_APP_URL` in Vercel env vars

---

## How future updates deploy

```bash
git add .
git commit -m "describe the change"
git push
```

Both Vercel and Render auto-deploy on every push to `main`. That's it.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend loads but API calls fail | Check `VITE_API_URL` in Vercel + redeploy frontend |
| "Not allowed by CORS" in console | `CLIENT_URL` in Render must exactly match the frontend origin (https, no trailing slash) |
| Backend crashes on boot: "FATAL: JWT_SECRET" | Set a proper long `JWT_SECRET` in Render |
| Chat/toasts don't work | Verify the browser connects to `wss://YOUR-BACKEND.onrender.com` (Network tab) |
| First request takes ~50s | Render free tier waking up — set up UptimeRobot (Step 5) |
| Prisma error about provider mismatch | Render must run `npm run build:prod` (swaps in the Postgres schema) |

---

## Local development — unchanged

`DIMASA.bat` still works exactly as before: SQLite, dev OTP `000000`, quick-login
buttons, test users. Nothing about local dev changed.
