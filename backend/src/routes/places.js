const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const { protect } = require("../middleware/auth");
const { emitToUser } = require("../socket/chat");

const VALID_TYPES = ["hotel", "restaurant", "homestay", "dhaba", "cafe", "shop", "service"];
const VALID_PRICE_RANGES = ["₹", "₹₹", "₹₹₹", "₹₹₹₹"];

// ─── Public list fields (safe to expose) ──────────────────────────────────
const PLACE_LIST_SELECT = {
  id: true, name: true, type: true, district: true,
  address: true, contact: true, whatsapp: true,
  imageUrl: true, priceRange: true, isClaimed: true,
  hours: true,  // list view now needs hours for open-now badge
  createdAt: true,
  owner: {
    select: { id: true, name: true, photoUrl: true },
  },
  _count: { select: { followers: true } },
};

const PLACE_FULL_SELECT = {
  ...PLACE_LIST_SELECT,
  email: true, gallery: true, description: true,
  tags: true, updatedAt: true, isApproved: true, views: true,
};

// ─── Route order matters: specific paths BEFORE /:id ──────────────────────

// ─── Get Distinct Districts ──────────────────────────────────────────────
// GET /api/places/meta/districts
router.get("/meta/districts", protect, async (req, res, next) => {
  try {
    const districts = await prisma.place.findMany({
      where: { isApproved: true },
      select: { district: true },
      distinct: ["district"],
      orderBy: { district: "asc" },
    });
    res.json(districts.map((d) => d.district));
  } catch (err) {
    next(err);
  }
});

// ─── My Owned Businesses ─────────────────────────────────────────────────
// GET /api/places/meta/mine
router.get("/meta/mine", protect, async (req, res, next) => {
  try {
    const mine = await prisma.place.findMany({
      where: { ownerId: req.user.id },
      select: PLACE_FULL_SELECT,
      orderBy: { updatedAt: "desc" },
    });
    res.json(mine);
  } catch (err) {
    next(err);
  }
});

// ─── List Places ─────────────────────────────────────────────────────────
// GET /api/places?district=Haflong&type=restaurant&claimed=true
router.get("/", protect, async (req, res, next) => {
  try {
    const { district, type, claimed } = req.query;

    const where = { isApproved: true };
    if (district) where.district = String(district).trim();
    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type` });
      }
      where.type = type;
    }
    if (claimed === "true") where.isClaimed = true;

    const places = await prisma.place.findMany({
      where,
      orderBy: [
        { isClaimed: "desc" },  // Owned businesses first
        { createdAt: "desc" },
      ],
      select: PLACE_LIST_SELECT,
    });

    res.json(places);
  } catch (err) {
    next(err);
  }
});

// ─── Add Place / Business ────────────────────────────────────────────────
// POST /api/places
// Body: standard fields + isOwner:boolean
router.post("/", protect, async (req, res, next) => {
  try {
    const {
      name, type, district, address, contact, imageUrl,
      whatsapp, email, description, hours, priceRange, tags, gallery,
      isOwner,
    } = req.body;

    if (!name || !type || !district) {
      return res.status(400).json({ error: "Name, type, and district are required" });
    }

    const trimmedName = String(name).trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: "Name must be 2–100 characters" });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(", ")}` });
    }
    if (priceRange && !VALID_PRICE_RANGES.includes(priceRange)) {
      return res.status(400).json({ error: "Invalid price range" });
    }

    // Validate URL fields
    const sanitizeUrl = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      return (s.startsWith("http://") || s.startsWith("https://")) ? s.slice(0, 500) : null;
    };

    // Validate JSON string fields (hours, gallery)
    const sanitizeJson = (v) => {
      if (!v) return null;
      try {
        // If it's already an object/array, stringify
        if (typeof v === "object") return JSON.stringify(v).slice(0, 2000);
        // If it's a string, verify it parses
        JSON.parse(v);
        return String(v).slice(0, 2000);
      } catch {
        return null;
      }
    };

    const place = await prisma.place.create({
      data: {
        name: trimmedName,
        type,
        district: String(district).trim().slice(0, 100),
        address: address ? String(address).trim().slice(0, 200) : null,
        contact: contact ? String(contact).trim().slice(0, 20) : null,
        whatsapp: whatsapp ? String(whatsapp).trim().slice(0, 20) : null,
        email: email ? String(email).trim().slice(0, 100) : null,
        imageUrl: sanitizeUrl(imageUrl),
        gallery: sanitizeJson(gallery),
        description: description ? String(description).trim().slice(0, 1000) : null,
        hours: sanitizeJson(hours),
        priceRange: priceRange || null,
        tags: tags ? String(tags).trim().slice(0, 200) : null,
        addedById: req.user.id,
        ownerId: isOwner ? req.user.id : null,
        isClaimed: !!isOwner,
      },
      select: PLACE_FULL_SELECT,
    });

    res.status(201).json({ message: "Business added!", place });
  } catch (err) {
    next(err);
  }
});

// ─── Get Single Business (full detail) ───────────────────────────────────
// GET /api/places/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: req.params.id },
      select: {
        ...PLACE_FULL_SELECT,
        followers: {
          where: { userId: req.user.id },
          select: { userId: true },
        },
      },
    });
    if (!place || !place.isApproved) return res.status(404).json({ error: "Place not found" });

    // Increment view counter (skip if owner viewing own place)
    if (place.owner?.id !== req.user.id) {
      prisma.place.update({
        where: { id: place.id },
        data: { views: { increment: 1 } },
      }).catch(() => {}); // fire and forget
    }

    const followedByMe = place.followers.length > 0;
    delete place.followers;

    res.json({ ...place, followedByMe });
  } catch (err) {
    next(err);
  }
});

// ─── Follow / Unfollow (toggle) ──────────────────────────────────────────
// POST /api/places/:id/follow
router.post("/:id/follow", protect, async (req, res, next) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: req.params.id },
      select: { id: true, ownerId: true },
    });
    if (!place) return res.status(404).json({ error: "Place not found" });
    if (place.ownerId === req.user.id) {
      return res.status(400).json({ error: "You own this business" });
    }

    const existing = await prisma.follow.findUnique({
      where: { userId_placeId: { userId: req.user.id, placeId: place.id } },
    });

    let following;
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      following = false;
    } else {
      await prisma.follow.create({
        data: { userId: req.user.id, placeId: place.id },
      });
      following = true;
    }

    const count = await prisma.follow.count({ where: { placeId: place.id } });
    res.json({ following, followers: count });
  } catch (err) {
    next(err);
  }
});

// ─── Business Dashboard (owner-only) ─────────────────────────────────────
// GET /api/places/:id/dashboard
router.get("/:id/dashboard", protect, async (req, res, next) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, ownerId: true, views: true },
    });
    if (!place) return res.status(404).json({ error: "Place not found" });
    if (place.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the owner can view this dashboard" });
    }

    const [followers, posts] = await Promise.all([
      prisma.follow.count({ where: { placeId: place.id } }),
      prisma.post.findMany({
        where: { placeId: place.id },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { reactions: true, comments: true } },
        },
      }),
    ]);

    const totalReactions = posts.reduce((sum, p) => sum + p._count.reactions, 0);
    const totalComments  = posts.reduce((sum, p) => sum + p._count.comments,  0);

    res.json({
      place: { id: place.id, name: place.name },
      views: place.views,
      followers,
      postsCount: posts.length,
      totalReactions,
      totalComments,
      recentPosts: posts.slice(0, 5).map((p) => ({
        id: p.id,
        content: p.content?.slice(0, 100),
        createdAt: p.createdAt,
        reactions: p._count.reactions,
        comments: p._count.comments,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Update Business (owner only) ────────────────────────────────────────
// PUT /api/places/:id
router.put("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.place.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Place not found" });

    // Only owner can edit rich fields
    if (existing.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the owner can edit this business" });
    }

    const {
      name, type, district, address, contact,
      whatsapp, email, imageUrl, gallery,
      description, hours, priceRange, tags,
    } = req.body;

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    if (priceRange && !VALID_PRICE_RANGES.includes(priceRange)) {
      return res.status(400).json({ error: "Invalid price range" });
    }

    const data = {};
    if (name) data.name = String(name).trim().slice(0, 100);
    if (type) data.type = type;
    if (district) data.district = String(district).trim().slice(0, 100);
    if (address !== undefined) data.address = address ? String(address).trim().slice(0, 200) : null;
    if (contact !== undefined) data.contact = contact ? String(contact).trim().slice(0, 20) : null;
    if (whatsapp !== undefined) data.whatsapp = whatsapp ? String(whatsapp).trim().slice(0, 20) : null;
    if (email !== undefined) data.email = email ? String(email).trim().slice(0, 100) : null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (gallery !== undefined) data.gallery = gallery || null;
    if (description !== undefined) data.description = description ? String(description).trim().slice(0, 1000) : null;
    if (hours !== undefined) data.hours = hours || null;
    if (priceRange !== undefined) data.priceRange = priceRange || null;
    if (tags !== undefined) data.tags = tags ? String(tags).trim().slice(0, 200) : null;

    const updated = await prisma.place.update({
      where: { id },
      data,
      select: PLACE_FULL_SELECT,
    });

    res.json({ message: "Business updated", place: updated });
  } catch (err) {
    next(err);
  }
});

// ─── Claim ownership of an unowned place ─────────────────────────────────
// POST /api/places/:id/claim
router.post("/:id/claim", protect, async (req, res, next) => {
  try {
    const existing = await prisma.place.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Place not found" });
    if (existing.ownerId) {
      return res.status(409).json({ error: "This business is already claimed by an owner." });
    }

    const updated = await prisma.place.update({
      where: { id: req.params.id },
      data: { ownerId: req.user.id, isClaimed: true },
      select: PLACE_FULL_SELECT,
    });

    res.json({ message: "You now own this business", place: updated });
  } catch (err) {
    next(err);
  }
});

// ─── Message the business owner ──────────────────────────────────────────
// POST /api/places/:id/contact
// Creates a match record so the user can chat with the owner via the normal chat UI.
// No daily limits, no dating semantics — this is a business inquiry.
router.post("/:id/contact", protect, async (req, res, next) => {
  try {
    const place = await prisma.place.findUnique({ where: { id: req.params.id } });
    if (!place) return res.status(404).json({ error: "Place not found" });
    if (!place.ownerId) {
      return res.status(400).json({ error: "This business has no owner yet — try WhatsApp or phone instead" });
    }
    if (place.ownerId === req.user.id) {
      return res.status(400).json({ error: "You own this business" });
    }

    const [user1Id, user2Id] = [req.user.id, place.ownerId].sort();

    // Reuse the existing Match model so chats work with the current chat UI
    const match = await prisma.match.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id },
      update: {},
      include: {
        user1: { select: { id: true, name: true, photoUrl: true } },
        user2: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    // Notify the owner in real time
    const io = req.app.get("io");
    if (io) {
      const fromUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, location: true, photoUrl: true },
      });
      emitToUser(io, place.ownerId, "business_inquiry", {
        match,
        fromUser,
        place: { id: place.id, name: place.name },
      });
    }

    res.json({ matchId: match.id, place: { id: place.id, name: place.name } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
