// Subtle tier badge — does NOT show price, only the label/icon.
// Free tier renders nothing (no badge clutter for the default state).

const TIER_STYLES = {
  free: null, // no badge
  silver: {
    label: "Silver",
    icon: "🥈",
    classes: "bg-slate-100 text-slate-700 border-slate-300",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    classes: "bg-amber-50 text-amber-700 border-amber-300",
  },
  platinum: {
    label: "Platinum",
    icon: "💎",
    classes: "bg-violet-50 text-violet-700 border-violet-300",
  },
};

export default function TierBadge({ tier, size = "sm" }) {
  if (!tier || tier === "free") return null;
  const style = TIER_STYLES[tier];
  if (!style) return null;

  const sizeClasses =
    size === "lg"
      ? "px-3 py-1 text-sm"
      : size === "xs"
      ? "px-1.5 py-0.5 text-[10px]"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${style.classes} ${sizeClasses}`}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
