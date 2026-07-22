import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTiers, upgradeTier, downgradeTier } from "../api";
import { useAuth } from "../context/AuthContext";

const TIER_VISUALS = {
  free: {
    icon: "🌱",
    gradient: "from-gray-100 to-gray-200",
    accent: "text-gray-600",
    border: "border-gray-300",
  },
  silver: {
    icon: "🥈",
    gradient: "from-slate-200 to-slate-300",
    accent: "text-slate-700",
    border: "border-slate-400",
  },
  gold: {
    icon: "🥇",
    gradient: "from-amber-200 to-amber-300",
    accent: "text-amber-700",
    border: "border-amber-400",
  },
  platinum: {
    icon: "💎",
    gradient: "from-violet-200 to-violet-300",
    accent: "text-violet-700",
    border: "border-violet-400",
  },
};

export default function Membership() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getTiers()
      .then((res) => setTiers(res.data))
      .catch(() => setError("Could not load membership tiers"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tierId) => {
    setError("");
    setSuccess("");
    setUpgrading(tierId);
    try {
      const res = await upgradeTier(tierId);
      await refreshUser();
      setSuccess(res.data.message || `Upgraded to ${tierId}`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.response?.data?.error || "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  };

  const handleDowngrade = async () => {
    if (!confirm("Switch back to Free tier? You will lose premium perks.")) return;
    setUpgrading("downgrade");
    try {
      await downgradeTier();
      await refreshUser();
      setSuccess("Switched to Free");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed");
    } finally {
      setUpgrading(null);
    }
  };

  const currentTier = user?.tier || "free";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading memberships...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-rose-700 px-5 pt-12 pb-8 text-white">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Memberships</h1>
        <p className="text-rose-100 text-sm mt-1">
          Choose the right tier for your dating journey
        </p>
      </div>

      {/* Toasts */}
      {success && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Community-is-free explainer */}
      <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl">
        🤝 <strong>Community Connect is always free.</strong> Memberships only apply
        if you're using the app for dating or marriage. You can switch between modes
        anytime in your profile.
      </div>

      {/* Notice about dev mode */}
      <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
        ⚠️ <strong>Test mode:</strong> Upgrades are instant for testing.
        Real payment integration (Razorpay) coming soon.
      </div>

      {/* Tier cards */}
      <div className="px-4 py-4 space-y-3">
        {tiers
          .sort((a, b) => a.rank - b.rank)
          .map((tier) => {
            const v = TIER_VISUALS[tier.id] || TIER_VISUALS.free;
            const isCurrent = tier.id === currentTier;
            const canDowngrade = isCurrent && tier.id !== "free";

            return (
              <div
                key={tier.id}
                className={`rounded-2xl border-2 p-5 bg-gradient-to-br ${v.gradient}
                  ${isCurrent ? `${v.border} shadow-md` : "border-transparent"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{v.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-bold ${v.accent}`}>{tier.label}</h3>
                        {isCurrent && (
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-semibold text-primary uppercase tracking-wide">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {tier.dailyLimit} profiles per day
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {tier.price === 0 ? (
                      <p className="text-lg font-bold text-gray-700">Free</p>
                    ) : (
                      <>
                        <p className={`text-xl font-bold ${v.accent}`}>₹{tier.price}</p>
                        <p className="text-[10px] text-gray-500 -mt-0.5">/ month</p>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className={v.accent}>✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <div className="mt-4">
                  {isCurrent ? (
                    canDowngrade ? (
                      <button
                        onClick={handleDowngrade}
                        disabled={upgrading === "downgrade"}
                        className="w-full text-xs text-gray-500 underline py-2"
                      >
                        Switch to Free
                      </button>
                    ) : (
                      <p className="text-center text-xs text-gray-500">
                        Your current plan
                      </p>
                    )
                  ) : tier.id === "free" ? (
                    <p className="text-center text-xs text-gray-400">
                      Default for new members
                    </p>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={upgrading === tier.id}
                      className={`w-full bg-white border-2 ${v.border} ${v.accent}
                        font-semibold py-2.5 rounded-xl text-sm
                        hover:shadow-md transition-all
                        disabled:opacity-50`}
                    >
                      {upgrading === tier.id
                        ? "Processing..."
                        : `Upgrade to ${tier.label} →`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Bottom note */}
      <div className="px-6 pb-8 pt-2 text-center">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Higher tiers can see members at all lower tiers.
          Subscription auto-renews monthly. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
