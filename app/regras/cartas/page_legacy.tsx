import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Rara",
  EPIC: "Epica",
  LEGENDARY: "Lendaria",
};

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

const TYPE_LABEL: Record<string, string> = {
  UNIT: "Unidade",
  SPECIAL: "Especial",
  WEATHER: "Clima",
  LEADER: "Lider",
};

export default async function RegrasCartasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  // Admin ve tudo; jogadores so o que tem
  const cards = isAdmin
    ? await prisma.card.findMany({
        include: { faction: true, ability: true },
        orderBy: [{ rarity: "asc" }, { name: "asc" }],
      })
    : await prisma.card.findMany({
        where: {
          collectedBy: { some: { userId: user.id, quantity: { gt: 0 } } },
        },
        include: { faction: true, ability: true },
        orderBy: [{ rarity: "asc" }, { name: "asc" }],
      });

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/regras" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Manual"}
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200">
          {isAdmin ? "Todas as Cartas" : "Suas Cartas"}
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          {isAdmin
            ? "Visao admin: todas as cartas ativas do sistema."
            : "Cartas que voce possui na sua colecao. Adquira novas na Loja."}
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-400 mb-4">Sua colecao esta vazia.</p>
          <Link
            href="/loja"
            className="inline-block px-5 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded transition"
          >
            Visitar a Loja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border-2 bg-zinc-900/50 p-4 flex gap-3"
              style={{ borderColor: c.faction.color + "55" }}
            >
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="w-16 h-24 rounded object-cover flex-shrink-0"
                  style={{ border: `1px solid ${c.faction.color}88` }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold font-heading text-amber-200 truncate">
                  {c.name}
                </h2>
                <p className="text-xs" style={{ color: c.faction.color }}>
                  {c.faction.name}
                </p>
                <p className="text-xs flex items-center gap-2 mt-1">
                  <span style={{ color: RARITY_COLOR[c.rarity] ?? "#9ca3af" }}>
                    {RARITY_LABEL[c.rarity] ?? c.rarity}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">{TYPE_LABEL[c.cardType] ?? c.cardType}</span>
                  {c.cardType !== "LEADER" && c.cardType !== "WEATHER" && (
                    <>
                      <span className="text-zinc-600">|</span>
                      <span className="text-amber-300 font-mono">{c.power}</span>
                    </>
                  )}
                </p>
                {c.isElite && (
                  <p className="text-xs text-amber-400 font-bold mt-1">⚜ Elite</p>
                )}
                {c.ability && (
                  <p className="text-xs text-zinc-400 mt-2 leading-snug">
                    <strong className="text-amber-300">{c.ability.name}:</strong>{" "}
                    {c.ability.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}