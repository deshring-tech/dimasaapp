const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");

const PAGE_SIZE = 50; // messages per page

// ─── Get Messages for a Match (paginated) ────────────────────────────────────
// GET /api/messages/:matchId?cursor=<messageId>
router.get("/:matchId", protect, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { cursor } = req.query;
    const userId = req.user.id;

    if (!matchId || matchId.length > 50) {
      return res.status(400).json({ error: "Invalid match ID" });
    }

    // Verify user belongs to this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });
    if (!match) return res.status(403).json({ error: "Access denied" });

    // Cursor-based pagination — fetch PAGE_SIZE messages
    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { matchId, senderId: { not: userId }, read: false },
      data: { read: true },
    });

    const nextCursor =
      messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null;

    res.json({ messages, nextCursor });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
