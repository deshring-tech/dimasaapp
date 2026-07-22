import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlace, addPlace, updatePlace, getDistricts } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const TYPES = [
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "hotel",      label: "🏨 Hotel" },
  { value: "homestay",   label: "🏡 Homestay" },
  { value: "dhaba",      label: "🥘 Dhaba" },
  { value: "cafe",       label: "☕ Cafe" },
  { value: "shop",       label: "🛍️ Shop" },
  { value: "service",    label: "🛠️ Service" },
];

const PRICE_RANGES = [
  { value: "₹",    label: "₹ Budget" },
  { value: "₹₹",   label: "₹₹ Moderate" },
  { value: "₹₹₹",  label: "₹₹₹ Premium" },
  { value: "₹₹₹₹", label: "₹₹₹₹ Luxury" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

const DEFAULT_HOURS = {
  mon: "9am–6pm", tue: "9am–6pm", wed: "9am–6pm", thu: "9am–6pm",
  fri: "9am–6pm", sat: "9am–6pm", sun: "Closed",
};

export default function BusinessEditor() {
  const { id } = useParams();       // undefined for "new"
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", type: "restaurant", district: "Haflong",
    address: "", contact: "", whatsapp: "", email: "",
    imageUrl: "", description: "", priceRange: "₹₹",
    tags: "", isOwner: true,
  });
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [gallery, setGallery] = useState([]);   // list of URLs
  const [galleryInput, setGalleryInput] = useState("");
  const [districts, setDistricts] = useState([
    "Haflong", "Guwahati", "Silchar", "Dimapur", "Imphal",
    "Bangalore", "Delhi", "Mumbai", "Kolkata", "Shillong",
  ]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing business if editing
  useEffect(() => {
    if (isNew) {
      getDistricts().then((r) => {
        if (r.data.length) {
          setDistricts((prev) => Array.from(new Set([...prev, ...r.data])));
        }
      }).catch(() => {});
      return;
    }
    getPlace(id)
      .then((r) => {
        const b = r.data;
        // Guard: only owner can edit
        if (b.owner?.id !== user?.id) {
          toast({ icon: "🔒", title: "Only the owner can edit this business", tone: "error" });
          navigate(`/business/${id}`);
          return;
        }
        setForm({
          name: b.name || "", type: b.type || "restaurant",
          district: b.district || "Haflong",
          address: b.address || "", contact: b.contact || "",
          whatsapp: b.whatsapp || "", email: b.email || "",
          imageUrl: b.imageUrl || "", description: b.description || "",
          priceRange: b.priceRange || "₹₹",
          tags: b.tags || "", isOwner: true,
        });
        try {
          if (b.hours) setHours(JSON.parse(b.hours));
        } catch {}
        try {
          if (b.gallery) setGallery(JSON.parse(b.gallery));
        } catch {}
      })
      .catch(() => setError("Could not load business"))
      .finally(() => setLoading(false));
  }, [id, isNew, user?.id]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target?.value ?? e }));

  const handleAddGalleryImage = () => {
    const url = galleryInput.trim();
    if (!url) return;
    if (!url.startsWith("http")) {
      setError("Image URL must start with http or https");
      return;
    }
    setGallery((prev) => [...prev, url]);
    setGalleryInput("");
    setError("");
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) return setError("Name is required");
    if (form.name.trim().length < 2) return setError("Name too short");
    if (!form.district.trim()) return setError("District is required");

    setSaving(true);
    try {
      const payload = {
        ...form,
        hours: JSON.stringify(hours),
        gallery: JSON.stringify(gallery),
      };
      if (isNew) {
        const res = await addPlace(payload);
        toast({ icon: "🎉", title: "Business added!", tone: "success" });
        navigate(`/business/${res.data.place.id}`);
      } else {
        await updatePlace(id, payload);
        toast({ icon: "✅", title: "Business updated", tone: "success" });
        navigate(`/business/${id}`);
      }
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">
          {isNew ? "Add a Business" : "Edit Business"}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* Basics */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basics</p>
          <input className="input-field" placeholder="Business name *" value={form.name} onChange={set("name")} />
          <select className="input-field" value={form.type} onChange={set("type")}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="input-field" value={form.district} onChange={set("district")}>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input-field" value={form.priceRange} onChange={set("priceRange")}>
            {PRICE_RANGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Description (what makes it special?)"
            maxLength={1000}
            value={form.description}
            onChange={set("description")}
          />
          <input className="input-field" placeholder="Address" value={form.address} onChange={set("address")} />
        </div>

        {/* Contact */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
          <input className="input-field" placeholder="📞 Phone" value={form.contact} onChange={set("contact")} />
          <input className="input-field" placeholder="💬 WhatsApp number" value={form.whatsapp} onChange={set("whatsapp")} />
          <input className="input-field" placeholder="✉️ Email" value={form.email} onChange={set("email")} />
        </div>

        {/* Hours */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hours</p>
          {DAYS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-12">{DAY_LABELS[d]}</span>
              <input
                className="input-field flex-1 text-sm"
                placeholder="e.g. 9am–6pm or Closed"
                value={hours[d] || ""}
                onChange={(e) => setHours({ ...hours, [d]: e.target.value })}
              />
            </div>
          ))}
        </div>

        {/* Photos */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Photos</p>
          <input
            className="input-field"
            placeholder="🖼️ Cover image URL"
            value={form.imageUrl}
            onChange={set("imageUrl")}
          />
          {form.imageUrl && (
            <img src={form.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-xl" />
          )}
          <p className="text-xs text-gray-400 mt-2">Additional photos (gallery):</p>
          <div className="flex gap-2">
            <input
              className="input-field text-sm flex-1"
              placeholder="Paste image URL"
              value={galleryInput}
              onChange={(e) => setGalleryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGalleryImage())}
            />
            <button
              onClick={handleAddGalleryImage}
              className="text-xs font-semibold px-3 rounded-xl bg-gray-100 text-gray-700"
            >
              Add
            </button>
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {gallery.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setGallery(gallery.filter((_, ix) => ix !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400">
            💡 File upload coming soon — paste image URLs for now
          </p>
        </div>

        {/* Ownership toggle */}
        {isNew && (
          <div className="card">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOwner}
                onChange={(e) => setForm({ ...form, isOwner: e.target.checked })}
                className="mt-1 w-4 h-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">I own this business</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only owners can edit details and receive messages. If unchecked, this will be added as a community listing.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
