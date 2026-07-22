import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import InviteButton from "./InviteButton";

const STORAGE_KEY = "dimasa_welcomed_v1";

// Shows a one-time welcome flow after a user finishes profile setup.
// Persists "seen" state in localStorage so it doesn't re-appear.
export default function WelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user?.isSetup) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // tiny delay so it doesn't pop up before page paints
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [user?.isSetup]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open || !user) return null;

  const isCommunity = user.intent === "friends";

  const slides = [
    {
      emoji: "🏔️",
      title: `Welcome, ${user.name?.split(" ")[0] || "friend"}!`,
      body: isCommunity
        ? "You're now part of the Dimasa community on the app. Find old friends, meet new ones, and reconnect with your roots."
        : "Your profile is live. Let's find you someone special from the Dimasa community.",
    },
    {
      emoji: isCommunity ? "🤝" : "❤️",
      title: isCommunity ? "How Connect works" : "How Matching works",
      body: isCommunity
        ? "Browse profiles in Meet. Tap Connect on anyone you'd like to know. When both of you connect, you can start chatting."
        : "Browse profiles in Discover. Tap Interested on someone. When both sides show interest, it's a match — you can chat.",
    },
    {
      emoji: "🔀",
      title: "Switch modes anytime",
      body: "Community, Dating, and Serious modes each have their own pool. Use the switcher at the top of the Meet tab to change what you see — one tap, no settings menu.",
    },
    {
      emoji: "📍",
      title: "Explore Places",
      body: "Discover Dimasa-owned restaurants, hotels, homestays, and dhabas across the region. Add your own favorites too.",
    },
    {
      emoji: "🌱",
      title: "Help the community grow",
      body: "The app gets better the more Dimasa people join. Invite friends and family — they can use it for community connections, dating, or both.",
      invite: true,
    },
  ];

  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden animate-slide-up shadow-xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all
                ${i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-gray-200"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-8 text-center">
          <div className="text-6xl mb-4">{slide.emoji}</div>
          <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{slide.body}</p>

          {slide.invite && (
            <div className="mt-5">
              <InviteButton variant="card" size="md" />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex border-t border-gray-100">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 text-sm font-medium text-gray-500"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => (isLast ? close() : setStep(step + 1))}
            className="flex-1 py-4 text-sm font-semibold text-primary"
          >
            {isLast ? "Let's go! 🎉" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
