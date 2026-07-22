// ─── Tier definitions ─ single source of truth ──────────────────────────────
// Higher rank = sees everyone at their rank AND below
// Free users see only other free users.
// Platinum users see EVERYONE.

const TIERS = {
  free: {
    rank: 0,
    label: "Free",
    price: 0,
    dailyLimit: 10,
    color: "#9CA3AF",     // gray
    perks: [
      "10 profiles per day",
      "Match with same-tier users",
      "Basic chat",
    ],
  },
  silver: {
    rank: 1,
    label: "Silver",
    price: 500,
    dailyLimit: 25,
    color: "#94A3B8",     // slate
    perks: [
      "25 profiles per day",
      "See Free + Silver members",
      "Silver badge on your profile",
    ],
  },
  gold: {
    rank: 2,
    label: "Gold",
    price: 1100,
    dailyLimit: 50,
    color: "#F59E0B",     // amber
    perks: [
      "50 profiles per day",
      "See Free + Silver + Gold members",
      "Gold badge on your profile",
      "See who liked you",
    ],
  },
  platinum: {
    rank: 3,
    label: "Platinum",
    price: 2500,
    dailyLimit: 100,
    color: "#7C3AED",     // purple
    perks: [
      "100 profiles per day",
      "See ALL members (including Platinum)",
      "Platinum badge — most exclusive",
      "See who liked you",
      "Priority profile placement",
    ],
  },
};

const TIER_NAMES = Object.keys(TIERS);

const getTier = (tierName) => TIERS[tierName] || TIERS.free;

const getRank = (tierName) => getTier(tierName).rank;

// List of tiers that this tier can see (their rank or below)
const visibleTiersFor = (tierName) => {
  const myRank = getRank(tierName);
  return TIER_NAMES.filter((t) => getRank(t) <= myRank);
};

const dailyLimitFor = (tierName) => getTier(tierName).dailyLimit;

const isValidTier = (tierName) => TIER_NAMES.includes(tierName);

// Resets dailyCount to 0 if user's lastSeen is from a previous UTC day.
// Call this before any flow that reads `dailyCount` to ensure freshness.
// Mutates `user` in place AND persists if reset was needed.
const ensureFreshDailyCount = async (prisma, user) => {
  const nowUtc = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())
  );
  if (new Date(user.lastSeen) < startOfTodayUtc) {
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyCount: 0, lastSeen: nowUtc },
    });
    user.dailyCount = 0;
    user.lastSeen = nowUtc;
  }
  return user;
};

module.exports = {
  TIERS,
  TIER_NAMES,
  getTier,
  getRank,
  visibleTiersFor,
  dailyLimitFor,
  isValidTier,
  ensureFreshDailyCount,
};
