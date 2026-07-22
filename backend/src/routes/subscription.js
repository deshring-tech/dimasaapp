const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");
const { TIERS, isValidTier } = require("../lib/tiers");

// ─── Get available tiers ─────────────────────────────────────────────────────
// GET /api/subscription/tiers
router.get("/tiers", (req, res) => {
  // Return public tier info (no internal logic)
  const publicTiers = Object.entries(TIERS).map(([key, t]) => ({
    id: key,
    label: t.label,
    price: t.price,
    dailyLimit: t.dailyLimit,
    color: t.color,
    perks: t.perks,
    rank: t.rank,
  }));
  res.json(publicTiers);
});

// ─── Get my current subscription status ─────────────────────────────────────
// GET /api/subscription/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { tier: true, tierExpiresAt: true },
    });
    res.json({
      tier: user.tier,
      tierExpiresAt: user.tierExpiresAt,
      ...TIERS[user.tier],
    });
  } catch (err) {
    next(err);
  }
});

// ─── Upgrade tier (DEV-ONLY mock until payment integration) ─────────────────
// POST /api/subscription/upgrade
// Body: { tier: "silver" | "gold" | "platinum" }
//
// ⚠️ TODO: Wire Razorpay/Stripe here for real payments.
// In production, this endpoint should ONLY be callable after a verified payment
// webhook, NOT directly by the user.
router.post("/upgrade", protect, async (req, res, next) => {
  try {
    const { tier } = req.body;

    if (!isValidTier(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }
    if (tier === "free") {
      return res.status(400).json({ error: "Use /downgrade to switch to free" });
    }

    // 🔒 Block this endpoint outside of development unless explicitly enabled.
    // Set ALLOW_MOCK_UPGRADE=true in .env if you want to test on staging.
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_UPGRADE !== "true") {
      return res.status(403).json({
        error: "Direct upgrades disabled. Payment integration required.",
      });
    }

    // 30-day subscription window
    const tierExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        tier,
        tierExpiresAt,
      },
      select: { id: true, tier: true, tierExpiresAt: true },
    });

    res.json({
      message: `Upgraded to ${TIERS[tier].label}`,
      ...user,
      ...TIERS[tier],
    });
  } catch (err) {
    next(err);
  }
});

// ─── Downgrade to free ──────────────────────────────────────────────────────
// POST /api/subscription/downgrade
router.post("/downgrade", protect, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "free", tierExpiresAt: null },
    });
    res.json({ message: "Downgraded to Free" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
