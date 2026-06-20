export const dynamic = "force-dynamic";

// app/page.tsx
// Landing nova: hero cinematico + lore expandido + sidebar de atividades.

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
              backgroundSize: "contain",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              backgroundColor: "#0a0805",
              backgroundAttachment: "fixed",
              opacity: 0.5,
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
        gridTemplateColumns: "1fr 300px",
        minHeight: "100vh",
        position: "relative",
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
          background: "linear-gradient(180deg, rgba(10,8,5,0.65) 0%, rgba(10,8,5,0.85) 70%, rgba(10,8,5,0.95) 100%)",
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
          background: `radial-gradient(ellipse at top, ${settings.themePrimaryColor}30, transparent 60%)`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* ============ CENTRO ============ */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 48px 60px", display: "flex", flexDirection: "column" }}>

        {/* Selo do jogador */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
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
            <div style={{ position: "relative", width: 52, height: 52 }}>
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
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {user.username[0]?.toUpperCase() ?? "?"}
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.1em" }}>
                {user.username.toUpperCase()}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 11, color: "#8b6f3a" }}>
                {isAdmin ? "do Conselho" : "Aventureiro"} &middot; ano 101
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, paddingLeft: 16, borderLeft: "1px solid #3d3022" }}>
              <Stat value={user.coins.toLocaleString("pt-BR")} label="moedas" color="#fcd34d" />
              <Stat value={String(unopenedCount)} label="boosters" color="#b76e5f" />
              <Stat value={String(collectionCount)} label="cartas" color="#5dade2" />
              <Stat value={String(deckCount)} label="decks" color="#8e44ad" />
            </div>
          </div>
        </div>

        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
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
              fontSize: 96,
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

          <div
            style={{
              margin: "20px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              maxWidth: 540,
            }}
          >
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #c9a961 60%)" }} />
            <span style={{ color: "#c9a961", fontSize: 14 }}>✦</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #c9a961 60%)" }} />
          </div>

          <p
            style={{
              margin: "20px auto 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              color: "#d3c89a",
              fontSize: 19,
              maxWidth: 580,
              lineHeight: 1.6,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            &ldquo;{settings.landingTagline ?? welcomePhrase}&rdquo;
          </p>
        </div>

        {/* LORE EXPANDIDO */}
        <div style={{ maxWidth: 780, margin: "0 auto", width: "100%" }}>

          {/* A Cronica */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
                A Cronica
              </span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
            </div>

            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 17, color: "#d3c89a", lineHeight: 1.8, textAlign: "justify", margin: "0 0 18px" }}>
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 56, color: "#c9a961", float: "left", lineHeight: 0.85, paddingRight: 10, marginTop: 4 }}>
                T
              </span>
              hymeria era nova, e os pactos antigos. Quando o Vermelho irrompeu pelas Tres Irmas e Skanda ergueu sua lanca, ninguem imaginou que um seculo se passaria antes que as laminas voltassem a sussurrar.
            </p>

            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#b8a980", lineHeight: 1.7, textAlign: "justify", margin: 0 }}>
              Agora as tres faces do panteao vigiam: a <span style={{ color: "#5dade2" }}>Ordem</span> que sustenta, o <span style={{ color: "#c0392b" }}>Caos</span> que dissolve, e o <span style={{ color: "#a89070" }}>Neutro</span> que pesa. Os baralhos sao forjados em Valtres, as estrategias nascem em Lomerel, e os pactos selam-se em A&apos;Ralith.
            </p>
          </section>

          {/* Marcos */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
                Marcos da Era
              </span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Marco
                year="Ano 0"
                title="Guerra do Fim"
                lore="Skanda e Eris se enfrentam. As Tres Irmas se separam."
                color="#c0392b"
              />
              <Marco
                year="Ano 47"
                title="O Pacto Cinzento"
                lore="Os reinos juram silencio em troca da reconstrucao."
                color="#a89070"
              />
              <Marco
                year="Ano 101"
                title="As Laminas Sussurram"
                lore="Voce esta aqui. Algo se move sob as Tres Irmas."
                color="#c9a961"
              />
            </div>
          </section>

          {/* Os Reinos */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
              <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
                Os Reinos
              </span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              <Reino name="Valtres" lore="onde os cavaleiros se erguem" color="#c9a961" />
              <Reino name="Tres Irmas" lore="Solkaran, Qadesh e Velquar" color="#b76e5f" />
              <Reino name="Kaldaey" lore="picos do norte gelado" color="#5dade2" />
              <Reino name="A'Ralith" lore="cidades-baluartes do leste" color="#27ae60" />
              <Reino name="Lomerel" lore="academia dos feiticos" color="#8e44ad" />
              <Reino name="Sahnveret" lore="montanhas que se calam" color="#a89070" />
            </div>
          </section>

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
        <p style={{ margin: "0 0 16px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
          ✦ Pergaminhos
        </p>

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
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#fca5a5", letterSpacing: "0.1em" }}>
              PARTIDA EM ANDAMENTO
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#e9d9b6" }}>
              Retomar &raquo;
            </p>
          </Link>
        )}

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
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#b76e5f", letterSpacing: "0.1em" }}>
              {unopenedCount} BOOSTER{unopenedCount > 1 ? "S" : ""} SELADO{unopenedCount > 1 ? "S" : ""}
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", lineHeight: 1.4 }}>
              &ldquo;Cada pacote guarda destinos nao escritos.&rdquo;
            </p>
          </Link>
        )}

        {!runningMatch && unopenedCount === 0 && (
          <p style={{ fontSize: 12, color: "#5f5340", fontStyle: "italic", fontFamily: "var(--font-cormorant), Georgia, serif", padding: "20px 0", textAlign: "center" }}>
            Nenhum pergaminho aguarda.
          </p>
        )}

        {/* Atalhos rapidos */}
        <p style={{ margin: "24px 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
          ✦ Atalhos
        </p>

        <Atalho href="/lobby" icon="⚔" label="Salao de Duelos" color="#fcd34d" />
        <Atalho href="/decks" icon="📜" label="Forjar Deck" color="#8e44ad" />
        <Atalho href="/colecao" icon="💎" label="Tesouraria" color="#5dade2" />
        <Atalho href="/loja" icon="🏪" label="Mercado do Eitri" color="#e67e22" />
        <Atalho href="/panteao" icon="✦" label="O Panteao" color="#c9a961" />

        {/* Rodape lore */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #3d3022", textAlign: "center" }}>
          <span style={{ color: "#5a4838", fontSize: 14 }}>✦</span>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#5f5340", lineHeight: 1.6 }}>
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
      <div style={{ fontFamily: "monospace", fontSize: 15, color, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function Marco({ year, title, lore, color }: { year: string; title: string; lore: string; color: string }) {
  return (
    <div style={{ position: "relative", padding: "16px 14px", background: "rgba(20,12,4,0.5)", border: `1px solid ${color}55`, borderLeft: `3px solid ${color}`, borderRadius: 4 }}>
      <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 9, color, letterSpacing: "0.3em", textTransform: "uppercase" }}>
        {year}
      </p>
      <p style={{ margin: "4px 0 6px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.05em" }}>
        {title}
      </p>
      <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", lineHeight: 1.5 }}>
        {lore}
      </p>
    </div>
  );
}

function Reino({ name, lore, color }: { name: string; lore: string; color: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(20,12,4,0.4)", border: "1px solid #3d3022", borderRadius: 4 }}>
      <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color, letterSpacing: "0.05em" }}>
        {name}
      </p>
      <p style={{ margin: "2px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 11, color: "#8b6f3a" }}>
        {lore}
      </p>
    </div>
  );
}

function Atalho({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: "transparent",
        border: "1px solid #3d3022",
        borderRadius: 4,
        marginBottom: 4,
        textDecoration: "none",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 16, color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 12, color: "#d3c89a", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </Link>
  );
}