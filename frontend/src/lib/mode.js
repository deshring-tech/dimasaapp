// Helper to derive whether a user is in community vs dating mode.
// Single source of truth so we don't sprinkle `intent === "friends"` checks
// across the app.

export const isCommunityMode = (user) => user?.intent === "friends";

export const modeOf = (user) => (isCommunityMode(user) ? "community" : "dating");

// Vocabulary that adapts to mode — use these in any UI that's mode-aware.
export const modeWords = (user) => {
  const community = isCommunityMode(user);
  return {
    community,
    // Singular/plural for matches/connections
    matchOne: community ? "connection" : "match",
    matchMany: community ? "connections" : "matches",
    // Match popup
    matchedTitle: community ? "Connected!" : "It's a Match!",
    matchedBody: community ? "are now connected." : "both liked each other.",
    // CTA labels
    interestVerb: community ? "Say Hi" : "Interested",
    interestEmoji: community ? "👋" : "❤️",
    // Navigation
    discoverTitle: community ? "Community" : "Discover",
    discoverIcon: community ? "🤝" : "❤️",
    // Photo encouragement
    photoBoost: community
      ? "Profiles with photos get 3× more connections"
      : "Profiles with photos get 3× more matches",
    // Completion CTA
    finishCTA: community ? "Start Connecting 🎉" : "Start Matching 🎉",
    // Chat empty
    chatEmptyMessage: community
      ? "You connected! Say hello 👋"
      : "You matched! Say hello 👋",
    chatInboxEmpty: community
      ? "No connections yet"
      : "No matches yet",
    chatInboxEmptyBody: community
      ? "When you and someone both want to connect, you'll see them here."
      : "When you and someone both like each other, you'll see them here.",
  };
};
