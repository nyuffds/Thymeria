// app/components/Header.tsx

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
interface SettingsData {
  gameName: string;
  themePrimaryColor: string;
}


export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  // Busca dados completos do usuário (incluindo saldo) quando logado
  useEffect(() => {
    if (status !== "authenticated") {
      setMe(null);
      return;
    }
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, [status, pathname]); // recarrega ao trocar de rota

  if (pathname.startsWith("/login") || pathname.startsWith("/definir-senha")) {
    return null;
  }

  if (status === "loading") {
    return (
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <span className="text-amber-200 font-bold font-heading">{settings?.gameName ?? "Thymeria"}</span>
        </div>
      </header>
    );
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const username = session?.user?.name;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-amber-200 font-bold font-heading hover:text-amber-100 transition">
          {settings?.gameName ?? "Thymeria"}
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/regras" className="text-zinc-300 hover:text-amber-200 transition">
            Como jogar
          </Link>
          <Link href="/cartas" className="text-zinc-300 hover:text-amber-200 transition">
            Cartas
          </Link>

        {username && (
            <Link href="/loja" className="text-zinc-300 hover:text-amber-200 transition">
              Loja
            </Link>
          )}

        {username && (
            <Link href="/mercado" className="text-zinc-300 hover:text-amber-200 transition">
              Mercado
            </Link>
          )}

        {username && (
            <Link href="/leiloes" className="text-zinc-300 hover:text-amber-200 transition">
              Leiloes
            </Link>
          )}
        {username && (
            <Link href="/estante" className="text-zinc-300 hover:text-amber-200 transition">
              Estante
            </Link>
          )}

        {username && (
            <Link href="/colecao" className="text-zinc-300 hover:text-amber-200 transition">
              Coleção
            </Link>
          )}

        {username && (
            <Link href="/decks" className="text-zinc-300 hover:text-amber-200 transition">
              Decks
            </Link>
          )}

        {username && (
            <Link href="/partidas" className="text-zinc-300 hover:text-amber-200 transition">
              Partidas
            </Link>
          )}

        {username && (
            <Link href="/lobby" className="text-zinc-300 hover:text-amber-200 transition">
              Lobby
            </Link>
          )}

          {username && (
            <Link href="/conta" className="text-zinc-300 hover:text-amber-200 transition">
              Minha conta
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="text-amber-300 hover:text-amber-200 transition font-semibold"
            >
              Admin
            </Link>
          )}

          {username && (
            <>
              <span className="text-zinc-500">|</span>

              {me && (
                <Link
                  href="/conta"
                  className="font-mono text-amber-300 hover:text-amber-200 transition"
                  title="Saldo de moedas"
                >
                  ✨ {me.coins}
                </Link>
              )}

              <span className="text-zinc-300">
                Olá, <span className="text-amber-300 font-semibold">{username}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
              >
                Sair
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}