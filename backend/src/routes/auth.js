const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");

// ─── Rate limiters ────────────────────────────────────────────────────────────
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { error: "Too many OTP requests. Please wait 10 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many verification attempts. Please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Cryptographically secure 6-digit OTP
const generateOTP = () => {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
};

const normalizePhone = (phone) =>
  phone.startsWith("+") ? phone : `+91${phone}`;

const isValidPhone = (phone) => /^\+?[1-9]\d{9,14}$/.test(phone);

// ─── Send OTP ─────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
router.post("/send-otp", sendOtpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number required" });
    }

    const normalizedPhone = normalizePhone(phone.trim());
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Invalidate any existing unused OTPs for this phone
    await prisma.oTP.updateMany({
      where: { phone: normalizedPhone, used: false },
      data: { used: true },
    });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.oTP.create({
      data: { phone: normalizedPhone, code, expiresAt },
    });

    // ── Production: send via SMS provider ──────────────────────────────────
    // Example with Twilio (uncomment and configure):
    // const twilio = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await twilio.messages.create({
    //   body: `Your Dimasa verification code is: ${code}. Valid for 10 minutes.`,
    //   from: process.env.TWILIO_PHONE,
    //   to: normalizedPhone,
    // });

    // Dev only: print to console
    if (process.env.NODE_ENV !== "production") {
      console.log(`📱 OTP for ${normalizedPhone}: ${code}`);
    }

    res.json({ message: "OTP sent successfully", phone: normalizedPhone });
  } catch (err) {
    next(err);
  }
});

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtpLimiter, async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and OTP required" });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "OTP must be 6 digits" });
    }

    const normalizedPhone = normalizePhone(phone.trim());

    // ─── Dev backdoor ────────────────────────────────────────────────────
    // In development, "000000" is a universal OTP for any phone number.
    // Lets the developer log in repeatedly without checking the terminal.
    // STRICTLY blocked in production.
    const isDevBackdoor =
      process.env.NODE_ENV !== "production" && code === "000000";

    let otp = null;
    if (!isDevBackdoor) {
      otp = await prisma.oTP.findFirst({
        where: {
          phone: normalizedPhone,
          code,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Atomically mark OTP as used
      await prisma.oTP.update({ where: { id: otp.id }, data: { used: true } });
    }

    // Cleanup old OTPs for this phone (keep DB tidy)
    await prisma.oTP.deleteMany({
      where: { phone: normalizedPhone, used: true },
    });

    // Upsert user
    let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone: normalizedPhone } });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        isSetup: user.isSetup,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
