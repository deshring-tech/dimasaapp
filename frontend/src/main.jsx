import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── PWA Service Worker (production builds only) ─────────────────────────────
// vite-plugin-pwa creates `virtual:pwa-register` at build time.
// In dev mode this module doesn't exist, so we skip it entirely.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        registerSW({
          onNeedRefresh() {
            console.info("[PWA] New content available — refresh to update.");
          },
          onOfflineReady() {
            console.info("[PWA] App is ready to work offline.");
          },
        });
      })
      .catch(() => {
        // Silent fail — PWA is enhancement, not core functionality
      });
  });
}
