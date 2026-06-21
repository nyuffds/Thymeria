import Link from "next/link";

const TOPICS = [
  {
    href: "/regras/jogo",
    title: "Como Jogar",
    desc: "Regras basicas: fases, fileiras, turnos, vitoria.",
    icon: "♔",
  },
  {
    href: "/regras/cartas",
    title: "Suas Cartas",
    desc: "Visao das cartas da sua colecao com poder e habilidades.",
    icon: "▦",
  },
  {
    href: "/regras/habilidades",
    title: "Habilidades",
    desc: "Efeitos das cartas que voce possui.",
    icon: "✦",
  },
  {
    href: "/regras/climas",
    title: "Climas",
    desc: "Os 5 climas e seus efeitos nas fileiras.",
    icon: "❄",
  },
  {
    href: "/regras/faccoes",
    title: "Faccoes",
    desc: "As faccoes de Thymeria e seus estilos.",
    icon: "⚔",
  },
];

export default function RegrasHubPage() {
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <header className="mb-8 text-center">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual do Jogador</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200 mb-2">Como jogar Thymeria</h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Aprenda as regras, conheca suas cartas e domine as habilidades para vencer suas partidas.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-lg border-2 border-zinc-800 bg-zinc-900/50 hover:border-amber-600/60 hover:bg-zinc-900 transition p-5 flex flex-col items-start"
          >
            <span className="text-3xl text-amber-400 mb-3 group-hover:scale-110 transition">{t.icon}</span>
            <h2 className="text-lg font-bold font-heading text-amber-200 mb-1">{t.title}</h2>
            <p className="text-sm text-zinc-400">{t.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}