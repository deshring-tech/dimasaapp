import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

let counter = 0;
const nextId = () => `t-${++counter}`;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const id = nextId();
    const t = {
      id,
      title: opts.title || "",
      body: opts.body || "",
      icon: opts.icon || "🔔",
      tone: opts.tone || "info",   // "info" | "success" | "warning" | "error" | "match"
      onClick: opts.onClick,
      duration: opts.duration ?? 4500,
    };
    setToasts((prev) => [...prev, t]);
    if (t.duration > 0) {
      setTimeout(() => dismiss(id), t.duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
};

// ─── Toast viewport — fixed top-right (or top-center on mobile) ─────────────
function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-3 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ id, title, body, icon, tone, onClick, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClick = () => {
    if (onClick) onClick();
    onDismiss();
  };

  const toneClasses = {
    info: "bg-white border-gray-200",
    success: "bg-emerald-50 border-emerald-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-red-50 border-red-200",
    match: "bg-gradient-to-r from-rose-500 to-pink-500 border-rose-400 text-white",
  };

  const titleColor = tone === "match" ? "text-white" : "text-gray-800";
  const bodyColor = tone === "match" ? "text-rose-100" : "text-gray-500";

  return (
    <div
      onClick={handleClick}
      className={`pointer-events-auto cursor-pointer border-2 rounded-2xl shadow-lg p-3 flex items-start gap-3 transition-all duration-300
        ${toneClasses[tone] || toneClasses.info}
        ${visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={`font-semibold text-sm ${titleColor}`}>{title}</p>}
        {body && <p className={`text-xs mt-0.5 ${bodyColor}`}>{body}</p>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className={`text-xs flex-shrink-0 ${tone === "match" ? "text-rose-100" : "text-gray-400"}`}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
