// app/components/Header.tsx
// Cabeçalho exibido em todas as páginas internas (exceto /login e /definir-senha).
// Mostra saudação, link pro painel admin (se ADMIN) e botão de logout.

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Não exibe o header nas páginas de auth
  if (pathname.startsWith("/login") || pathname.startsWith("/definir-senha")) {
    return null;
  }

  // Enquanto carrega sessão, evita flicker
  if (status === "loading") {
    return (
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <span className="text-amber-200 font-bold">Thymeria Gwent</span>
        </div>
      </header>
    );
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const username = session?.user?.name;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-amber-200 font-bold hover:text-amber-100 transition">
          Thymeria Gwent
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/cartas" className="text-zinc-300 hover:text-amber-200 transition">
            Cartas
          </Link>

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