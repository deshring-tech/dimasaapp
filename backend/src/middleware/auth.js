const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        isSetup: true,
        intent: true,
        tier: true,
        tierExpiresAt: true,
        location: true,
        locality: true,
      },
    });

    // Auto-downgrade if tier expired
    if (user && user.tier !== "free" && user.tierExpiresAt && new Date(user.tierExpiresAt) < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tier: "free", tierExpiresAt: null },
      });
      user.tier = "free";
      user.tierExpiresAt = null;
    }

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = { protect };
