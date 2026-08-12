// Central runtime config.
//
// In development: leave VITE_API_URL unset — Vite's dev proxy forwards /api
// and /socket.io to localhost:5000.
//
// In production (Vercel): set VITE_API_URL to the backend origin, e.g.
//   VITE_API_URL=https://dimasa-api.onrender.com
// Both the axios baseURL and the Socket.IO connection derive from it.

export const API_ORIGIN = import.meta.env.VITE_API_URL || "";

// Axios base: "<origin>/api" in prod, relative "/api" in dev (proxied)
export const API_BASE = `${API_ORIGIN}/api`;

// Socket.IO target: explicit origin in prod, same-origin "/" in dev (proxied)
export const SOCKET_URL = API_ORIGIN || "/";

// Google Sign-In client ID. When unset, the Google button is hidden.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Phone/OTP login. Hidden by default because there's no SMS provider wired yet —
// showing it would send users into a dead end (they'd never receive a code).
// Set VITE_ENABLE_PHONE_LOGIN=true once SMS (MSG91/Twilio/WhatsApp) is live.
// Admins can still reveal the form via the discreet link on the login screen.
export const PHONE_LOGIN_ENABLED =
  String(import.meta.env.VITE_ENABLE_PHONE_LOGIN || "").toLowerCase() === "true";
