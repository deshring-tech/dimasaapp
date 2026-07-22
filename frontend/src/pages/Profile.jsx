import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile, getMyBusinesses } from "../api";
import TierBadge from "../components/TierBadge";
import InviteButton from "../components/InviteButton";

const LOCATIONS = [
  "Haflong", "Guwahati", "Silchar", "Dimapur", "Imphal",
  "Bangalore", "Delhi", "Mumbai", "Kolkata", "Shillong", "Other"
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    age: user?.age || "",
    gender: user?.gender || "",
    location: user?.location || "",
    locality: user?.locality || "",
    intent: user?.intent || "",
    bio: user?.bio || "",
    photoUrl: user?.photoUrl || "",
  });

  const [myBusinesses, setMyBusinesses] = useState([]);
  useEffect(() => {
    getMyBusinesses().then((r) => setMyBusinesses(r.data || [])).catch(() => {});
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target?.value ?? e }));

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      await updateProfile(form);
      await refreshUser();
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const intentLabel = {
    dating: "💫 Dating",
    serious: "💍 Serious / Marriage",
    friends: "🤝 Just Connect",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary font-semibold px-4 py-2 bg-rose-50 rounded-xl"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setError(""); }}
              className="text-sm text-gray-500 font-medium px-3 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="text-sm text-white font-semibold px-4 py-2 bg-primary rounded-xl disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            ✅ Profile updated successfully!
          </div>
        )}

        {/* Photo card */}
        <div className="card text-center">
          <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-rose-200 to-pink-300
                          flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {(editing ? form.photoUrl : user?.photoUrl) ? (
              <img
                src={editing ? form.photoUrl : user?.photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">
                {user?.gender === "female" ? "👩" : user?.gender === "male" ? "👨" : "🧑"}
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-3">
              <input
                className="input-field text-sm"
                placeholder="Photo URL"
                value={form.photoUrl}
                onChange={set("photoUrl")}
              />
            </div>
          ) : (
            <div className="mt-3">
              <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {user?.age} · {user?.gender} · {user?.location}
              </p>
              <span className="inline-block mt-2 bg-rose-50 text-primary text-xs font-medium px-3 py-1 rounded-full">
                {intentLabel[user?.intent] || user?.intent}
              </span>
              {user?.tier && user.tier !== "free" && (
                <span className="inline-block ml-2 align-middle">
                  <TierBadge tier={user.tier} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-700">Edit Details</h3>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
              <input className="input-field" value={form.name} onChange={set("name")} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Age</label>
              <input type="number" className="input-field" value={form.age} onChange={set("age")} min={18} max={60} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm((p) => ({ ...p, gender: g }))}
                    className={`py-2 rounded-xl border-2 text-sm capitalize transition-all
                      ${form.gender === g ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-600"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Location</label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setForm((p) => ({ ...p, location: loc }))}
                    className={`py-2 px-1 rounded-xl border-2 text-xs transition-all
                      ${form.location === loc ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-600"}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Locality <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. Beltola, Zoo Road"
                maxLength={80}
                value={form.locality}
                onChange={set("locality")}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Intent</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "dating", l: "💫 Dating" },
                  { v: "serious", l: "💍 Serious" },
                  { v: "friends", l: "🤝 Connect" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setForm((p) => ({ ...p, intent: opt.v }))}
                    className={`py-3 rounded-xl border-2 text-xs font-medium transition-all
                      ${form.intent === opt.v ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-600"}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Bio <span className="text-gray-400 font-normal">(max 150 chars)</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={3}
                maxLength={150}
                value={form.bio}
                onChange={set("bio")}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}

        {/* Static bio when not editing */}
        {!editing && user?.bio && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">About</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Membership card */}
        {!editing && (
          <button
            onClick={() => navigate("/membership")}
            className="w-full bg-gradient-to-br from-primary to-rose-600 rounded-2xl p-5 text-white text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">
                  {user?.tier === "free" || !user?.tier
                    ? "✨ Upgrade Membership"
                    : "✨ Manage Membership"}
                </p>
                <p className="text-rose-100 text-sm mt-1">
                  {user?.tier === "free" || !user?.tier
                    ? "Silver, Gold or Platinum — see more, match better"
                    : "Currently on a paid tier"}
                </p>
              </div>
              <span className="text-2xl">→</span>
            </div>
          </button>
        )}

        {/* My Businesses */}
        {!editing && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">🏪 My Businesses</h3>
              <button
                onClick={() => navigate("/business/new")}
                className="text-xs font-semibold text-primary bg-rose-50 px-3 py-1.5 rounded-lg"
              >
                + Add
              </button>
            </div>
            {myBusinesses.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                Own a restaurant, homestay, or shop? Add your business so other Dimasa people can find it.
              </p>
            ) : (
              <div className="space-y-2">
                {myBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/business/${b.id}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {b.imageUrl
                        ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-lg">🏪</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{b.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        <span className="capitalize">{b.type}</span> · {b.district}
                      </p>
                    </div>
                    <span className="text-gray-300 text-lg">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invite */}
        {!editing && (
          <div className="card text-center">
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="font-semibold text-gray-800">Grow the Dimasa Community</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              The more Dimasa people join, the better the matches and connections.
            </p>
            <InviteButton variant="card" size="md" />
          </div>
        )}

        {/* Logout */}
        {!editing && (
          <button
            onClick={logout}
            className="w-full py-3 text-center text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
