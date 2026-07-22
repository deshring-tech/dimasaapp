const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");
const { dailyLimitFor, visibleTiersFor, ensureFreshDailyCount } = require("../lib/tiers");

const VALID_GENDERS = ["male", "female", "other"];
const VALID_INTENTS = ["dating", "serious", "friends"];

// ─── Setup / Update Profile ───────────────────────────────────────────────────
// PUT /api/users/profile
router.put("/profile", protect, async (req, res, next) => {
  try {
    const { name, age, gender, location, locality, intent, bio, photoUrl } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !location || !intent) {
      return res.status(400).json({ error: "Name, age, gender, location, and intent are required" });
    }

    // Validate name
    const trimmedName = String(name).trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ error: "Name must be between 2 and 50 characters" });
    }

    // Validate age
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 80) {
      return res.status(400).json({ error: "Age must be between 18 and 80" });
    }

    // Validate enum fields
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ error: "Gender must be male, female, or other" });
    }
    if (!VALID_INTENTS.includes(intent)) {
      return res.status(400).json({ error: "Intent must be dating, serious, or friends" });
    }

    // Validate optional fields
    const trimmedBio = bio ? String(bio).trim().slice(0, 150) : null;
    const trimmedLocation = String(location).trim().slice(0, 100);
    const trimmedLocality = locality ? String(locality).trim().slice(0, 80) || null : null;

    // Basic URL validation for photoUrl
    let sanitizedPhotoUrl = null;
    if (photoUrl) {
      const urlStr = String(photoUrl).trim();
      if (urlStr && (urlStr.startsWith("http://") || urlStr.startsWith("https://"))) {
        sanitizedPhotoUrl = urlStr.slice(0, 500);
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: trimmedName,
        age: parsedAge,
        gender,
        location: trimmedLocation,
        locality: trimmedLocality,
        intent,
        bio: trimmedBio,
        photoUrl: sanitizedPhotoUrl,
        isSetup: true,
      },
      select: {
        id: true, phone: true, name: true, age: true, gender: true,
        location: true, locality: true, intent: true, bio: true, photoUrl: true,
        tier: true, isSetup: true,
      },
    });

    res.json({ message: "Profile updated", user });
  } catch (err) {
    next(err);
  }
});

// ─── Switch mode (intent) ─────────────────────────────────────────────────────
// PUT /api/users/mode
// Body: { intent: "friends" | "dating" | "serious" }
//
// Lightweight endpoint so the mode-switcher UI can toggle instantly without
// requiring the caller to send the full profile payload.
router.put("/mode", protect, async (req, res, next) => {
  try {
    const { intent } = req.body;
    if (!VALID_INTENTS.includes(intent)) {
      return res.status(400).json({ error: "Invalid mode" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { intent },
      select: {
        id: true, phone: true, name: true, age: true, gender: true,
        location: true, intent: true, bio: true, photoUrl: true,
        tier: true, tierExpiresAt: true,
        isSetup: true, createdAt: true,
      },
    });

    res.json({ message: "Mode switched", user });
  } catch (err) {
    next(err);
  }
});

// ─── Get My Profile ───────────────────────────────────────────────────────────
// GET /api/users/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, phone: true, name: true, age: true, gender: true,
        location: true, locality: true, intent: true, bio: true, photoUrl: true,
        tier: true, tierExpiresAt: true,
        isSetup: true, createdAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ─── Discovery — TWO MODES based on the user's intent ────────────────────────
// • Community mode (intent = "friends"): free for everyone, no tier filter,
//   no daily cap. Like a Dimasa community directory.
// • Dating mode  (intent = "dating" | "serious"): tier-gated visibility AND
//   tier-based daily limits.
//
// GET /api/users/discover
router.get("/discover", protect, async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    await ensureFreshDailyCount(prisma, currentUser);

    // IDs already interacted with
    const interacted = await prisma.interest.findMany({
      where: { fromUserId: req.user.id },
      select: { toUserId: true },
    });
    const excludeIds = interacted.map((i) => i.toUserId);
    excludeIds.push(req.user.id);

    // ── COMMUNITY MODE ───────────────────────────────────────────────────
    if (currentUser.intent === "friends") {
      const { locality: qLocality } = req.query;

      // If user filtered by a specific locality, restrict the query.
      // Otherwise: fetch everyone and sort by proximity (same locality > same district > elsewhere).
      const where = {
        id: { notIn: excludeIds },
        isSetup: true,
        intent: "friends",
      };
      if (qLocality) {
        where.locality = String(qLocality).trim();
        if (currentUser.location) where.location = currentUser.location;
      }

      const rows = await prisma.user.findMany({
        where,
        select: {
          id: true, name: true, age: true, gender: true,
          location: true, locality: true,
          intent: true, bio: true, photoUrl: true,
          tier: true,
        },
        orderBy: { createdAt: "desc" },
        take: qLocality ? 40 : 60,
      });

      // Rank: 3 = same locality, 2 = same district, 1 = other. Group in JS.
      const myLoc = currentUser.location;
      const myLocality = currentUser.locality;
      const scored = rows.map((p) => {
        let rank = 1;
        if (myLoc && p.location === myLoc) rank = 2;
        if (myLocality && p.locality === myLocality) rank = 3;
        return { ...p, _rank: rank };
      });
      scored.sort((a, b) => b._rank - a._rank);

      // Strip the internal _rank field before returning
      const profiles = scored.map(({ _rank, ...rest }) => rest);

      return res.json({
        mode: "community",
        profiles,
        remaining: null,
        currentLocality: currentUser.locality || null,
        currentLocation: currentUser.location || null,
      });
    }

    // ── DATING / SERIOUS MODE ────────────────────────────────────────────
    const limit = dailyLimitFor(currentUser.tier);
    if (currentUser.dailyCount >= limit) {
      return res.status(403).json({
        error: "Daily limit reached",
        mode: "dating",
        tier: currentUser.tier,
        limit,
      });
    }

    const visibleTiers = visibleTiersFor(currentUser.tier);

    const profiles = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isSetup: true,
        intent: { in: ["dating", "serious"] },
        tier: { in: visibleTiers },
      },
      select: {
        id: true, name: true, age: true, gender: true,
        location: true, intent: true, bio: true, photoUrl: true,
        tier: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      mode: "dating",
      profiles,
      remaining: limit - currentUser.dailyCount,
    });
  } catch (err) {
    next(err);
  }
});

// ─── List distinct localities in a district ─────────────────────────────────
// GET /api/users/localities?location=Guwahati
// Used by the community-grid filter dropdown.
router.get("/localities", protect, async (req, res, next) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.json([]);
    }

    const rows = await prisma.user.findMany({
      where: {
        isSetup: true,
        intent: "friends",
        location: String(location).trim(),
        locality: { not: null },
      },
      select: { locality: true },
      distinct: ["locality"],
      orderBy: { locality: "asc" },
    });
    res.json(rows.map((r) => r.locality).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// ─── Search users by name ────────────────────────────────────────────────────
// GET /api/users/search?q=name  ← must come BEFORE /:id
//
// Returns users whose name OR location matches the query.
// Results are tier-filtered the same way Discovery is.
router.get("/search", protect, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }
    if (q.length > 50) {
      return res.status(400).json({ error: "Query too long" });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { intent: true, tier: true },
    });

    // SQLite does case-insensitive matching by default for ASCII;
    // we use `contains` which works on both SQLite and Postgres.
    const baseWhere = {
      isSetup: true,
      id: { not: req.user.id },
      OR: [
        { name: { contains: q } },
        { location: { contains: q } },
      ],
    };

    // Apply mode + tier visibility, same as Discovery
    if (currentUser.intent === "friends") {
      baseWhere.intent = "friends";
    } else {
      baseWhere.intent = { in: ["dating", "serious"] };
      baseWhere.tier = { in: visibleTiersFor(currentUser.tier) };
    }

    const results = await prisma.user.findMany({
      where: baseWhere,
      select: {
        id: true, name: true, age: true, gender: true,
        location: true, intent: true, photoUrl: true, tier: true,
      },
      orderBy: { name: "asc" },
      take: 30,
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// ─── Get public profile by ID ─────────────────────────────────────────────────
// GET /api/users/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    // Basic CUID/ID sanity check
    if (!id || id.length > 50) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, age: true, gender: true,
        location: true, intent: true, bio: true, photoUrl: true,
        tier: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
