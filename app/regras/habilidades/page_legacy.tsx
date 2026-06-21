import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function RegrasHabilidadesPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  // Pega cartas do jogador (ou todas pra admin) com habilidades
  const cards = isAdmin
    ? await prisma.card.findMany({
        where: { abilityId: { not: null } },
        include: { ability: true, faction: true },
      })
    : await prisma.card.findMany({
        where: {
          abilityId: { not: null },
          collectedBy: { some: { userId: user.id, quantity: { gt: 0 } } },
        },
        include: { ability: true, faction: true },
      });

  // Agrupa por habilidade (mesma ability pode aparecer em varias cartas)
  type AbilityWithCards = {
    id: string;
    name: string;
    description: string;
    cards: typeof cards;
  };
  const byAbility = new Map<string, AbilityWithCards>();
  for (const c of cards) {
    if (!c.ability) continue;
    const key = c.ability.id;
    if (!byAbility.has(key)) {
      byAbility.set(key, {
        id: c.ability.id,
        name: c.ability.name,
        description: c.ability.description,
        cards: [],
      });
    }
    byAbility.get(key)!.cards.push(c);
  }
  const abilities = Array.from(byAbility.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/regras" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Manual"}
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200">
          {isAdmin ? "Todas as Habilidades" : "Suas Habilidades"}
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          {isAdmin
            ? "Visao admin: todas as habilidades cadastradas."
            : "Habilidades das cartas da sua colecao. Cada habilidade pode estar em multiplas cartas."}
        </p>
      </header>

      {abilities.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-400 mb-4">Voce ainda nao tem cartas com habilidades.</p>
          <Link
            href="/loja"
            className="inline-block px-5 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded transition"
          >
            Visitar a Loja
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {abilities.map((a) => (
            <article
              key={a.id}
              className="rounded-lg border-2 border-zinc-800 bg-zinc-900/50 p-5"
            >
              <h2 className="text-lg font-bold font-heading text-amber-200 mb-2">{a.name}</h2>
              <p className="text-sm text-zinc-300 leading-relaxed mb-3">{a.description}</p>
              <div className="border-t border-zinc-800 pt-3 mt-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                  {a.cards.length === 1 ? "Carta com esta habilidade" : `${a.cards.length} cartas com esta habilidade`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {a.cards.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-zinc-800 border"
                      style={{ borderColor: c.faction.color + "55", color: c.faction.color }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}