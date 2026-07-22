import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { getMatches } from "../api";
import { useAuth } from "../context/AuthContext";
import { isCommunityMode } from "../lib/mode";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetched = useRef(0);

  const community = isCommunityMode(user);

  // Mode-aware nav items
  const NAV_ITEMS = [
    { path: "/home", icon: "🏠", label: "Home" },
    {
      path: "/matches",
      icon: community ? "🤝" : "❤️",
      label: community ? "Meet" : "Discover",
    },
    { path: "/chat", icon: "💬", label: "Chats" },
    { path: "/market", icon: "🏪", label: "Market" },
    { path: "/profile", icon: "👤", label: "Profile" },
  ];

  // ── Fetch unread count — throttled, NOT on every route change ──────────────
  useEffect(() => {
    const now = Date.now();
    // Only refetch if 30 seconds have passed since last fetch
    if (now - lastFetched.current < 30_000) return;
    lastFetched.current = now;

    getMatches()
      .then((res) => {
        const unread = res.data.filter((m) => m.unread).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [location.pathname]);

  // ── Decrement local count when user opens an unread chat ───────────────────
  useEffect(() => {
    if (location.pathname.startsWith("/chat/") && unreadCount > 0) {
      // Optimistic update — server marks as read on load
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                    bg-white border-t border-gray-100 flex items-center
                    safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const hasUnread = item.path === "/chat" && unreadCount > 0;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 flex flex-col items-center py-3 gap-0.5 relative"
          >
            <div className="relative">
              <span className={`text-2xl transition-transform ${isActive ? "scale-110" : "scale-100"}`}>
                {item.icon}
              </span>
              {hasUnread && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full
                                flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{unreadCount}</span>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-medium transition-colors
              ${isActive ? "text-primary" : "text-gray-400"}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
