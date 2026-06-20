export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { LobbyList } from "./_components/LobbyList";
import { CreateLobbyButton } from "./_components/CreateLobbyButton";
import { Leaderboard } from "./_components/Leaderboard";
import { HeadToHead } from "./_components/HeadToHead";
import { TopCards } from "./_components/TopCards";
import { getLeaderboard, getMostUsedCards } from "@/lib/stats";
import { getHeadToHeadAction } from "./_actions";

const prisma = new PrismaClient();

export default async function LobbyPage() {
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

  const lobbies = await prisma.match.findMany({
    where: { mode: "ONLINE", status: "LOBBY" },
    orderBy: { createdAt: "desc" },
    include: {
      players: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
    take: 50,
  });

  const creatorIds = lobbies.map((l) => l.creatorUserId).filter((v): v is string => v !== null);
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, username: true },
  });
  const creatorMap = new Map(creators.map((c) => [c.id, c.username]));

  const decorated = lobbies.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    creatorId: l.creatorUserId,
    creatorName: l.creatorUserId ? (creatorMap.get(l.creatorUserId) ?? "?") : "?",
    playerCount: l.players.length,
    players: l.players.map((p) => ({ userId: p.user.id, username: p.user.username })),
    youCreated: l.creatorUserId === user.id,
    youJoined: l.players.some((p) => p.user.id === user.id),
  }));

  const ownOpenLobby = decorated.find((l) => l.youCreated);

  const [leaderboard, topCards, allPlayers] = await Promise.all([
    getLeaderboard(10),
    getMostUsedCards(10),
    prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } }).then((us) => us.map((u) => ({ userId: u.id, username: u.username }))),
  ]);
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

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
      {/* Background configuravel */}
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
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 10,
              color: "#8b6f3a",
              textTransform: "uppercase",
              letterSpacing: "0.5em",
            }}
          >
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
            SALAO DE DUELOS
          </h1>
          <p
            style={{
              margin: "16px auto 0",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              color: "#d3c89a",
              fontSize: 16,
              maxWidth: 520,
              lineHeight: 1.5,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            &ldquo;Onde laminas encontram laminas e a gloria e forjada.&rdquo;
          </p>
        </div>

        {/* Acao criar sala */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <CreateLobbyButton hasOpenLobby={!!ownOpenLobby} />
        </div>

        {/* Salas abertas */}
        <Section title="Salas Abertas">
          {decorated.length === 0 ? (
            <div
              style={{
                background: "rgba(20,12,4,0.5)",
                border: "1px solid #3d3022",
                borderRadius: 6,
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 6px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
                Nenhuma sala aberta
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
                Crie uma sala e aguarde algum aventureiro entrar.
              </p>
            </div>
          ) : (
            <LobbyList lobbies={decorated} />
          )}
        </Section>

        {/* Leaderboard */}
        <Section title="Leaderboard">
          <Leaderboard entries={leaderboard} currentUserId={user.id} />
        </Section>

        {/* Head to head */}
        <Section title="Comparar com Outro Aventureiro">
          <HeadToHead
            currentUserId={user.id}
            currentUsername={me?.username ?? "Voce"}
            players={allPlayers}
            onCompare={getHeadToHeadAction}
          />
        </Section>

        {/* Top cards */}
        <Section title="Cartas Mais Usadas">
          <TopCards cards={topCards} />
        </Section>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
        <span
          style={{
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 11,
            color: "#c9a961",
            textTransform: "uppercase",
            letterSpacing: "0.4em",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
      </div>
      {children}
    </section>
  );
}
