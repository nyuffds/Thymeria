export const dynamic = "force-dynamic";

// app/page.tsx
// Landing page do Thymeria Gwent.
// Mostra saudacao, saldo, links principais e divindades do panteao.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { LANDING_LINKS, DEITIES, randomWelcomePhrase } from "@/lib/landing/landing-config";

const prisma = new PrismaClient();

export default async function Home() {
  const session = await auth();

  // Visitante nao logado: redireciona pro login (camada de seguranca extra)
  if (!session?.user?.name) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-5xl text-amber-200 mb-4">Thymeria Gwent</h1>
          <p className="text-zinc-400 mb-6 font-lore italic">
            Acesse sua conta pra entrar no salao de duelos.
          </p>
          <Link
            href="/login"
            className="inline-block bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
          >
            Entrar
          </Link>
        </div>
      </main>
    );
  }

  // Logado: carrega dados do jogador
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: {
      id: true,
      username: true,
      role: true,
      coins: true,
    },
  });

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-zinc-400">Usuario nao encontrado.</p>
      </main>
    );
  }

  const isAdmin = user.role === "ADMIN";

  // Saldo de boosters nao abertos
  const unopenedCount = await prisma.unopenedBooster.count({
    where: { userId: user.id },
  });

  // Quantidade de cartas na colecao
  const collectionCount = await prisma.userCollection.count({
    where: { userId: user.id },
  });

  // Quantidade de decks
  const deckCount = await prisma.deck.count({
    where: { userId: user.id },
  });

  // Filtra links pelo papel do usuario
  const visibleLinks = LANDING_LINKS.filter(
    (l) => l.showFor === "ALL" || (l.showFor === "ADMIN" && isAdmin) || (l.showFor === "PLAYER" && !isAdmin),
  );

  const welcomePhrase = randomWelcomePhrase();

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative overflow-hidden">
      {/* Glow decorativo no fundo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 -z-10"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(212, 160, 74, 0.15) 0%, transparent 60%)",
        }}
      />

      {/* ─────── HERO ─────── */}
      <section className="text-center mb-10 pt-6">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-400/60 mb-3">
          Era da Restauracao - Um seculo apos a Guerra do Fim
        </p>
        <h1 className="font-heading text-6xl md:text-7xl font-bold mb-4"
            style={{
              background: "linear-gradient(180deg, #f3c969 0%, #8b6019 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 60px rgba(212, 160, 74, 0.3)",
            }}>
          Thymeria Gwent
        </h1>
        <p className="text-zinc-400 italic font-lore text-lg max-w-2xl mx-auto">
          {welcomePhrase}
        </p>

        {/* Boas-vindas + stats do jogador */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="text-zinc-500">Salve,</span>
          <span className="text-amber-200 font-heading text-lg">
            {user.username}
            {isAdmin && <span className="ml-2 text-xs text-red-400 uppercase tracking-wider">conselho</span>}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <StatBadge icon="✨" label="Moedas" value={user.coins.toLocaleString("pt-BR")} color="#d4a04a" />
          <StatBadge icon="📦" label="Boosters" value={String(unopenedCount)} color="#b76e5f" />
          <StatBadge icon="💎" label="Cartas" value={String(collectionCount)} color="#5dade2" />
          <StatBadge icon="📜" label="Decks" value={String(deckCount)} color="#8e44ad" />
        </div>
      </section>

      {/* ─────── DIVINDADES (faixa decorativa) ─────── */}
      <section className="mb-10">
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
          <p className="relative inline-block px-4 bg-zinc-950 text-amber-400/60 text-[10px] uppercase tracking-[0.3em] left-1/2 -translate-x-1/2">
            Panteao de Thymeria
          </p>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 md:gap-3">
          {DEITIES.map((d) => (
            <div
              key={d.name}
              title={d.name + " - " + d.domain}
              className="group relative px-3 py-2 rounded-lg border transition cursor-help hover:scale-110"
              style={{
                borderColor:
                  d.alignment === "ORDER" ? "#d4a04a55" :
                  d.alignment === "CHAOS" ? "#c0392b55" :
                  "#52525b55",
                background:
                  d.alignment === "ORDER" ? "rgba(212, 160, 74, 0.05)" :
                  d.alignment === "CHAOS" ? "rgba(192, 57, 43, 0.05)" :
                  "rgba(82, 82, 91, 0.05)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl"
                      style={{
                        color: d.alignment === "ORDER" ? "#d4a04a" :
                               d.alignment === "CHAOS" ? "#c0392b" : "#a1a1aa",
                        filter: "drop-shadow(0 0 4px currentColor)",
                      }}>
                  {d.symbol}
                </span>
                <span className="text-xs text-zinc-300 font-heading">{d.name}</span>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-20">
                {d.domain}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────── GRID DE ROTAS ─────── */}
      <section className="mb-10">
        <h2 className="text-center text-xs uppercase tracking-[0.3em] text-amber-400/60 mb-6">
          Rotas do Reino
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative block rounded-xl border-2 p-5 transition-all hover:scale-[1.03] hover:shadow-2xl overflow-hidden"
              style={{
                borderColor: link.color + "40",
                background:
                  "linear-gradient(135deg, rgba(20, 12, 4, 0.9) 0%, rgba(40, 25, 10, 0.6) 100%)",
              }}
            >
              {/* Glow no hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 50% 0%, " + link.color + " 0%, transparent 70%)",
                }}
              />

              <div className="relative">
                <div
                  className="text-4xl mb-3"
                  style={{
                    color: link.color,
                    filter: "drop-shadow(0 0 8px " + link.color + "66)",
                  }}
                >
                  {link.icon}
                </div>
                <h3 className="font-heading text-lg text-amber-100 mb-1 group-hover:text-amber-200 transition">
                  {link.label}
                </h3>
                <p className="text-xs text-zinc-400 mb-3">
                  {link.description}
                </p>
                <p className="text-[11px] italic text-zinc-500 font-lore leading-snug border-t pt-2"
                   style={{ borderColor: link.color + "20" }}>
                  &ldquo;{link.lore}&rdquo;
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────── RODAPE LORE ─────── */}
      <section className="text-center max-w-2xl mx-auto mt-12 pb-6">
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
          <span className="relative inline-block px-3 bg-zinc-950 text-amber-400/40 text-xs">⚜</span>
        </div>
        <p className="text-xs text-zinc-500 font-lore italic mt-4 leading-relaxed">
          Thymeria descansa sob a luz de Lugh e a vigilia de Morrigan.
          Skanda venceu Eris na Guerra do Fim, mas suas centelhas ainda dancam pelos reinos.
          Que sua jornada seja digna das cancoes que serao escritas em Lomerel.
        </p>
      </section>
    </main>
  );
}

// ─────── Componente auxiliar: badge de stat ───────
function StatBadge({
  icon, label, value, color,
}: { icon: string; label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
      style={{
        borderColor: color + "55",
        background: color + "11",
      }}
    >
      <span className="text-base" style={{ color }}>{icon}</span>
      <span className="text-zinc-400 text-xs">{label}</span>
      <span className="font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  );
}