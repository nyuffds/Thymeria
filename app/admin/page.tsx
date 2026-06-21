export const dynamic = "force-dynamic";

// app/admin/page.tsx
// Hub do painel administrativo (Salao do Conselho).

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getCounts() {
  const [factions, abilities, cards, boosters, users] = await Promise.all([
    prisma.faction.count(),
    prisma.ability.count(),
    prisma.card.count(),
    prisma.booster.count(),
    prisma.user.count(),
  ]);
  return { factions, abilities, cards, boosters, users };
}

interface Section {
  href: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  category: "CONTEUDO" | "ECONOMIA" | "GOVERNO";
  count?: number;
}

const CATEGORY_META = {
  CONTEUDO: { label: "Conteudo do Jogo",  motto: "Cartas, faccoes, habilidades, boosters." },
  ECONOMIA: { label: "Economia do Reino", motto: "Moedas, leiloes e historico financeiro." },
  GOVERNO:  { label: "Governo do Conselho", motto: "Usuarios, fichas e regras globais." },
} as const;

export default async function AdminHomePage() {
  const counts = await getCounts();
  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const SECTIONS: Section[] = [
    // Conteudo
    { href: "/admin/faccoes",      title: "Faccoes",      desc: "Reinos, cidades e povos de Thymeria.",        icon: "⚔", color: "#c0392b", category: "CONTEUDO", count: counts.factions },
    { href: "/admin/habilidades",  title: "Habilidades",  desc: "Efeitos automaticos ou narrativos.",          icon: "✦", color: "#8e44ad", category: "CONTEUDO", count: counts.abilities },
    { href: "/admin/cartas",       title: "Cartas",       desc: "Catalogo mestre de todas as cartas do jogo.", icon: "▦", color: "#27ae60", category: "CONTEUDO", count: counts.cards },
    { href: "/admin/boosters",     title: "Boosters",     desc: "Pacotes de cartas a venda no Mercado.",       icon: "📦", color: "#b76e5f", category: "CONTEUDO", count: counts.boosters },

    // Economia
    { href: "/admin/economia",     title: "Economia",     desc: "Distribuir moedas e ver historico.",          icon: "✨", color: "#fcd34d", category: "ECONOMIA" },
    { href: "/admin/leiloes",      title: "Leiloes",      desc: "Criar e gerenciar leiloes ativos.",           icon: "🔨", color: "#d4a04a", category: "ECONOMIA" },

    // Governo
    { href: "/admin/usuarios",     title: "Usuarios",     desc: "Criar contas, resetar senhas, permissoes.",   icon: "👤", color: "#5dade2", category: "GOVERNO", count: counts.users },
    { href: "/admin/fichas",       title: "Fichas RPG",   desc: "Atribuir fichas Foundry aos jogadores.",      icon: "📜", color: "#c9a961", category: "GOVERNO" },
    { href: "/admin/configuracoes", title: "Configuracoes", desc: "Regras globais, precos, limites, tema.",    icon: "⚙", color: "#95a5a6", category: "GOVERNO" },
  ];

  const categories: Array<["CONTEUDO" | "ECONOMIA" | "GOVERNO", Section[]]> = [
    ["CONTEUDO", SECTIONS.filter((s) => s.category === "CONTEUDO")],
    ["ECONOMIA", SECTIONS.filter((s) => s.category === "ECONOMIA")],
    ["GOVERNO", SECTIONS.filter((s) => s.category === "GOVERNO")],
  ];

  return (
    <main
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100vh",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {settings.landingBackgroundUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${settings.landingBackgroundUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#0a0805",
            backgroundAttachment: "fixed",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,5,0.45) 0%, rgba(10,8,5,0.75) 70%, rgba(10,8,5,0.9) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; Cronica I &middot; Idade do Pacto &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textIndent: "0.15em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 16px rgba(201,169,97,0.4))",
            }}
          >
            SALA DO CONSELHO
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Onde as leis do reino sao escritas e reescritas.&rdquo;
          </p>
        </div>

        {/* Categorias */}
        {categories.map(([catKey, items]) => {
          const meta = CATEGORY_META[catKey];
          return (
            <section key={catKey} style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
                <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em", whiteSpace: "nowrap" }}>
                  {meta.label}
                </span>
                <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
              </div>
              <p style={{ textAlign: "center", margin: "0 0 18px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
                {meta.motto}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {items.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: 20,
                      background: "rgba(20,12,4,0.6)",
                      border: `1px solid ${s.color}55`,
                      borderLeft: `3px solid ${s.color}`,
                      borderRadius: 4,
                      textDecoration: "none",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 26, color: s.color, filter: `drop-shadow(0 0 8px ${s.color}66)`, lineHeight: 1 }}>
                        {s.icon}
                      </span>
                      {typeof s.count === "number" && (
                        <span style={{ fontFamily: "monospace", fontSize: 18, color: s.color, fontWeight: 700 }}>
                          {s.count}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 15, color: "#fef3c7", letterSpacing: "0.08em" }}>
                      {s.title}
                    </p>
                    <p style={{ margin: "6px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", lineHeight: 1.4 }}>
                      {s.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

      </div>
    </main>
  );
}
