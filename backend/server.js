require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const prisma = require("./src/lib/prisma");

const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/users");
const matchRoutes = require("./src/routes/matches");
const placeRoutes = require("./src/routes/places");
const messageRoutes = require("./src/routes/messages");
const subscriptionRoutes = require("./src/routes/subscription");
const statsRoutes = require("./src/routes/stats");
const postRoutes = require("./src/routes/posts");
const { initSocket } = require("./src/socket/chat");

// ─── Production sanity checks ───────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("FATAL: JWT_SECRET must be set to a long random string in production.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL must be set in production.");
    process.exit(1);
  }
}

const app = express();
const server = http.createServer(app);

// Behind Render/Vercel proxies — needed so express-rate-limit sees real client IPs
app.set("trust proxy", 1);

// ─── CORS: comma-separated list of allowed origins in CLIENT_URL ─────────────
// e.g. CLIENT_URL=https://dimasa.vercel.app,https://www.dimasa.app
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigin = (origin, cb) => {
  // Allow no-origin requests (health checks, curl, native apps)
  if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error("Not allowed by CORS"));
};

// ─── Security & Performance Middleware ──────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/posts", postRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", app: "Dimasa App API", version: "1.0.0" });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log full error server-side, never expose stack to client
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err);
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode < 500 ? err.message : "Something went wrong. Please try again.";
  res.status(statusCode).json({ error: message });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});
initSocket(io, prisma);

// Make io available to routes for emitting user-targeted events
app.set("io", io);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  await prisma.$connect();
  console.log(`🚀 Dimasa API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
