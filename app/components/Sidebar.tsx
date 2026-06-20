// app/components/Sidebar.tsx

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

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);
  const [gameName, setGameName] = useState("Thymeria");

  useEffect(() => {
    if (status !== "authenticated") {
      setMe(null);
      return;
    }
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setMe(data.user);
        if (data.settings?.gameName) setGameName(data.settings.gameName);
      })
      .catch(() => setMe(null));
  }, [status, pathname]);

  if (pathname.startsWith("/login") || pathname.startsWith("/definir-senha")) {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const username = session?.user?.name;
  const isAuth = status === "authenticated";

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
      style={{
        width: 64,
        background: "linear-gradient(180deg, #14100a 0%, #0a0805 100%)",
        borderRight: "1px solid #3d3022",
        boxShadow: "4px 0 16px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: 4,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        zIndex: 40,
      }}
    >
      {/* Brasao topo */}
      <Link
        href="/"
        title={gameName}
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          textDecoration: "none",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" stroke="#c9a961" strokeWidth="1" fill="none" />
          <path
            d="M18 6 L22 14 L31 16 L24 22 L26 30 L18 25 L10 30 L12 22 L5 16 L14 14 Z"
            fill="#c9a961"
            fillOpacity="0.3"
            stroke="#c9a961"
            strokeWidth="0.8"
          />
        </svg>
      </Link>

      {/* Saldo (so logado) */}
      {isAuth && me && (
        <div
          title={`Saldo: ${me.coins} moedas`}
          style={{
            width: 44,
            padding: "4px 0",
            textAlign: "center",
            background: "#1c150d",
            border: "1px solid #5a3f1a",
            borderRadius: 4,
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#fcd34d", lineHeight: 1 }}>✨</div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "#fcd34d", fontWeight: 700, marginTop: 2 }}>
            {me.coins > 999 ? Math.floor(me.coins / 1000) + "k" : me.coins}
          </div>
        </div>
      )}

      {/* Items topo */}
      {NAV_TOP.filter(visible).map((item) => {
        const active = isActive(item.href);
        return (
          <SidebarLink key={item.href} item={item} active={active} />
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Items bottom */}
      {NAV_BOTTOM.filter(visible).map((item) => {
        const active = isActive(item.href);
        return (
          <SidebarLink key={item.href} item={item} active={active} />
        );
      })}

      {/* Logout */}
      {isAuth && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={`Sair (${username})`}
          style={{
            width: 44,
            height: 44,
            background: "transparent",
            border: "1px solid #3d3022",
            borderRadius: 4,
            cursor: "pointer",
            color: "#8b6f3a",
            fontSize: 18,
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⎋
        </button>
      )}
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const color = item.color ?? "#c9a961";
  return (
    <Link
      href={item.href}
      title={item.label}
      style={{
        width: 44,
        height: 44,
        background: active ? color + "22" : "transparent",
        border: "1px solid " + (active ? color : "#3d3022"),
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? color : "#8b6f3a",
        fontSize: 20,
        textDecoration: "none",
        boxShadow: active ? `inset 0 0 8px ${color}33` : "none",
        transition: "all 0.15s",
      }}
    >
      {item.icon}
    </Link>
  );
}
