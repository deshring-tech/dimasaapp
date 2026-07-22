import { useNavigate } from "react-router-dom";

// Shared shell for legal pages
function LegalShell({ title, updated, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      <div className="px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm mb-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="text-xs text-gray-400 mt-1">Last updated: {updated}</p>
      </div>
      <div className="px-5 py-5 space-y-4 text-sm text-gray-600 leading-relaxed pb-16">
        {children}
      </div>
    </div>
  );
}

const H = ({ children }) => (
  <h2 className="text-base font-semibold text-gray-800 pt-2">{children}</h2>
);

export function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <p>
        Welcome to Dimasa. By creating an account or using this app, you agree to
        these terms. If you do not agree, please do not use the app.
      </p>

      <H>1. Who can use Dimasa</H>
      <p>
        You must be at least 18 years old to create an account. The app is built
        for the Dimasa community — for connecting, dating, and supporting
        Dimasa-owned businesses.
      </p>

      <H>2. Your account</H>
      <p>
        Your account is tied to your phone number. You are responsible for
        activity that happens under your account. Provide accurate information
        — fake profiles, impersonation, or misrepresenting your age are grounds
        for removal.
      </p>

      <H>3. Acceptable behaviour</H>
      <p>
        Treat others with respect. The following are not allowed and may result
        in immediate account removal: harassment, hate speech, threats, sexual
        content involving minors, spam, scams, or soliciting money from other
        members.
      </p>

      <H>4. Content you post</H>
      <p>
        You own the content you post (photos, posts, business listings). By
        posting, you give us permission to display it inside the app. Do not
        post content you don't have the right to share. We may remove content
        that violates these terms.
      </p>

      <H>5. Business listings</H>
      <p>
        Business information is provided by users and owners. We do not verify
        every listing and are not responsible for the accuracy of business
        details, or for transactions between you and any business.
      </p>

      <H>6. Memberships</H>
      <p>
        Paid membership tiers affect visibility in dating mode. Community mode
        is free. Membership fees, once payment is live, are non-refundable
        except where required by law.
      </p>

      <H>7. Safety</H>
      <p>
        We do not run background checks on members. Exercise caution when
        meeting people — meet in public places, tell someone where you're going,
        and report suspicious behaviour to us.
      </p>

      <H>8. Termination</H>
      <p>
        We may suspend or remove accounts that violate these terms. You may
        delete your account at any time from your profile settings.
      </p>

      <H>9. Liability</H>
      <p>
        The app is provided "as is". To the maximum extent permitted by law, we
        are not liable for damages arising from your use of the app, including
        interactions with other members or businesses.
      </p>

      <H>10. Changes</H>
      <p>
        We may update these terms. Continued use after changes means you accept
        the updated terms.
      </p>

      <H>Contact</H>
      <p>
        Questions about these terms: contact the app administrator through the
        app or the official Dimasa community channels.
      </p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        This policy explains what data Dimasa collects, why, and what control
        you have over it.
      </p>

      <H>What we collect</H>
      <p>
        <strong>Account data:</strong> phone number (for login), name, age,
        gender, location, locality, bio, and photos you choose to add.
        <br />
        <strong>Content:</strong> posts, comments, messages, business listings
        you create.
        <br />
        <strong>Usage:</strong> basic technical logs (errors, timestamps) to
        keep the service running.
      </p>

      <H>What we do NOT collect</H>
      <p>
        We do not access your contacts, GPS location, or files. Your locality is
        only what you type in. We do not sell your data to anyone.
      </p>

      <H>Who can see your profile</H>
      <p>
        Your profile (name, age, photo, locality, bio) is visible to other
        logged-in members according to your mode: community members see
        community profiles; dating members see dating profiles within their
        membership tier's visibility. Your phone number is never shown to other
        members.
      </p>

      <H>Messages</H>
      <p>
        Chats are private between you and the other person. Administrators do
        not read messages in the normal course of operations, but may review
        specific conversations if reported for abuse.
      </p>

      <H>Data storage</H>
      <p>
        Data is stored on cloud infrastructure (database and hosting providers).
        We take reasonable measures to protect it, including encrypted
        connections and hashed authentication.
      </p>

      <H>Deleting your data</H>
      <p>
        You can delete your posts and comments anytime. To delete your entire
        account and its data, use the delete option in Profile or contact the
        administrator. Account deletion removes your profile, matches, and
        messages.
      </p>

      <H>Cookies & tracking</H>
      <p>
        The app uses local storage on your device to keep you logged in. We do
        not use third-party advertising trackers.
      </p>

      <H>Changes</H>
      <p>
        If this policy changes materially, we will notify you in the app.
      </p>
    </LegalShell>
  );
}
