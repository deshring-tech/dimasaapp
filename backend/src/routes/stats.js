const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");

// ─── Community Stats ────────────────────────────────────────────────────────
// GET /api/stats
// Quick aggregate counts so the UI can show social proof on the home screen.
router.get("/", protect, async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalMembers, communityMembers, placesCount, matchesCount, recentJoined] =
      await Promise.all([
        prisma.user.count({ where: { isSetup: true } }),
        prisma.user.count({ where: { isSetup: true, intent: "friends" } }),
        prisma.place.count({ where: { isApproved: true } }),
        prisma.match.count(),
        prisma.user.count({
          where: { isSetup: true, createdAt: { gt: weekAgo } },
        }),
      ]);

    res.json({
      members: totalMembers,
      community: communityMembers,
      daters: totalMembers - communityMembers,
      places: placesCount,
      matches: matchesCount,
      joinedThisWeek: recentJoined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Recently joined profiles (visible to current user) ─────────────────────
// GET /api/stats/recent
router.get("/recent", protect, async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { intent: true, tier: true },
    });

    const where = {
      isSetup: true,
      id: { not: req.user.id },
    };

    // Same mode + tier rules as Discovery
    if (currentUser.intent === "friends") {
      where.intent = "friends";
    } else {
      where.intent = { in: ["dating", "serious"] };
      const { visibleTiersFor } = require("../lib/tiers");
      where.tier = { in: visibleTiersFor(currentUser.tier) };
    }

    const recent = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, age: true, photoUrl: true, gender: true,
        location: true, tier: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    res.json(recent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
