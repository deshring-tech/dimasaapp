const { PrismaClient } = require("@prisma/client");

// Singleton — one connection pool for the entire process
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

module.exports = prisma;
