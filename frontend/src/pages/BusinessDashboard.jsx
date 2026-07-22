import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBusinessDashboard } from "../api";
import { useToast } from "../context/ToastContext";
import timeAgo from "../lib/timeAgo";

export default function BusinessDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBusinessDashboard(id)
      .then((r) => setData(r.data))
      .catch((e) => {
        toast({
          icon: "🔒",
          title: e.response?.data?.error || "Cannot view dashboard",
          tone: "error",
        });
        navigate(`/business/${id}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  const stats = [
    { icon: "👁️", label: "Total views", value: data.views, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { icon: "🔔", label: "Followers", value: data.followers, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { icon: "📝", label: "Posts", value: data.postsCount, color: "bg-violet-50 text-violet-700 border-violet-200" },
    { icon: "❤️", label: "Reactions", value: data.totalReactions, color: "bg-rose-50 text-rose-700 border-rose-200" },
    { icon: "💬", label: "Comments", value: data.totalComments, color: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-secondary text-white px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm mb-2">
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">
              Dashboard
            </p>
            <h1 className="text-xl font-bold">{data.place.name}</h1>
          </div>
          <button
            onClick={() => navigate(`/business/${id}/edit`)}
            className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl"
          >
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            This all time
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`rounded-xl p-3 border ${s.color}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{s.icon}</span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {s.label}
                  </p>
                </div>
                <p className="text-2xl font-bold">{s.value.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent posts */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800">Recent posts</h2>
          <button
            onClick={() => navigate("/home")}
            className="text-xs text-primary font-semibold"
          >
            View all →
          </button>
        </div>

        {data.recentPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="text-4xl mb-2">📢</div>
            <p className="text-sm font-medium text-gray-700">No business posts yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Post as {data.place.name} on the Home feed to reach your followers.
            </p>
            <button
              onClick={() => navigate("/home")}
              className="text-sm font-semibold text-white bg-primary px-4 py-2 rounded-xl"
            >
              Write a post
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentPosts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 p-3"
              >
                <p className="text-sm text-gray-800 line-clamp-3">
                  {p.content || "(image only)"}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                  <span>{timeAgo(p.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    <span>❤️ {p.reactions}</span>
                    <span>💬 {p.comments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-4 mt-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            💡 Tips to grow
          </p>
          <ul className="text-xs text-emerald-700 space-y-1">
            <li>• Post updates weekly — followers get notified in real time.</li>
            <li>• Keep hours updated so the "Open now" badge works.</li>
            <li>• Add photos to your gallery — profiles with photos get 3× more contacts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
