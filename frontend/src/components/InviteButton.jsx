import { useState } from "react";

// Where the app actually lives — switch this when deploying.
// In dev, this points to your local IP; in prod, to your domain.
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const SHARE_MESSAGE = `Hey! I'm using *Dimasa* — a community app to connect with Dimasa people, find friends, and meet new people. Join me here: ${APP_URL}`;

export default function InviteButton({
  variant = "primary",   // "primary" | "ghost" | "card"
  size = "md",           // "sm" | "md" | "lg"
  label = "Invite Dimasa Friends",
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Use native share sheet if available (best on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Dimasa",
          text: SHARE_MESSAGE,
          url: APP_URL,
        });
        return;
      } catch {
        // User cancelled — fall through to fallback
      }
    }

    // Fallback 1: WhatsApp web/app deep link
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;
    const opened = window.open(whatsappUrl, "_blank");

    // Fallback 2: copy to clipboard if popup blocked
    if (!opened) {
      try {
        await navigator.clipboard.writeText(SHARE_MESSAGE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // last-resort: do nothing
      }
    }
  };

  const sizeClasses =
    size === "lg"
      ? "py-3 px-6 text-base"
      : size === "sm"
      ? "py-2 px-3 text-xs"
      : "py-2.5 px-5 text-sm";

  const variantClasses =
    variant === "ghost"
      ? "text-emerald-700 border-2 border-emerald-200 bg-white hover:bg-emerald-50"
      : variant === "card"
      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/30"
      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow shadow-emerald-600/30";

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
                  active:scale-95 transition-all ${sizeClasses} ${variantClasses} ${className}`}
    >
      <span>{copied ? "✓ Copied!" : "📲"}</span>
      <span>{copied ? "Message copied" : label}</span>
    </button>
  );
}
