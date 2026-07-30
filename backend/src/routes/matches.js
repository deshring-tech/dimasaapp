const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");
const { dailyLimitFor, getRank, ensureFreshDailyCount } = require("../lib/tiers");
const { emitToUser } = require("../socket/chat");

// ─── Who liked me (Gold+ feature) — MUST be before /:targetId ───────────────
// GET /api/matches/liked-me
router.get("/liked-me", protect, async (req, res, next) => {
  try {
    // Available to Gold and Platinum tiers
    if (getRank(req.user.tier) < getRank("gold")) {
      return res.status(403).json({
        error: "Available with Gold and Platinum membership. Upgrade to see who liked you!",
      });
    }

    const interests = await prisma.interest.findMany({
      where: { toUserId: req.user.id },
      include: {
        fromUser: {
          select: { id: true, name: true, age: true, photoUrl: true, location: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(interests.map((i) => i.fromUser));
  } catch (err) {
    next(err);
  }
});

// ─── Get a single match (who am I chatting with?) ───────────────────────────
// GET /api/matches/:matchId/partner
// Used by the chat screen so the header shows the person's name/photo even
// before any messages exist.
router.get("/:matchId/partner", protect, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, photoUrl: true, location: true, locality: true, intent: true } },
        user2: { select: { id: true, name: true, photoUrl: true, location: true, locality: true, intent: true } },
      },
    });

    if (!match) return res.status(404).json({ error: "Match not found" });

    const partner = match.user1Id === userId ? match.user2 : match.user1;
    res.json({ matchId: match.id, partner });
  } catch (err) {
    next(err);
  }
});

// ─── Get All Matches ──────────────────────────────────────────────────────────
// GET /api/matches
router.get("/", protect, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, photoUrl: true, location: true } },
        user2: { select: { id: true, name: true, photoUrl: true, location: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, read: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = matches.map((match) => {
      const other = match.user1Id === userId ? match.user2 : match.user1;
      return {
        matchId: match.id,
        createdAt: match.createdAt,
        user: other,
        lastMessage: match.messages[0] || null,
        unread:
          match.messages[0]
            ? !match.messages[0].read && match.messages[0].senderId !== userId
            : false,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// ─── Express Interest ─────────────────────────────────────────────────────────
// POST /api/matches/interest/:targetId
router.post("/interest/:targetId", protect, async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const fromId = req.user.id;

    if (!targetId || targetId.length > 50) {
      return res.status(400).json({ error: "Invalid target ID" });
    }
    if (fromId === targetId) {
      return res.status(400).json({ error: "Cannot express interest in yourself" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, isSetup: true, intent: true },
    });
    if (!target || !target.isSetup) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: fromId },
    });
    await ensureFreshDailyCount(prisma, currentUser);

    // Community connections (both sides "friends") have no daily cap
    const isCommunityConnect =
      currentUser.intent === "friends" && target.intent === "friends";

    if (!isCommunityConnect) {
      // Dating-mode daily cap (tier-aware)
      const limit = dailyLimitFor(currentUser.tier);
      if (currentUser.dailyCount >= limit) {
        return res.status(403).json({ error: "Daily limit reached. Upgrade your membership!" });
      }
    }

    // Create interest
    try {
      await prisma.interest.create({
        data: { fromUserId: fromId, toUserId: targetId },
      });
    } catch (e) {
      if (e.code === "P2002") {
        return res.status(409).json({ error: "Already expressed interest" });
      }
      throw e; // re-throw unexpected errors
    }

    // Increment daily count (only counts toward dating-mode cap)
    if (!isCommunityConnect) {
      await prisma.user.update({
        where: { id: fromId },
        data: { dailyCount: { increment: 1 } },
      });
    }

    // Check for mutual interest
    const mutual = await prisma.interest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: targetId, toUserId: fromId } },
    });

    const io = req.app.get("io");

    if (mutual) {
      const [user1Id, user2Id] = [fromId, targetId].sort();
      const match = await prisma.match.upsert({
        where: { user1Id_user2Id: { user1Id, user2Id } },
        create: { user1Id, user2Id },
        update: {},
        include: {
          user1: { select: { id: true, name: true, photoUrl: true } },
          user2: { select: { id: true, name: true, photoUrl: true } },
        },
      });

      // Notify the OTHER user in real time
      if (io) {
        const otherForTarget = match.user1Id === targetId ? match.user2 : match.user1;
        const otherForMe = match.user1Id === fromId ? match.user2 : match.user1;
        emitToUser(io, targetId, "match_created", { match, otherUser: otherForTarget });
        emitToUser(io, fromId, "match_created", { match, otherUser: otherForMe });
      }

      return res.json({ matched: true, match });
    }

    // Not yet mutual — notify the target that someone is interested
    if (io) {
      const fromUser = await prisma.user.findUnique({
        where: { id: fromId },
        select: { id: true, name: true, location: true, photoUrl: true },
      });
      emitToUser(io, targetId, "interest_received", { fromUser });
    }

    res.json({ matched: false, message: "Interest sent!" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
