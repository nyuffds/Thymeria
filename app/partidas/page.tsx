export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { getUserMatchHistory } from "@/lib/stats";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  SETUP:    "Preparando",
  REDRAW:   "Redraw",
  PLAYING:  "Em jogo",
  FINISHED: "Encerrada",
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 1) return s + "s";
  const h = Math.floor(m / 60);
  if (h < 1) return m + "min";
  return h + "h" + (m - h * 60) + "min";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function PartidasHubPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const [matches, history] = await Promise.all([
    prisma.match.findMany({
      where: { status: { not: "FINISHED" } },
      orderBy: { updatedAt: "desc" },
      include: { players: { include: { user: { select: { username: true } } } } },
      take: 20,
    }),
    getUserMatchHistory(user.id, 30),
  ]);

  const wins = history.filter((h) => h.result === "WIN").length;
  const losses = history.filter((h) => h.result === "LOSS").length;
  const draws = history.filter((h) => h.result === "DRAW").length;

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

        <div style={{ marginBottom: 32, textAlign: "center" }}>
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
            PARTIDAS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Dois oponentes na mesma mesa, ou desafios no <Link href="/lobby" style={{ color: "#c9a961" }}>Salao de Duelos</Link>.&rdquo;
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Link
            href="/partidas/nova"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
              color: "#1a0f05",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textDecoration: "none",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
            }}
          >
            + NOVA PARTIDA
          </Link>
        </div>

        <Section title="Em Andamento">
          {matches.length === 0 ? (
            <EmptyState text="Nenhuma partida em andamento." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {matches.map((m) => {
                const pA = m.players.find((p) => p.side === "A");
                const pB = m.players.find((p) => p.side === "B");
                return (
                  <Link
                    key={m.id}
                    href={`/partidas/${m.id}`}
                    style={{
                      display: "block",
                      background: "rgba(20,12,4,0.5)",
                      border: "1px solid #3d3022",
                      borderLeft: "3px solid #c9a961",
                      borderRadius: 4,
                      padding: "14px 16px",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#fef3c7", letterSpacing: "0.05em" }}>
                          {pA?.user.username ?? "?"}
                          <span style={{ color: "#5f5340", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", margin: "0 10px" }}>vs</span>
                          {pB?.user.username ?? "?"}
                        </span>
                        <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a" }}>
                          Ronda {m.currentRound}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Seu Historico"
          right={
            history.length > 0 ? (
              <p style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>
                <span style={{ color: "#34d399" }}>{wins}V</span>
                <span style={{ color: "#5f5340", margin: "0 6px" }}>·</span>
                <span style={{ color: "#f87171" }}>{losses}D</span>
                <span style={{ color: "#5f5340", margin: "0 6px" }}>·</span>
                <span style={{ color: "#fbbf24" }}>{draws}E</span>
              </p>
            ) : null
          }
        >
          {history.length === 0 ? (
            <EmptyState text="Voce ainda nao terminou nenhuma partida." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h) => {
                const resultColor =
                  h.result === "WIN" ? "#34d399" :
                  h.result === "LOSS" ? "#f87171" : "#fbbf24";
                const resultLabel =
                  h.result === "WIN" ? "Vitoria" :
                  h.result === "LOSS" ? "Derrota" : "Empate";
                return (
                  <Link
                    key={h.matchId}
                    href={`/partidas/${h.matchId}`}
                    style={{
                      display: "block",
                      background: "rgba(20,12,4,0.5)",
                      border: "1px solid #3d3022",
                      borderLeft: `3px solid ${resultColor}`,
                      borderRadius: 4,
                      padding: "14px 16px",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-cinzel), Georgia, serif",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            padding: "4px 10px",
                            borderRadius: 3,
                            background: resultColor + "22",
                            color: resultColor,
                            border: `1px solid ${resultColor}55`,
                          }}
                        >
                          {resultLabel}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.05em" }}>
                            Voce
                            <span style={{ color: h.yourFactionColor, fontSize: 11, marginLeft: 4, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>
                              ({h.yourFaction})
                            </span>
                            <span style={{ color: "#5f5340", margin: "0 8px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>vs</span>
                            <span style={{ color: "#d3c89a" }}>{h.opponentName}</span>
                            <span style={{ color: h.opponentFactionColor, fontSize: 11, marginLeft: 4, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>
                              ({h.opponentFaction})
                            </span>
                          </p>
                          <p style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: 11, color: "#5f5340" }}>
                            Rondas {h.roundsWon.you}-{h.roundsWon.opponent} &middot; {formatDuration(h.durationMs)} &middot; {formatDate(h.finishedAt)} &middot; {h.mode}
                          </p>
                        </div>
                      </div>
                      <span style={{ color: "#5f5340" }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

      </div>
    </main>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
        <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
        {right && <div style={{ marginLeft: 8 }}>{right}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "40px 20px", textAlign: "center" }}>
      <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
        {text}
      </p>
    </div>
  );
}
