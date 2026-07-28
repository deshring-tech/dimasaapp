const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../lib/prisma");

// Google OAuth client (only used if GOOGLE_CLIENT_ID is configured)
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

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

    // ─── Private admin login (works in production, gated by secrets) ──────
    // Lets specific admin phone numbers log in with a private master code,
    // without SMS. Set ADMIN_PHONES (comma-separated, e.g. "+919999999999")
    // and ADMIN_OTP (a long secret only you know) in the environment.
    // Remove both once a real SMS provider is wired.
    const ADMIN_PHONES = (process.env.ADMIN_PHONES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => normalizePhone(p)); // accept "9999999999" or "+919999999999"
    const isAdminMasterLogin =
      !!process.env.ADMIN_OTP &&
      code === process.env.ADMIN_OTP &&
      ADMIN_PHONES.includes(normalizedPhone);

    let otp = null;
    if (!isDevBackdoor && !isAdminMasterLogin) {
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

    // Upsert user (admin phones get Platinum automatically)
    let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          ...(ADMIN_PHONES.includes(normalizedPhone) ? { tier: "platinum" } : {}),
        },
      });
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

// ─── Sign in with Google ─────────────────────────────────────────────────────
// POST /api/auth/google   Body: { credential }  (Google ID token from GIS)
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/google", googleLimiter, async (req, res, next) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ error: "Google sign-in is not configured yet." });
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    // Verify the ID token with Google — proves it's genuine and for our app
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const googleId = payload.sub;
    const email = payload.email ? payload.email.toLowerCase() : null;
    const name = payload.name || null;
    const picture = payload.picture || null;

    if (!googleId) {
      return res.status(401).json({ error: "Could not read Google account" });
    }

    // Find by googleId first, then by email (link existing accounts), else create
    let user =
      (await prisma.user.findUnique({ where: { googleId } })) ||
      (email ? await prisma.user.findUnique({ where: { email } }) : null);

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          photoUrl: picture,
        },
      });
    } else if (!user.googleId) {
      // Link Google to an existing (e.g. phone) account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, email: user.email || email, lastSeen: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date() },
      });
    }

    res.json({
      token: signToken(user.id),
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        isSetup: user.isSetup,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
