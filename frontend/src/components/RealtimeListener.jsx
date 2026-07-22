import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getGlobalSocket } from "../lib/globalSocket";

// Listens for app-wide socket events and shows toast notifications.
// Mounted once at the App root so it works from any page.
export default function RealtimeListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const sock = getGlobalSocket();
    if (!sock) return;

    const isCommunity = user.intent === "friends";

    // ─── New incoming message (when not in that chat) ────────────────────
    const onNewMessage = (msg) => {
      // Suppress if user is already in that chat
      if (location.pathname.startsWith(`/chat/${msg.matchId}`)) return;
      // Suppress if it's the user's own message
      if (msg.senderId === user.id) return;

      toast({
        icon: "💬",
        title: msg.sender?.name || "New message",
        body: msg.content.length > 60 ? msg.content.slice(0, 60) + "..." : msg.content,
        tone: "info",
        onClick: () => navigate(`/chat/${msg.matchId}`),
      });
    };

    // ─── Someone showed interest in you ──────────────────────────────────
    const onInterestReceived = ({ fromUser }) => {
      if (!fromUser) return;
      toast({
        icon: isCommunity ? "🤝" : "❤️",
        title: isCommunity ? "Someone wants to connect" : "Someone is interested",
        body: `${fromUser.name} from ${fromUser.location || "Dimasa"}`,
        tone: "info",
      });
    };

    // ─── It became a mutual match / connection ───────────────────────────
    const onMatchCreated = ({ match, otherUser }) => {
      if (!otherUser) return;
      toast({
        icon: isCommunity ? "🤝" : "🎉",
        title: isCommunity ? "Connected!" : "It's a Match!",
        body: `You and ${otherUser.name} can now chat`,
        tone: "match",
        duration: 6000,
        onClick: () => navigate(`/chat/${match.id}`),
      });
    };

    // ─── Business inquiry (someone contacted your business) ─────────────
    const onBusinessInquiry = ({ match, fromUser, place }) => {
      toast({
        icon: "🏪",
        title: "New business inquiry",
        body: `${fromUser?.name} is asking about ${place?.name}`,
        tone: "success",
        duration: 6000,
        onClick: () => navigate(`/chat/${match.id}`),
      });
    };

    // ─── Someone hearted your post ──────────────────────────────────────
    const onPostReacted = ({ postId, fromUser }) => {
      if (!fromUser) return;
      toast({
        icon: "❤️",
        title: `${fromUser.name} hearted your post`,
        tone: "info",
        onClick: () => navigate("/home"),
      });
    };

    // ─── Someone commented on your post ─────────────────────────────────
    const onPostCommented = ({ postId, comment }) => {
      if (!comment?.author) return;
      const body = comment.content.length > 60
        ? comment.content.slice(0, 60) + "..."
        : comment.content;
      toast({
        icon: "💬",
        title: `${comment.author.name} commented`,
        body,
        tone: "info",
        onClick: () => navigate("/home"),
      });
    };

    // ─── A business you follow posted ───────────────────────────────────
    const onBusinessPost = ({ post }) => {
      if (!post?.place) return;
      const body = post.content?.length > 60
        ? post.content.slice(0, 60) + "..."
        : post.content;
      toast({
        icon: "🏪",
        title: `${post.place.name} posted an update`,
        body,
        tone: "success",
        duration: 6000,
        onClick: () => navigate("/home"),
      });
    };

    sock.on("new_message", onNewMessage);
    sock.on("interest_received", onInterestReceived);
    sock.on("match_created", onMatchCreated);
    sock.on("business_inquiry", onBusinessInquiry);
    sock.on("post_reacted", onPostReacted);
    sock.on("post_commented", onPostCommented);
    sock.on("business_post", onBusinessPost);

    return () => {
      sock.off("new_message", onNewMessage);
      sock.off("interest_received", onInterestReceived);
      sock.off("match_created", onMatchCreated);
      sock.off("business_inquiry", onBusinessInquiry);
      sock.off("post_reacted", onPostReacted);
      sock.off("post_commented", onPostCommented);
      sock.off("business_post", onBusinessPost);
    };
  }, [user, toast, navigate, location.pathname]);

  return null;
}
