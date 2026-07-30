import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { getMessages, getChatPartner } from "../api";
import { useAuth } from "../context/AuthContext";
import { modeWords } from "../lib/mode";
import { SOCKET_URL } from "../lib/config";

// Socket instance lives in module scope — cleaned up on disconnect
let socket = null;

function getSocketInstance() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("dimasa_token") },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
  }
  return socket;
}

export default function ChatRoom() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const words = modeWords(user);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | online | offline
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const sock = useRef(null);

  // ── Who am I chatting with? (works even with zero messages) ──────────────
  useEffect(() => {
    getChatPartner(matchId)
      .then((res) => {
        if (res.data?.partner) setOtherUser(res.data.partner);
      })
      .catch(() => {}); // fall back to inferring from messages below
  }, [matchId]);

  // ── Load message history ─────────────────────────────────────────────────
  useEffect(() => {
    getMessages(matchId)
      .then((res) => {
        // API now returns { messages, nextCursor }
        const msgs = Array.isArray(res.data) ? res.data : res.data.messages ?? [];
        setMessages(msgs);
        // Fallback: infer partner from messages if the partner call failed
        setOtherUser((prev) => {
          if (prev) return prev;
          return msgs.find((m) => m.sender?.id !== user?.id)?.sender || null;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [matchId, user?.id]);

  // ── Socket connection ────────────────────────────────────────────────────
  useEffect(() => {
    sock.current = getSocketInstance();
    sock.current.connect();

    // ── Connection events
    sock.current.on("connect", () => {
      setConnectionStatus("online");
      sock.current.emit("join_match", matchId);
    });

    sock.current.on("disconnect", () => {
      setConnectionStatus("offline");
    });

    sock.current.on("connect_error", () => {
      setConnectionStatus("offline");
    });

    sock.current.on("reconnect", () => {
      setConnectionStatus("online");
      sock.current.emit("join_match", matchId);
    });

    // ── Message events
    sock.current.on("new_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev; // deduplicate
        if (!otherUser && msg.sender?.id !== user?.id) setOtherUser(msg.sender);
        // Replace temp optimistic message if IDs match timing
        const withoutTemp = prev.filter(
          (m) => !(m.id?.startsWith("temp-") && m.content === msg.content && m.senderId === msg.senderId)
        );
        return [...withoutTemp, msg];
      });
    });

    sock.current.on("user_typing", ({ isTyping }) => {
      setTyping(isTyping);
    });

    // Immediately join if already connected
    if (sock.current.connected) {
      sock.current.emit("join_match", matchId);
      setConnectionStatus("online");
    }

    return () => {
      sock.current.off("connect");
      sock.current.off("disconnect");
      sock.current.off("connect_error");
      sock.current.off("reconnect");
      sock.current.off("new_message");
      sock.current.off("user_typing");
      sock.current.disconnect();
      socket = null;
    };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim() || connectionStatus !== "online") return;
    const content = input.trim();
    sock.current.emit("send_message", { matchId, content });

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        content,
        senderId: user.id,
        sender: { id: user.id, name: user.name },
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);
    setInput("");
  }, [input, matchId, user, connectionStatus]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (sock.current?.connected) {
      sock.current.emit("typing", { matchId, isTyping: true });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        sock.current?.emit("typing", { matchId, isTyping: false });
      }, 1500);
    }
  };

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-400 text-sm">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate("/chat")} className="text-gray-500 text-xl p-1">
          ←
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
          {otherUser?.photoUrl
            ? <img src={otherUser.photoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg">👤</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {otherUser?.name || (loading ? "…" : "Chat")}
          </p>
          {typing ? (
            <p className="text-xs text-primary animate-pulse">typing...</p>
          ) : connectionStatus === "offline" ? (
            <p className="text-xs text-red-400">Reconnecting...</p>
          ) : (otherUser?.locality || otherUser?.location) ? (
            <p className="text-xs text-gray-400 truncate">
              📍 {otherUser.locality || otherUser.location}
            </p>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-gray-400 text-sm">{words.chatEmptyMessage}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender?.id === user?.id || msg.senderId === user?.id;
          const isTemp = msg.id?.startsWith("temp-");
          const showDate =
            i === 0 ||
            new Date(msg.createdAt).toDateString() !==
              new Date(messages[i - 1].createdAt).toDateString();

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                    {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${isMe
                      ? `bg-primary text-white rounded-br-md ${isTemp ? "opacity-60" : ""}`
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                    }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-rose-200" : "text-gray-400"}`}>
                    {formatTime(msg.createdAt)}
                    {isMe && !isTemp && (
                      <span className="ml-1">{msg.read ? " ✓✓" : " ✓"}</span>
                    )}
                    {isMe && isTemp && <span className="ml-1"> ⏳</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2 flex-shrink-0">
        <input
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder={connectionStatus === "offline" ? "Reconnecting..." : "Say something nice..."}
          value={input}
          onChange={handleTyping}
          disabled={connectionStatus === "offline"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          maxLength={1000}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || connectionStatus === "offline"}
          className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center
                     disabled:opacity-40 active:scale-90 transition-all flex-shrink-0 shadow-md shadow-primary/30"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
