const jwt = require("jsonwebtoken");

const MAX_MESSAGE_LENGTH = 1000;

// Map of userId -> Set of socket.id, so we can emit to a specific user
// across all of their connected devices/tabs.
const userSockets = new Map();

const emitToUser = (io, userId, event, payload) => {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach((sid) => io.to(sid).emit(event, payload));
};

const initSocket = (io, prisma) => {
  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId}`);

    // Track this socket for user-targeted emits
    if (!userSockets.has(socket.userId)) userSockets.set(socket.userId, new Set());
    userSockets.get(socket.userId).add(socket.id);

    // ── Join match room ────────────────────────────────────────────────────
    socket.on("join_match", async (matchId) => {
      try {
        if (!matchId || typeof matchId !== "string" || matchId.length > 50) {
          return socket.emit("error", { message: "Invalid match ID" });
        }

        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [{ user1Id: socket.userId }, { user2Id: socket.userId }],
          },
        });

        if (!match) {
          return socket.emit("error", { message: "Access denied to this chat" });
        }

        // Leave any previous match rooms before joining a new one
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room !== socket.id) socket.leave(room);
        });

        socket.join(matchId);
      } catch (err) {
        console.error("join_match error:", err);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // ── Send message ──────────────────────────────────────────────────────
    socket.on("send_message", async ({ matchId, content }) => {
      try {
        if (!content || typeof content !== "string" || content.trim() === "") return;
        if (!matchId || typeof matchId !== "string" || matchId.length > 50) {
          return socket.emit("error", { message: "Invalid match ID" });
        }

        const trimmedContent = content.trim().slice(0, MAX_MESSAGE_LENGTH);

        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [{ user1Id: socket.userId }, { user2Id: socket.userId }],
          },
        });

        if (!match) {
          return socket.emit("error", { message: "Access denied" });
        }

        const message = await prisma.message.create({
          data: {
            matchId,
            senderId: socket.userId,
            content: trimmedContent,
          },
          include: {
            sender: { select: { id: true, name: true, photoUrl: true } },
          },
        });

        io.to(matchId).emit("new_message", message);
      } catch (err) {
        console.error("send_message error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── Typing indicator ──────────────────────────────────────────────────
    socket.on("typing", ({ matchId, isTyping }) => {
      if (!matchId || typeof matchId !== "string") return;
      // Only broadcast if user is actually in that room
      if (!socket.rooms.has(matchId)) return;
      socket.to(matchId).emit("user_typing", { userId: socket.userId, isTyping: !!isTyping });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.userId} (${reason})`);
      const set = userSockets.get(socket.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(socket.userId);
      }
    });

    // ── Handle socket errors ───────────────────────────────────────────────
    socket.on("error", (err) => {
      console.error(`Socket error for user ${socket.userId}:`, err);
    });
  });
};

module.exports = { initSocket, emitToUser, userSockets };
