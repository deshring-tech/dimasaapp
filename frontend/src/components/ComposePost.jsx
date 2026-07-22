import { useState, useEffect } from "react";
import { createPost, getMyBusinesses } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const MAX = 2000;

// Modal to create a new post. `onCreated(post)` fires with the new post.
// Business owners get a "Post as ..." switcher so they can post as their business.
export default function ComposePost({ open, onClose, onCreated, prefilledPlaceId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // Post-as-business
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [asPlaceId, setAsPlaceId] = useState(prefilledPlaceId || null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    getMyBusinesses().then((r) => setMyBusinesses(r.data || [])).catch(() => {});
    setAsPlaceId(prefilledPlaceId || null);
  }, [open, prefilledPlaceId]);

  if (!open) return null;

  const activeBusiness = asPlaceId ? myBusinesses.find((b) => b.id === asPlaceId) : null;

  const handleClose = () => {
    setContent(""); setImageUrl(""); setError("");
    setAsPlaceId(null); setPickerOpen(false);
    onClose();
  };

  const handlePost = async () => {
    if (!content.trim() && !imageUrl.trim()) {
      setError("Write something or add a photo");
      return;
    }
    setPosting(true);
    setError("");
    try {
      const res = await createPost({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        placeId: asPlaceId || undefined,
      });
      onCreated?.(res.data);
      toast({
        icon: activeBusiness ? "🏪" : "✨",
        title: activeBusiness ? `Posted as ${activeBusiness.name}` : "Posted!",
        tone: "success",
      });
      handleClose();
    } catch (e) {
      setError(e.response?.data?.error || "Could not post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden animate-slide-up shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <button onClick={handleClose} className="text-sm text-gray-500 font-medium">
            Cancel
          </button>
          <h2 className="text-base font-semibold text-gray-800">New post</h2>
          <button
            onClick={handlePost}
            disabled={posting || (!content.trim() && !imageUrl.trim())}
            className="text-sm font-semibold text-white bg-primary px-4 py-1.5 rounded-full disabled:opacity-40"
          >
            {posting ? "..." : "Post"}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Author strip with post-as switcher */}
          <div className="relative">
            <button
              onClick={() => myBusinesses.length > 0 && setPickerOpen((v) => !v)}
              className={`w-full flex items-start gap-3 rounded-xl p-2 -m-2 text-left
                ${myBusinesses.length > 0 ? "hover:bg-gray-50 active:bg-gray-100" : ""}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0
                ${activeBusiness
                  ? "bg-gradient-to-br from-amber-100 to-orange-200"
                  : "bg-gradient-to-br from-rose-200 to-pink-300"}`}
              >
                {activeBusiness ? (
                  activeBusiness.imageUrl
                    ? <img src={activeBusiness.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <span>🏪</span>
                ) : (
                  user?.photoUrl
                    ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                    : <span>👤</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  {activeBusiness ? activeBusiness.name : user?.name}
                  {myBusinesses.length > 0 && (
                    <span className="text-gray-400 text-xs">▾</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  {activeBusiness
                    ? `Posting as your business · ${activeBusiness.type}`
                    : "Sharing with the Dimasa community"}
                </p>
              </div>
              {activeBusiness && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 self-center">
                  Business
                </span>
              )}
            </button>

            {/* Picker dropdown */}
            {pickerOpen && myBusinesses.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg py-1 z-10">
                <button
                  onClick={() => { setAsPlaceId(null); setPickerOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center overflow-hidden">
                    {user?.photoUrl
                      ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-sm">👤</span>
                    }
                  </div>
                  <span className="text-sm text-gray-800 flex-1">{user?.name}</span>
                  {!activeBusiness && <span className="text-primary">✓</span>}
                </button>
                {myBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setAsPlaceId(b.id); setPickerOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center overflow-hidden">
                      {b.imageUrl
                        ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm">🏪</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400 truncate capitalize">{b.type} · {b.district}</p>
                    </div>
                    {asPlaceId === b.id && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            autoFocus
            className="w-full text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none resize-none min-h-[120px]"
            placeholder={activeBusiness
              ? `Share an update from ${activeBusiness.name}...`
              : "What's on your mind?"}
            maxLength={MAX}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {imageUrl && (
            <img
              src={imageUrl}
              alt="preview"
              className="w-full max-h-64 object-cover rounded-xl border border-gray-100"
              onError={() => {}}
            />
          )}

          <input
            className="input-field text-sm"
            placeholder="🖼️ Paste image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <p className="text-[10px] text-gray-400 text-right">
            {content.length}/{MAX}
          </p>
        </div>
      </div>
    </div>
  );
}
