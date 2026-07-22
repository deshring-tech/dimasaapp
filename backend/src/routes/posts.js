const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const { emitToUser } = require("../socket/chat");

const MAX_CONTENT = 2000;
const MAX_COMMENT = 500;
const PAGE_SIZE = 20;

// ─── Rate limit posts to prevent spam ────────────────────────────────────
const postLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 3,                   // max 3 posts per minute per IP
  message: { error: "You're posting too fast. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Slow down on the comments." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── URL sanitizer ───────────────────────────────────────────────────────
const sanitizeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  return s.startsWith("http://") || s.startsWith("https://")
    ? s.slice(0, 500)
    : null;
};

// ─── Reusable selects ────────────────────────────────────────────────────
const AUTHOR_SELECT = {
  id: true, name: true, photoUrl: true, tier: true, intent: true,
};

// Shape a post row + counts into API response.
// `myReactionId` present = current user has reacted.
const shapePost = (row, currentUserId) => ({
  id: row.id,
  content: row.content,
  imageUrl: row.imageUrl,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  author: row.author,
  place: row.place,
  reactions: row._count?.reactions ?? 0,
  comments: row._count?.comments ?? 0,
  reactedByMe: row.reactions?.some((r) => r.userId === currentUserId) ?? false,
});

// ─── Feed — paginated ────────────────────────────────────────────────────
// GET /api/posts?cursor=<id>
router.get("/", protect, async (req, res, next) => {
  try {
    const { cursor } = req.query;

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: AUTHOR_SELECT },
        place:  { select: { id: true, name: true, type: true } },
        reactions: { where: { userId: req.user.id }, select: { userId: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].id : null;

    res.json({
      posts: posts.map((p) => shapePost(p, req.user.id)),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});

// ─── My posts — for profile page ─────────────────────────────────────────
router.get("/mine", protect, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: AUTHOR_SELECT },
        place:  { select: { id: true, name: true } },
        reactions: { where: { userId: req.user.id }, select: { userId: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });
    res.json(posts.map((p) => shapePost(p, req.user.id)));
  } catch (err) {
    next(err);
  }
});

// ─── Create post ─────────────────────────────────────────────────────────
router.post("/", protect, postLimit, async (req, res, next) => {
  try {
    const { content, imageUrl, placeId } = req.body;
    const text = String(content || "").trim();

    if (!text && !imageUrl) {
      return res.status(400).json({ error: "Post needs text or an image" });
    }
    if (text.length > MAX_CONTENT) {
      return res.status(400).json({ error: `Post too long (max ${MAX_CONTENT} chars)` });
    }

    // If placeId is given, verify user is the owner
    let validPlaceId = null;
    if (placeId) {
      const place = await prisma.place.findUnique({ where: { id: placeId } });
      if (place && place.ownerId === req.user.id) {
        validPlaceId = placeId;
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        content: text,
        imageUrl: sanitizeUrl(imageUrl),
        placeId: validPlaceId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        place:  { select: { id: true, name: true, type: true } },
        reactions: { select: { userId: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    // Notify followers if this is a business post
    if (validPlaceId) {
      const io = req.app.get("io");
      if (io) {
        const followers = await prisma.follow.findMany({
          where: { placeId: validPlaceId },
          select: { userId: true },
        });
        followers.forEach((f) => {
          emitToUser(io, f.userId, "business_post", {
            post: shapePost(post, f.userId),
          });
        });
      }
    }

    res.status(201).json(shapePost(post, req.user.id));
  } catch (err) {
    next(err);
  }
});

// ─── Get single post + comments ──────────────────────────────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: AUTHOR_SELECT },
        place:  { select: { id: true, name: true, type: true } },
        reactions: { where: { userId: req.user.id }, select: { userId: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(shapePost(post, req.user.id));
  } catch (err) {
    next(err);
  }
});

// ─── Delete own post ─────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: "Not your post" });
    }
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
});

// ─── Toggle reaction (heart) ─────────────────────────────────────────────
router.post("/:id/react", protect, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const existing = await prisma.reaction.findUnique({
      where: { postId_userId: { postId: post.id, userId: req.user.id } },
    });

    let reacted;
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      reacted = false;
    } else {
      await prisma.reaction.create({
        data: { postId: post.id, userId: req.user.id },
      });
      reacted = true;

      // Notify author (only on new reactions, not un-reactions)
      if (post.authorId !== req.user.id) {
        const io = req.app.get("io");
        if (io) {
          const fromUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, photoUrl: true },
          });
          emitToUser(io, post.authorId, "post_reacted", {
            postId: post.id,
            fromUser,
          });
        }
      }
    }

    const count = await prisma.reaction.count({ where: { postId: post.id } });
    res.json({ reacted, count });
  } catch (err) {
    next(err);
  }
});

// ─── List comments on a post ─────────────────────────────────────────────
router.get("/:id/comments", protect, async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// ─── Add a comment ───────────────────────────────────────────────────────
router.post("/:id/comments", protect, commentLimit, async (req, res, next) => {
  try {
    const text = String(req.body.content || "").trim();
    if (!text) return res.status(400).json({ error: "Comment is empty" });
    if (text.length > MAX_COMMENT) {
      return res.status(400).json({ error: `Comment too long (max ${MAX_COMMENT} chars)` });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: req.user.id,
        content: text,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });

    // Notify post author
    if (post.authorId !== req.user.id) {
      const io = req.app.get("io");
      if (io) {
        emitToUser(io, post.authorId, "post_commented", {
          postId: post.id,
          comment,
        });
      }
    }

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// ─── Delete own comment ──────────────────────────────────────────────────
router.delete("/:postId/comments/:commentId", protect, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: "Not your comment" });
    }
    await prisma.comment.delete({ where: { id: comment.id } });
    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
