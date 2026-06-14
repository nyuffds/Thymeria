import Link from "next/link";

const CLIMAS = [
  {
    key: "WEATHER_FROST",
    nome: "Geada (Frost)",
    icon: "❄",
    color: "#93c5fd",
    afeta: "Vanguarda (corpo-a-corpo)",
    desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Vanguarda para 1.",
  },
  {
    key: "WEATHER_FOG",
    nome: "Neblina (Fog)",
    icon: "🌫",
    color: "#cbd5e1",
    afeta: "Distancia",
    desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Distancia para 1.",
  },
  {
    key: "WEATHER_RAIN",
    nome: "Chuva (Rain)",
    icon: "🌧",
    color: "#7dd3fc",
    afeta: "Cerco",
    desc: "Reduz o poder de todas as cartas nao-Elite na fileira de Cerco para 1.",
  },
  {
    key: "WEATHER_STORM",
    nome: "Tempestade (Storm)",
    icon: "⛈",
    color: "#a78bfa",
    afeta: "Cerco + Distancia",
    desc: "Reduz o poder de todas as cartas nao-Elite nas fileiras de Cerco E Distancia para 1.",
  },
  {
    key: "CLEAR_WEATHER",
    nome: "Tempo Limpo (Clear)",
    icon: "☀",
    color: "#fcd34d",
    afeta: "Todas as fileiras",
    desc: "Remove todos os climas ativos no tabuleiro, restaurando o poder das cartas afetadas.",
  },
];

export default function RegrasClimasPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/regras" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Manual"}
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200">Climas</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Climas afetam fileiras inteiras do tabuleiro, reduzindo o poder das cartas a 1. Cartas Elite sao imunes.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CLIMAS.map((c) => (
          <article
            key={c.key}
            className="rounded-lg border-2 border-zinc-800 bg-zinc-900/50 p-5"
            style={{ borderColor: c.color + "55" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl" style={{ color: c.color }}>{c.icon}</span>
              <h2 className="text-lg font-bold font-heading" style={{ color: c.color }}>{c.nome}</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Afeta: <strong className="text-zinc-300">{c.afeta}</strong>
            </p>
            <p className="text-sm text-zinc-400">{c.desc}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 text-sm text-zinc-500 italic">
        Lembre: cartas Elite ignoram todos os climas. Climas se sobrepoem (so um por fileira) e duram ate Tempo
        Limpo ser jogado ou ate o fim da ronda.
      </div>
    </main>
  );
}