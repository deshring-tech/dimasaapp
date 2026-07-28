# Google Sign-In Setup

The "Continue with Google" button is **already built into the app**. It stays
hidden until you create a Google OAuth Client ID and set two environment
variables. This is a one-time, ~10-minute setup. It's **free**.

---

## Step 1 — Create an OAuth Client ID (Google Cloud Console)

1. Go to **https://console.cloud.google.com**
2. Top bar → project dropdown → **New Project** → name it `Dimasa` → **Create**
   *(or reuse an existing project)*
3. Left menu → **APIs & Services** → **OAuth consent screen**
   - User type: **External** → **Create**
   - App name: `Dimasa`
   - User support email: your email
   - Developer contact email: your email
   - **Save and Continue** through the Scopes and Test users steps (defaults are fine)
   - Back on the summary, **Publish App** (so anyone can sign in, not just test users)
4. Left menu → **APIs & Services** → **Credentials**
   - **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Dimasa Web`
   - Under **Authorized JavaScript origins**, click **+ Add URI** for each:
     ```
     https://dimasaapp.vercel.app
     https://dimasaapp-git-main-hirerecrui.vercel.app
     http://localhost:5173
     ```
     *(add your custom domain too if you have one)*
   - **Authorized redirect URIs**: leave empty (we use the token flow, not redirects)
   - **Create**
5. A popup shows your **Client ID** — looks like:
   ```
   1234567890-abcdefg.apps.googleusercontent.com
   ```
   Copy it. (You do NOT need the client secret for this flow.)

---

## Step 2 — Set the environment variables

### On Vercel (frontend)
1. Vercel → your project → **Settings** → **Environment Variables**
2. Add:
   | Key | Value |
   |-----|-------|
   | `VITE_GOOGLE_CLIENT_ID` | your Client ID from Step 1 |
3. **Redeploy** (Deployments → latest → ⋯ → Redeploy) so the build picks it up.

### On Render (backend)
1. Render → your service → **Environment**
2. Add:
   | Key | Value |
   |-----|-------|
   | `GOOGLE_CLIENT_ID` | the **same** Client ID |
3. **Save** → auto-redeploys.

> ⚠️ Both must be the **same** Client ID. The frontend uses it to show Google's
> button; the backend uses it to verify the login is genuine.

---

## Step 3 — Test

1. Open `https://dimasaapp.vercel.app`
2. Below "Send OTP" you'll now see an **"or"** divider and a **Continue with Google** button
3. Tap it → pick your Google account → you're logged in
4. First-time Google users go through profile setup (name is pre-filled from Google)

---

## How it works (for reference)

- Frontend loads Google Identity Services and shows the official button.
- On sign-in, Google returns an **ID token** to the browser.
- The browser sends it to `POST /api/auth/google`.
- The backend **verifies the token with Google** (`google-auth-library`), then
  finds or creates the user by their Google ID / email and issues your app's JWT.
- No passwords, no secrets in the browser, no per-login cost.

## Notes

- **Free forever** — no per-login charges (unlike SMS).
- Phone login still works alongside Google — users can use either.
- If a user signs in with Google using an email that already has a phone
  account, the two are linked automatically.
- Until you complete this setup, the button simply doesn't appear — the app
  works exactly as before.
