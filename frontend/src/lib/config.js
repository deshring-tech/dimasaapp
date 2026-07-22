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
