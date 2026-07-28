import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "../lib/config";

const GIS_SRC = "https://accounts.google.com/gsi/client";

// Loads the Google Identity Services script once and renders the official
// "Sign in with Google" button. Calls onCredential(idToken) when the user
// completes sign-in. Renders nothing if VITE_GOOGLE_CLIENT_ID is unset.
export default function GoogleButton({ onCredential, disabled }) {
  const holder = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load the GIS script once
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) setReady(true);
      else existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);
    s.onerror = () => setFailed(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !window.google?.accounts?.id || !holder.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) onCredential(response.credential);
        },
      });
      holder.current.innerHTML = "";
      window.google.accounts.id.renderButton(holder.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
      });
    } catch {
      setFailed(true);
    }
  }, [ready, onCredential]);

  // Hidden entirely if Google isn't configured
  if (!GOOGLE_CLIENT_ID) return null;

  if (failed) {
    return (
      <p className="text-xs text-gray-400 text-center">
        Google sign-in unavailable right now.
      </p>
    );
  }

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <div ref={holder} className="flex justify-center" />
    </div>
  );
}
