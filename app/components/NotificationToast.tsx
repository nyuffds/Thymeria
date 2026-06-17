"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUnreadNotifications, markNotificationReadAction } from "@/app/_actions_notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  AUCTION_NEW:  { border: "#d97706", bg: "rgba(146, 64, 14, 0.95)", icon: "✨" },
  TRADE_OFFER:  { border: "#7c3aed", bg: "rgba(76, 29, 149, 0.95)", icon: "\u2194" },
  AUCTION_WON:  { border: "#10b981", bg: "rgba(6, 78, 59, 0.95)",   icon: "\u2605" },
  AUCTION_LOST: { border: "#71717a", bg: "rgba(39, 39, 42, 0.95)",  icon: "\u2716" },
};

export function NotificationToast() {
  const [queue, setQueue] = useState<Notification[]>([]);
  const [current, setCurrent] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const router = useRouter();

  // Polling
  useEffect(() => {
    let stopped = false;
    async function fetchLoop() {
      while (!stopped) {
        try {
          const notifs = await getUnreadNotifications();
          const novos = notifs.filter((n) => !seenIds.current.has(n.id));
          if (novos.length > 0) {
            novos.forEach((n) => seenIds.current.add(n.id));
            setQueue((q) => [...q, ...novos]);
          }
        } catch {
          // silencia erros
        }
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
    fetchLoop();
    return () => { stopped = true; };
  }, []);

  // Mostrar 1 por vez da fila
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setQueue((q) => q.slice(1));

    // Auto-dismiss 8s + marca como lida
    const timer = setTimeout(async () => {
      try { await markNotificationReadAction(next.id); } catch {}
      setCurrent(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [current, queue]);

  async function handleClick() {
    if (!current) return;
    try { await markNotificationReadAction(current.id); } catch {}
    const url = current.linkUrl;
    setCurrent(null);
    if (url) router.push(url);
  }

  async function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    if (!current) return;
    try { await markNotificationReadAction(current.id); } catch {}
    setCurrent(null);
  }

  if (!current) return null;

  const colors = TYPE_COLORS[current.type] ?? TYPE_COLORS.AUCTION_NEW;

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 9999,
        maxWidth: "360px",
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "12px 16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        cursor: current.linkUrl ? "pointer" : "default",
        animation: "slideInRight 0.3s ease-out",
        color: "#f4f4f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>{colors.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px", color: "#fbbf24" }}>{current.title}</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#e4e4e7" }}>{current.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "#a1a1aa",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            padding: 0,
            flexShrink: 0,
          }}
          title="Fechar"
        >
          {"\u00d7"}
        </button>
      </div>
    </div>
  );
}