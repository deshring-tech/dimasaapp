import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";

let socket = null;

// Singleton socket for global app-wide events (toasts, badge counts, etc.)
// Separate from the ChatRoom's match-specific socket usage.
export function getGlobalSocket() {
  if (!socket) {
    const token = localStorage.getItem("dimasa_token");
    if (!token) return null;
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectGlobalSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
