// app/components/Sidebar.tsx
// Sidebar lateral expansivel. Colapsada mostra so icones; expandida (hover) mostra icone + label.

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface MeData {
  id: string;
  username: string;
  role: string;
  coins: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  color?: string;
  adminOnly?: boolean;
  authOnly?: boolean;
}

const NAV_TOP: NavItem[] = [
  { href: "/",          label: "Inicio",          icon: "⌂", color: "#c9a961", authOnly: true },
  { href: "/lobby",     label: "Salao de Duelos", icon: "⚔", color: "#fcd34d", authOnly: true },
  { href: "/partidas",  label: "Partidas",        icon: "🎴", color: "#c79a4b", authOnly: true },
  { href: "/decks",     label: "Forja",           icon: "📜", color: "#8e44ad", authOnly: true },
  { href: "/colecao",   label: "Tesouraria",      icon: "💎", color: "#5dade2", authOnly: true },
  { href: "/cartas",    label: "Bestiario",       icon: "📖", color: "#27ae60" },
  { href: "/panteao",   label: "Panteao",         icon: "✦", color: "#c9a961" },
  { href: "/loja",      label: "Mercado",         icon: "🏪", color: "#e67e22", authOnly: true },
  { href: "/mercado",   label: "Bolsa",           icon: "⚖", color: "#d4a04a", authOnly: true },
  { href: "/leiloes",   label: "Leiloes",         icon: "🔨", color: "#b76e5f", authOnly: true },
  { href: "/estante",   label: "Estante",         icon: "📦", color: "#b76e5f", authOnly: true },
  { href: "/regras",    label: "Como jogar",      icon: "📘", color: "#95a5a6" },
];

const NAV_BOTTOM: NavItem[] = [
  { href: "/conta",     label: "Minha Cronica",   icon: "🪬", color: "#95a5a6", authOnly: true },
  { href: "/admin",     label: "Conselho",        icon: "👑", color: "#c0392b", adminOnly: true },
];

const COLLAPSED_W = 64;
const EXPANDED_W = 220;

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setMe(null);
      return;
    }
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, [status, pathname]);

  if (pathname.startsWith("/login") || pathname.startsWith("/definir-senha")) {
    return null;
  }

  // role pode vir do session (rapido) ou do /api/me (confiavel)
  const isAdmin = me?.role === "ADMIN" || (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const username = me?.username ?? session?.user?.name;
  const isAuth = status === "authenticated" || !!me;

  function visible(item: NavItem) {
    if (item.adminOnly) return isAdmin;
    if (item.authOnly) return isAuth;
    return true;
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        background: "linear-gradient(180deg, #14100a 0%, #0a0805 100%)",
        borderRight: "1px solid #3d3022",
        boxShadow: "4px 0 16px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "16px 8px",
        gap: 4,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 40,
        transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Link
        href="/"
        title="Inicio"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 6px",
          marginBottom: 12,
          textDecoration: "none",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
          <circle cx="18" cy="18" r="16" stroke="#c9a961" strokeWidth="1" fill="none" />
          <path
            d="M18 6 L22 14 L31 16 L24 22 L26 30 L18 25 L10 30 L12 22 L5 16 L14 14 Z"
            fill="#c9a961"
            fillOpacity="0.3"
            stroke="#c9a961"
            strokeWidth="0.8"
          />
        </svg>
        {expanded && (
          <span
            style={{
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 16,
              color: "#c9a961",
              letterSpacing: "0.2em",
              whiteSpace: "nowrap",
            }}
          >
            THYMERIA
          </span>
        )}
      </Link>

      {isAuth && me && (
        <div
          title={`Saldo: ${me.coins} moedas`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: expanded ? "6px 10px" : "6px",
            background: "#1c150d",
            border: "1px solid #5a3f1a",
            borderRadius: 4,
            marginBottom: 8,
            justifyContent: expanded ? "flex-start" : "center",
          }}
        >
          <span style={{ fontSize: 16, color: "#fcd34d", flexShrink: 0 }}>✨</span>
          {expanded ? (
            <span style={{ fontFamily: "monospace", fontSize: 13, color: "#fcd34d", fontWeight: 700, whiteSpace: "nowrap" }}>
              {me.coins.toLocaleString("pt-BR")}
            </span>
          ) : (
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#fcd34d", fontWeight: 700 }}>
              {me.coins > 999 ? Math.floor(me.coins / 1000) + "k" : me.coins}
            </span>
          )}
        </div>
      )}

      {NAV_TOP.filter(visible).map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
      ))}

      <div style={{ flex: 1 }} />

      {NAV_BOTTOM.filter(visible).map((item) => (
        <SidebarLink key={item.href} item={item} active={isActive(item.href)} expanded={expanded} />
      ))}

      {isAuth && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={`Sair (${username})`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: expanded ? "10px 14px" : "10px",
            background: "transparent",
            border: "1px solid #3d3022",
            borderRadius: 4,
            cursor: "pointer",
            color: "#8b6f3a",
            fontSize: 16,
            marginTop: 4,
            justifyContent: expanded ? "flex-start" : "center",
            fontFamily: "inherit",
          }}
        >
          <span style={{ flexShrink: 0 }}>⎋</span>
          {expanded && (
            <span style={{ fontSize: 13, color: "#8b6f3a", whiteSpace: "nowrap" }}>Sair</span>
          )}
        </button>
      )}
    </aside>
  );
}

function SidebarLink({ item, active, expanded }: { item: NavItem; active: boolean; expanded: boolean }) {
  const color = item.color ?? "#c9a961";
  return (
    <Link
      href={item.href}
      title={item.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: expanded ? "10px 14px" : "10px",
        background: active ? color + "22" : "transparent",
        border: "1px solid " + (active ? color : "transparent"),
        borderRadius: 4,
        cursor: "pointer",
        color: active ? color : "#8b6f3a",
        textDecoration: "none",
        boxShadow: active ? `inset 0 0 8px ${color}33` : "none",
        transition: "all 0.15s",
        justifyContent: expanded ? "flex-start" : "center",
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
      {expanded && (
        <span
          style={{
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 12,
            color: active ? "#fef3c7" : "#d3c89a",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}
