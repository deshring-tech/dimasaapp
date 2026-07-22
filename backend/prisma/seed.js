// Seed script — adds sample Dimasa-area places so the Places tab is never
// empty on a brand-new install.
//
// Runs idempotently: if a place with the same name+district already exists,
// it's skipped. Safe to re-run.

const prisma = require("../src/lib/prisma");

const SAMPLE_PLACES = [
  // ─── Haflong (Dima Hasao district HQ) ─────────────────────────────────
  { name: "Haflong Tourist Lodge", type: "hotel", district: "Haflong",
    address: "Haflong Hill, near Boro Pukhuri", contact: "+91 3673 236113",
    priceRange: "₹₹", description: "Iconic government tourist lodge with hilltop views of Haflong." },
  { name: "Hotel Elite", type: "hotel", district: "Haflong",
    address: "Main Road, Haflong", contact: "+91 9954 123456",
    priceRange: "₹₹" },
  { name: "Cafe Haflong", type: "cafe", district: "Haflong",
    address: "Lower Haflong",
    priceRange: "₹", description: "Cozy neighborhood café serving momos and coffee." },
  { name: "Dimasa Kitchen", type: "restaurant", district: "Haflong",
    address: "Lake Road, Haflong", priceRange: "₹₹",
    description: "Traditional Dimasa cuisine — bamboo shoot curry, dried fish, sticky rice." },
  { name: "Jatinga Homestay", type: "homestay", district: "Haflong",
    address: "Jatinga Village, near bird-watching point",
    contact: "+91 9435 678901", priceRange: "₹₹",
    description: "Homestay in the famous Jatinga village — perfect base for bird-watching season." },
  { name: "Maibang Heritage Stay", type: "homestay", district: "Haflong",
    address: "Maibang Town", priceRange: "₹₹",
    description: "Heritage homestay in the ancient Dimasa capital Maibang." },

  // ─── Guwahati ────────────────────────────────────────────────────────
  { name: "Khorikaa", type: "restaurant", district: "Guwahati",
    address: "GS Road, Christian Basti",
    contact: "+91 9101 100100" },
  { name: "Heritage Khorikaa", type: "restaurant", district: "Guwahati",
    address: "Beltola Tiniali" },
  { name: "Hotel Brahmaputra Ashok", type: "hotel", district: "Guwahati",
    address: "MG Road, Pan Bazaar", contact: "+91 361 2602281" },
  { name: "Cafe Hendrix", type: "cafe", district: "Guwahati",
    address: "GS Road, Bhangagarh" },

  // ─── Silchar ─────────────────────────────────────────────────────────
  { name: "Hotel Saroj Plaza", type: "hotel", district: "Silchar",
    address: "Premtola Point, Silchar", contact: "+91 3842 230880" },
  { name: "Borail Dhaba", type: "dhaba", district: "Silchar",
    address: "NH 6, near Silchar bypass" },

  // ─── Shillong ────────────────────────────────────────────────────────
  { name: "Cafe Shillong", type: "cafe", district: "Shillong",
    address: "Laitumkhrah, near Don Bosco Square" },
  { name: "Tribe Hostel", type: "homestay", district: "Shillong",
    address: "Police Bazaar", contact: "+91 9863 555444" },

  // ─── Dimapur ─────────────────────────────────────────────────────────
  { name: "Hotel Saramati", type: "hotel", district: "Dimapur",
    address: "Circular Road" },
  { name: "Niraamaya Dhaba", type: "dhaba", district: "Dimapur",
    address: "NH-39, Chümoukedima" },
];

// ─── Admin / test users ─────────────────────────────────────────────────────
const ADMIN_USERS = [
  {
    phone: "+919999999999",
    name: "Dimasa Admin",
    age: 28,
    gender: "other",
    location: "Haflong",
    locality: "Central Haflong",
    intent: "friends",
    bio: "App administrator. Always available to test things.",
    tier: "platinum",
    isSetup: true,
  },
  {
    phone: "+918888888888",
    name: "Test Dater",
    age: 26,
    gender: "female",
    location: "Guwahati",
    locality: "Beltola",
    intent: "dating",
    bio: "Hello! I'm a test profile for the dating mode.",
    tier: "gold",
    isSetup: true,
  },
  {
    phone: "+917777777777",
    name: "Test Friend",
    age: 30,
    gender: "male",
    location: "Silchar",
    locality: "Premtola",
    intent: "friends",
    bio: "Test profile for community connections.",
    tier: "free",
    isSetup: true,
  },
];

// ─── Additional community-mode profiles so the grid feels alive ───────────
const COMMUNITY_PROFILES = [
  // Haflong — same district as admin, some same locality
  { phone: "+919111000001", name: "Diptijoy Kemprai", age: 29, gender: "male",   location: "Haflong",  locality: "Central Haflong", bio: "Live in Haflong. Love hiking around Boro Pukhuri." },
  { phone: "+919111000002", name: "Sonali Dibragede", age: 25, gender: "female", location: "Haflong",  locality: "Maibang",         bio: "History enthusiast. From Maibang." },
  // Guwahati — spread across localities
  { phone: "+919111000003", name: "Priya Longmailai", age: 26, gender: "female", location: "Guwahati", locality: "Beltola",         bio: "Software engineer. Beltola resident." },
  { phone: "+919111000004", name: "Kaba Zeme",        age: 30, gender: "male",   location: "Guwahati", locality: "Zoo Road",        bio: "Moved to Guwahati recently. Looking to meet more Dimasa people." },
  { phone: "+919111000005", name: "Anya Barman",      age: 24, gender: "female", location: "Guwahati", locality: "GS Road",         bio: "Grad student at Cotton University." },
  { phone: "+919111000006", name: "Milan Diphusa",    age: 28, gender: "male",   location: "Guwahati", locality: "Uzan Bazaar",     bio: "Photographer. Love the culture." },
  { phone: "+919111000007", name: "Neel Sengyung",    age: 32, gender: "male",   location: "Guwahati", locality: "Beltola",         bio: "Engineer. Beltola area." },
  { phone: "+919111000008", name: "Rita Riangkhang",  age: 27, gender: "female", location: "Guwahati", locality: "Silpukhuri",      bio: "Teacher at a private school. Silpukhuri." },
].map((p) => ({ ...p, intent: "friends", tier: "free", isSetup: true }));

async function seedPlaces() {
  console.log("🌱 Seeding sample places...");
  let added = 0;
  let skipped = 0;

  for (const place of SAMPLE_PLACES) {
    const existing = await prisma.place.findFirst({
      where: { name: place.name, district: place.district },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.place.create({
      data: { ...place, isApproved: true },
    });
    added++;
  }

  console.log(`   ${added} new places (${skipped} already existed).`);
}

async function seedAdminUsers() {
  console.log("👤 Seeding admin / test users...");
  let added = 0;
  let skipped = 0;

  for (const user of [...ADMIN_USERS, ...COMMUNITY_PROFILES]) {
    const existing = await prisma.user.findUnique({
      where: { phone: user.phone },
    });
    if (existing) {
      // Backfill locality on existing users so old seeds get the new field
      if (!existing.locality && user.locality) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { locality: user.locality },
        });
      }
      skipped++;
      continue;
    }
    await prisma.user.create({ data: user });
    added++;
  }

  console.log(`   ${added} new profiles (${skipped} already existed, localities backfilled).`);
}

// Assign a few existing sample places to test users as "owned" businesses,
// so the "Owned by X" badge is visible from day one.
async function assignBusinessOwners() {
  console.log("🏪 Assigning business owners...");
  const admin = await prisma.user.findUnique({ where: { phone: "+919999999999" } });
  const dater = await prisma.user.findUnique({ where: { phone: "+918888888888" } });
  const friend = await prisma.user.findUnique({ where: { phone: "+917777777777" } });

  // Standard restaurant hours (open Mon-Sat, closed Sun)
  const RESTAURANT_HOURS = JSON.stringify({
    mon: "11am–9pm", tue: "11am–9pm", wed: "11am–9pm", thu: "11am–9pm",
    fri: "11am–10pm", sat: "11am–10pm", sun: "Closed",
  });
  const CAFE_HOURS = JSON.stringify({
    mon: "8am–8pm", tue: "8am–8pm", wed: "8am–8pm", thu: "8am–8pm",
    fri: "8am–8pm", sat: "9am–9pm", sun: "9am–6pm",
  });
  const HOMESTAY_HOURS = JSON.stringify({
    mon: "24 hours", tue: "24 hours", wed: "24 hours", thu: "24 hours",
    fri: "24 hours", sat: "24 hours", sun: "24 hours",
  });

  const assignments = [
    { name: "Dimasa Kitchen",        ownerPhone: admin?.id,  hours: RESTAURANT_HOURS },
    { name: "Jatinga Homestay",      ownerPhone: friend?.id, hours: HOMESTAY_HOURS },
    { name: "Cafe Haflong",          ownerPhone: dater?.id,  hours: CAFE_HOURS },
    { name: "Maibang Heritage Stay", ownerPhone: admin?.id,  hours: HOMESTAY_HOURS },
  ];

  let assigned = 0;
  for (const a of assignments) {
    if (!a.ownerPhone) continue;
    const place = await prisma.place.findFirst({ where: { name: a.name } });
    if (place && !place.ownerId) {
      await prisma.place.update({
        where: { id: place.id },
        data: {
          ownerId: a.ownerPhone,
          isClaimed: true,
          whatsapp: place.contact,
          hours: a.hours,
        },
      });
      assigned++;
    }
  }
  console.log(`   Assigned ${assigned} places to test owners.`);
}

async function seedFollows() {
  console.log("🔔 Seeding business follows...");
  const admin  = await prisma.user.findUnique({ where: { phone: "+919999999999" } });
  const dater  = await prisma.user.findUnique({ where: { phone: "+918888888888" } });
  const friend = await prisma.user.findUnique({ where: { phone: "+917777777777" } });

  // Cross-follows so dashboards show non-zero followers
  const pairs = [
    { user: dater,  placeName: "Dimasa Kitchen" },
    { user: friend, placeName: "Dimasa Kitchen" },
    { user: admin,  placeName: "Jatinga Homestay" },
    { user: dater,  placeName: "Jatinga Homestay" },
    { user: friend, placeName: "Cafe Haflong" },
    { user: admin,  placeName: "Cafe Haflong" },
  ];

  let added = 0;
  for (const p of pairs) {
    if (!p.user) continue;
    const place = await prisma.place.findFirst({ where: { name: p.placeName } });
    if (!place) continue;
    try {
      await prisma.follow.create({
        data: { userId: p.user.id, placeId: place.id },
      });
      added++;
    } catch { /* unique constraint = already follows */ }
  }
  console.log(`   Added ${added} follows.`);
}

// ─── Sample posts for the community feed ────────────────────────────────
async function seedPosts() {
  console.log("📝 Seeding community feed posts...");

  const admin  = await prisma.user.findUnique({ where: { phone: "+919999999999" } });
  const dater  = await prisma.user.findUnique({ where: { phone: "+918888888888" } });
  const friend = await prisma.user.findUnique({ where: { phone: "+917777777777" } });

  if (!admin || !dater || !friend) {
    console.log("   Test users not seeded yet — skipping posts.");
    return;
  }

  // Idempotent: only add if there are no posts yet
  const existingCount = await prisma.post.count();
  if (existingCount > 0) {
    console.log(`   ${existingCount} posts already exist — skipping.`);
    return;
  }

  const kitchen = await prisma.place.findFirst({ where: { name: "Dimasa Kitchen" } });
  const jatinga = await prisma.place.findFirst({ where: { name: "Jatinga Homestay" } });

  const posts = [
    {
      authorId: admin.id,
      content: "Welcome everyone to the Dimasa community app! 🏔️ Excited to have this space for us to connect, share, and grow together. Say hi in the comments!",
    },
    {
      authorId: friend.id,
      content: "Jatinga bird-watching season is starting soon! 🕊️ We're taking bookings for the September–November window at the homestay. DM for rates.",
      placeId: jatinga?.id,
    },
    {
      authorId: dater.id,
      content: "Anyone else missing Haflong right now? The rain, the hills, the food... 🌧️🌄",
    },
    {
      authorId: admin.id,
      content: "New bamboo shoot curry on the menu this week at Dimasa Kitchen! 🥘 Come by Lake Road anytime between 11am–9pm. Try our sticky rice too.",
      placeId: kitchen?.id,
    },
    {
      authorId: friend.id,
      content: "Looking for a Dimasa-speaking web developer for a small freelance project. Payment fair. Reply here or DM if interested. 💻",
    },
    {
      authorId: dater.id,
      content: "Bushu festival planning — anyone in Guwahati wanting to organize a small get-together? Would love to meet fellow Dimasa people here. ✨",
    },
    {
      authorId: admin.id,
      content: "Reminder: this app is BUILT for the Dimasa community. Community mode is 100% free. Only dating/marriage has memberships. Enjoy!",
    },
  ];

  let added = 0;
  for (const post of posts) {
    await prisma.post.create({ data: post });
    added++;
  }

  // Seed a few reactions and comments to make the feed feel active
  const allPosts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  const users = [admin, dater, friend];

  // Reactions: each user hearts the first 3 posts they didn't write
  for (const user of users) {
    for (const post of allPosts.slice(0, 5)) {
      if (post.authorId === user.id) continue;
      try {
        await prisma.reaction.create({
          data: { postId: post.id, userId: user.id },
        });
      } catch { /* unique constraint hits are fine */ }
    }
  }

  // A couple of comments on the welcome post
  const welcomePost = allPosts.find((p) => p.content.includes("Welcome everyone"));
  if (welcomePost) {
    await prisma.comment.create({
      data: {
        postId: welcomePost.id,
        authorId: friend.id,
        content: "Great to be here! Excited to connect with everyone 🤝",
      },
    });
    await prisma.comment.create({
      data: {
        postId: welcomePost.id,
        authorId: dater.id,
        content: "Finally a Dimasa-only space. Been waiting for this ✨",
      },
    });
  }

  console.log(`   Added ${added} posts + sample reactions/comments.`);
}

async function seed() {
  const isProd = process.env.NODE_ENV === "production";

  // Places are real venue data — safe to seed everywhere.
  await seedPlaces();

  // Test users, follows, and demo posts are DEV-ONLY.
  // In production the community starts clean.
  if (isProd) {
    console.log("🌐 Production mode — skipping test users, follows, and demo posts.");
    console.log("✅ Seed complete.");
    return;
  }

  await seedAdminUsers();
  await assignBusinessOwners();
  await seedFollows();
  await seedPosts();
  console.log("✅ Seed complete.");
  console.log("");
  console.log("   ────────────────────────────────────────────────────");
  console.log("   🔐  Dev Login (admin):");
  console.log("       Phone: 9999999999   OTP: 000000");
  console.log("");
  console.log("   👥  Other test profiles (so Discover is not empty):");
  console.log("       Phone: 8888888888   OTP: 000000  (dating)");
  console.log("       Phone: 7777777777   OTP: 000000  (community)");
  console.log("   ────────────────────────────────────────────────────");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
