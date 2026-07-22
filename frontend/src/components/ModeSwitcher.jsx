import { useState } from "react";
import { switchMode } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const MODES = [
  {
    id: "friends",
    label: "Community",
    icon: "🤝",
    activeClass: "bg-emerald-600 text-white shadow-sm",
    hint: "Just connect · free",
  },
  {
    id: "dating",
    label: "Dating",
    icon: "💫",
    activeClass: "bg-primary text-white shadow-sm",
    hint: "Meet new people",
  },
  {
    id: "serious",
    label: "Serious",
    icon: "💍",
    activeClass: "bg-rose-700 text-white shadow-sm",
    hint: "Long-term partner",
  },
];

// One-tap toggle to switch what mode the app is in.
// On switch: updates the user's intent server-side, refreshes context,
// then calls `onSwitched` so the parent can refetch data (like Discovery).
export default function ModeSwitcher({ onSwitched }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(null); // "friends" | "dating" | "serious"

  const current = user?.intent || "friends";

  const handleSwitch = async (id) => {
    if (id === current || switching) return;

    setSwitching(id);
    try {
      await switchMode(id);
      await refreshUser();
      const chosen = MODES.find((m) => m.id === id);
      toast({
        icon: chosen.icon,
        title: `Switched to ${chosen.label}`,
        body: chosen.hint,
        tone: "success",
        duration: 2500,
      });
      onSwitched?.(id);
    } catch (e) {
      toast({
        icon: "⚠️",
        title: "Couldn't switch mode",
        body: e.response?.data?.error || "Try again",
        tone: "error",
      });
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="bg-gray-100 rounded-full p-1 flex items-center">
        {MODES.map((m) => {
          const active = current === m.id;
          const busy = switching === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSwitch(m.id)}
              disabled={busy}
              aria-pressed={active}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1
                ${active
                  ? m.activeClass
                  : "text-gray-600 hover:text-gray-800"}
                ${busy ? "opacity-60" : ""}`}
            >
              <span className="text-sm">{m.icon}</span>
              <span>{busy ? "..." : m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
