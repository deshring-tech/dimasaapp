import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white text-xs text-center py-2 px-4 flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
      No internet connection — some features may not work
    </div>
  );
}
