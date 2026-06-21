// app/regras/page.tsx
// Hub do Manual do Aventureiro.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

interface Topic {
  href: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  category: "JOGO" | "ECONOMIA" | "MUNDO";
}

const TOPICS: Topic[] = [
  // Jogo
  { href: "/regras/jogo",         title: "Como Jogar",   desc: "Fases, fileiras, turnos e vitoria.",       icon: "♔", color: "#fcd34d", category: "JOGO" },
  { href: "/regras/cartas",       title: "Suas Cartas",  desc: "Visao das cartas da sua colecao.",         icon: "▦", color: "#c9a961", category: "JOGO" },
  { href: "/regras/habilidades",  title: "Habilidades",  desc: "Efeitos das cartas que voce possui.",      icon: "✦", color: "#8e44ad", category: "JOGO" },
  { href: "/regras/climas",       title: "Climas",       desc: "Os 5 climas e seus efeitos nas fileiras.", icon: "❄", color: "#5dade2", category: "JOGO" },
  { href: "/regras/faccoes",      title: "Faccoes",      desc: "As faccoes de Thymeria e seus estilos.",   icon: "⚔", color: "#c0392b", category: "JOGO" },

  // Economia
  { href: "/regras/mercado",      title: "Mercado",      desc: "Compra de boosters no Mercado do Eitri.",  icon: "🏪", color: "#e67e22", category: "ECONOMIA" },
  { href: "/regras/bolsa",        title: "Bolsa",        desc: "Compra e venda de cartas entre aventureiros.", icon: "⚖", color: "#d4a04a", category: "ECONOMIA" },
  { href: "/regras/leiloes",      title: "Leiloes",      desc: "Lances em cartas raras e cobicadas.",      icon: "🔨", color: "#b76e5f", category: "ECONOMIA" },

  // Mundo
  { href: "/panteao",             title: "O Panteao",    desc: "As 11 divindades que velam o reino.",      icon: "✦", color: "#c9a961", category: "MUNDO" },
];

const CATEGORY_META = {
  JOGO:     { label: "Mecanicas do Jogo", motto: "As regras que regem o duelo." },
  ECONOMIA: { label: "Economia do Reino", motto: "Moedas, pacotes e contratos." },
  MUNDO:    { label: "O Mundo de Thymeria", motto: "Os deuses observam, sempre." },
} as const;

export default async function RegrasHubPage() {
  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const categories: Array<["JOGO" | "ECONOMIA" | "MUNDO", Topic[]]> = [
    ["JOGO", TOPICS.filter((t) => t.category === "JOGO")],
    ["ECONOMIA", TOPICS.filter((t) => t.category === "ECONOMIA")],
    ["MUNDO", TOPICS.filter((t) => t.category === "MUNDO")],
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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

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
            MANUAL DO AVENTUREIRO
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Aprenda as regras, conheca suas cartas e domine as artes da estrategia.&rdquo;
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {items.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "20px",
                      background: "rgba(20,12,4,0.6)",
                      border: `1px solid ${t.color}55`,
                      borderLeft: `3px solid ${t.color}`,
                      borderRadius: 4,
                      textDecoration: "none",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 28, color: t.color, filter: `drop-shadow(0 0 8px ${t.color}66)`, marginBottom: 10 }}>
                      {t.icon}
                    </span>
                    <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 15, color: "#fef3c7", letterSpacing: "0.08em" }}>
                      {t.title}
                    </p>
                    <p style={{ margin: "6px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", lineHeight: 1.4 }}>
                      {t.desc}
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
