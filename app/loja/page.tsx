export const dynamic = "force-dynamic";

// app/page.tsx
// Landing nova: hero cinematico + 3 portoes epicos + sidebar de atividades.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { randomWelcomePhrase } from "@/lib/landing/landing-config";

const prisma = new PrismaClient();

export default async function Home() {
  const session = await auth();

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Visitante nao logado: tela minima de login
  if (!session?.user?.name) {
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          position: "relative",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {settings.landingBackgroundUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${settings.landingBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.35,
              zIndex: -1,
            }}
          />
        )}
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <h1
            style={{
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 60,
              color: "#c9a961",
              margin: 0,
              letterSpacing: "0.2em",
            }}
          >
            {settings.gameName}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              color: "#d3c89a",
              fontSize: 16,
              margin: "16px 0 24px",
            }}
          >
            Acesse sua conta pra entrar no salao de duelos.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 28px",
              background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
              color: "#1a0f05",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.2em",
              textDecoration: "none",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
            }}
          >
            ENTRAR
          </Link>
        </div>
      </main>
    );
  }

  // Logado
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, username: true, role: true, coins: true },
  });

  if (!user) {
    return (
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8b6f3a" }}>Usuario nao encontrado.</p>
      </main>
    );
  }

  const isAdmin = user.role === "ADMIN";

  const [unopenedCount, collectionCount, deckCount, runningMatch] = await Promise.all([
    prisma.unopenedBooster.count({ where: { userId: user.id } }),
    prisma.userCollection.count({ where: { userId: user.id } }),
    prisma.deck.count({ where: { userId: user.id } }),
    prisma.matchPlayer
      .findFirst({
        where: { userId: user.id, match: { status: { in: ["IN_PROGRESS", "REDRAW"] } } },
        include: { match: true },
        orderBy: { match: { updatedAt: "desc" } },
      })
      .catch(() => null),
  ]);

  const welcomePhrase = randomWelcomePhrase();

  return (
    <main
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        minHeight: "100vh",
        position: "relative",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Background configuravel */}
      {settings.landingBackgroundUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${settings.landingBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,5,0.7) 0%, rgba(10,8,5,0.85) 70%, rgba(10,8,5,0.95) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 500,
          background: `radial-gradient(ellipse at top, ${settings.themePrimaryColor}26, transparent 60%)`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* ============ CENTRO ============ */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 40px", display: "flex", flexDirection: "column" }}>

        {/* Selo do jogador (topo direita) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 20px 8px 8px",
              background: "linear-gradient(90deg, rgba(40,25,10,0.9), rgba(20,12,4,0.7))",
              border: "1px solid #5a3f1a",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,169,97,0.2)",
            }}
          >
            <div style={{ position: "relative", width: 56, height: 56 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, #c9a961, #8b6f3a)",
                  borderRadius: "50%",
                  boxShadow: "0 0 12px rgba(201,169,97,0.4)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 2,
                  background: "#1a0f05",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  color: "#c9a961",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {user.username[0]?.toUpperCase() ?? "?"}
              </div>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  fontSize: 14,
                  color: "#fef3c7",
                  letterSpacing: "0.1em",
                }}
              >
                {user.username.toUpperCase()}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 11,
                  color: "#8b6f3a",
                }}
              >
                {isAdmin ? "do Conselho" : "Aventureiro"} &middot; ano 101
              </p>
            </div>
            <div style={{ display: "flex", gap: 18, paddingLeft: 16, borderLeft: "1px solid #3d3022" }}>
              <Stat value={user.coins.toLocaleString("pt-BR")} label="moedas" color="#fcd34d" />
              <Stat value={String(unopenedCount)} label="boosters" color="#b76e5f" />
              <Stat value={String(collectionCount)} label="cartas" color="#5dade2" />
              <Stat value={String(deckCount)} label="decks" color="#8e44ad" />
            </div>
          </div>
        </div>

        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 10,
              color: "#8b6f3a",
              textTransform: "uppercase",
              letterSpacing: "0.5em",
            }}
          >
            &mdash; {settings.gameSubtitle ?? "Cronica I · Idade do Pacto"} &mdash;
          </p>

          <h1
            style={{
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 90,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "0.25em",
              textIndent: "0.25em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 40%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 6px 24px rgba(201,169,97,0.5))",
            }}
          >
            {settings.gameName.toUpperCase()}
          </h1>

          <p
            style={{
              margin: "20px auto 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              color: "#d3c89a",
              fontSize: 18,
              maxWidth: 560,
              lineHeight: 1.6,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {settings.landingTagline ?? welcomePhrase}
          </p>
        </div>

        {/* 3 PORTOES EPICOS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 16, flex: 1 }}>
          <Portao
            href="/decks"
            label="FORJA"
            title="Construa seus decks"
            lore="Cada carta escolhida e uma promessa de vitoria."
            icon="📜"
            color="#c9a961"
            bgGradient="linear-gradient(135deg, #3d2818 0%, #1c150d 100%)"
          />
          <Portao
            href="/lobby"
            label="SALAO DE DUELOS"
            title="Jogar agora"
            lore="Onde laminas encontram laminas e a gloria e forjada."
            icon="⚔"
            color="#fcd34d"
            bgGradient="linear-gradient(135deg, #4a2818 0%, #2a1408 100%)"
            featured
          />
          <Portao
            href="/colecao"
            label="TESOURARIA"
            title="Sua colecao"
            lore="Reliquias colecionadas em campanhas de gloria."
            icon="💎"
            color="#5dade2"
            bgGradient="linear-gradient(135deg, #1c2838 0%, #0f1820 100%)"
          />
        </div>
      </div>

      {/* ============ SIDEBAR DIREITA: PERGAMINHOS ============ */}
      <aside
        style={{
          position: "relative",
          zIndex: 1,
          background: "linear-gradient(180deg, rgba(20,16,10,0.85) 0%, rgba(10,8,5,0.95) 100%)",
          borderLeft: "1px solid #3d3022",
          boxShadow: "-4px 0 16px rgba(0,0,0,0.6)",
          padding: "32px 20px",
          overflowY: "auto",
        }}
      >
        <p
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 10,
            color: "#c9a961",
            textTransform: "uppercase",
            letterSpacing: "0.4em",
          }}
        >
          ✦ Pergaminhos
        </p>

        {/* Partida em andamento */}
        {runningMatch && (
          <Link
            href={`/partidas/${runningMatch.matchId}`}
            style={{
              display: "block",
              background: "rgba(192,57,43,0.15)",
              border: "1px solid #5a1818",
              borderLeft: "3px solid #c0392b",
              borderRadius: 4,
              padding: "10px 12px",
              marginBottom: 10,
              textDecoration: "none",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontSize: 11,
                color: "#fca5a5",
                letterSpacing: "0.1em",
              }}
            >
              PARTIDA EM ANDAMENTO
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontStyle: "italic",
                fontSize: 13,
                color: "#e9d9b6",
              }}
            >
              Retomar &raquo;
            </p>
          </Link>
        )}

        {/* Boosters por abrir */}
        {unopenedCount > 0 && (
          <Link
            href="/estante"
            style={{
              display: "block",
              background: "rgba(183,110,95,0.1)",
              border: "1px solid #5a2818",
              borderLeft: "3px solid #b76e5f",
              borderRadius: 4,
              padding: "10px 12px",
              marginBottom: 10,
              textDecoration: "none",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontSize: 11,
                color: "#b76e5f",
                letterSpacing: "0.1em",
              }}
            >
              {unopenedCount} BOOSTER{unopenedCount > 1 ? "S" : ""} SELADO{unopenedCount > 1 ? "S" : ""}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontStyle: "italic",
                fontSize: 12,
                color: "#8b6f3a",
                lineHeight: 1.4,
              }}
            >
              &ldquo;Cada pacote guarda destinos nao escritos.&rdquo;
            </p>
          </Link>
        )}

        {!runningMatch && unopenedCount === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "#5f5340",
              fontStyle: "italic",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            Nenhum pergaminho aguarda.
          </p>
        )}

        {/* Rodape lore */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: "1px solid #3d3022",
            textAlign: "center",
          }}
        >
          <span style={{ color: "#5a4838", fontSize: 14 }}>✦</span>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              fontSize: 12,
              color: "#5f5340",
              lineHeight: 1.6,
            }}
          >
            {settings.landingFooterLore ?? "Os deuses observam. Cada carta jogada ecoa nos saloes do destino."}
          </p>
        </div>
      </aside>
    </main>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "monospace", fontSize: 16, color, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: 9,
          color: "#8b6f3a",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Portao({
  href,
  label,
  title,
  lore,
  icon,
  color,
  bgGradient,
  featured,
}: {
  href: string;
  label: string;
  title: string;
  lore: string;
  icon: string;
  color: string;
  bgGradient: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: featured ? "32px 26px" : "26px 22px",
        background: bgGradient,
        border: `2px solid ${featured ? color : color + "55"}`,
        borderRadius: 6,
        minHeight: 280,
        textDecoration: "none",
        boxShadow: featured
          ? `0 12px 40px rgba(0,0,0,0.7), inset 0 0 0 1px ${color}33, 0 0 32px ${color}26`
          : `0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 1px ${color}26`,
        overflow: "hidden",
      }}
    >
      {/* Glow decorativo */}
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "150%",
          height: "70%",
          background: `radial-gradient(ellipse at center, ${color}22, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              fontSize: featured ? 30 : 26,
              color,
              filter: `drop-shadow(0 0 8px ${color}99)`,
            }}
          >
            {icon}
          </span>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: featured ? 16 : 14,
              color: "#fef3c7",
              letterSpacing: featured ? "0.2em" : "0.15em",
            }}
          >
            {label}
          </p>
        </div>
        <p
          style={{
            margin: "6px 0 12px",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: featured ? 32 : 22,
            color: "#fef3c7",
            lineHeight: 1.05,
            fontWeight: 600,
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontStyle: "italic",
            fontSize: featured ? 14 : 13,
            color,
            opacity: 0.85,
            lineHeight: 1.5,
          }}
        >
          &ldquo;{lore}&rdquo;
        </p>
        {featured && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 14,
              padding: "10px 20px",
              background: `linear-gradient(180deg, ${color}, #8b6f3a)`,
              color: "#1a0f05",
              borderRadius: 4,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.2em",
              boxShadow: `0 4px 16px ${color}66`,
            }}
          >
            ENTRAR &raquo;
          </div>
        )}
      </div>
    </Link>
  );
}
