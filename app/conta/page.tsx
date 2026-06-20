export const dynamic = "force-dynamic";

// app/conta/page.tsx
// Pagina pessoal do jogador (e do admin).
// Mostra saldo, info da conta, extrato e ficha de personagem.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { parseFoundryCharacter } from "@/lib/character-sheet";
import { CharacterSheetView } from "./_components/CharacterSheetView";

const prisma = new PrismaClient();

const REASON_LABEL: Record<string, string> = {
  ADMIN_GRANT:      "Recompensa do Conselho",
  MATCH_REWARD:     "Recompensa de Partida",
  BOOSTER_PURCHASE: "Compra de Booster",
  CARD_SELL:        "Venda de Carta",
  OTHER:            "Outro",
};

export default async function ContaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    include: {
      characterSheet: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!user) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const isAdmin = user.role === "ADMIN";

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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Header */}
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
            MINHA CRONICA
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 580, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Bem-vindo de volta, <span style={{ color: "#c9a961", fontStyle: "normal" }}>{user.username}</span>{isAdmin ? " do Conselho" : ""}.&rdquo;
          </p>
        </div>

        {/* Saldo destaque */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(201,169,97,0.18) 0%, rgba(20,12,4,0.7) 100%)",
            border: "1px solid #c9a961",
            borderRadius: 6,
            padding: "32px 24px",
            marginBottom: 32,
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(252,211,77,0.2)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em" }}>
            Patrimonio
          </p>
          <p style={{ margin: 0, fontFamily: "monospace", fontSize: 56, color: "#fcd34d", fontWeight: 700, lineHeight: 1, textShadow: "0 0 24px rgba(252,211,77,0.4)" }}>
            ✨ {user.coins.toLocaleString("pt-BR")}
          </p>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a" }}>
            moedas de campanha
          </p>
        </div>

        {/* Ultimas transacoes */}
        <Section title="Ultimas Transacoes">
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, overflow: "hidden" }}>
            {user.transactions.length === 0 ? (
              <p style={{ margin: 0, padding: "32px 20px", textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
                Nenhuma transacao ainda. Aguarde recompensa do Conselho ou abra um booster.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {user.transactions.map((t, idx) => (
                  <li
                    key={t.id}
                    style={{
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      borderBottom: idx < user.transactions.length - 1 ? "1px solid #2a1f10" : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 13, color: "#fef3c7", letterSpacing: "0.05em" }}>
                        {REASON_LABEL[t.reason] ?? t.reason}
                      </p>
                      {t.note && (
                        <p style={{ margin: "2px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.note}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: t.amount >= 0 ? "#34d399" : "#f87171" }}>
                        {t.amount >= 0 ? "+" : ""}{t.amount}
                      </p>
                      <p style={{ margin: "2px 0 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 11, color: "#5f5340" }}>
                        {new Date(t.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* Ficha de personagem */}
        <Section title="Ficha de Personagem">
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: 20 }}>
            {(() => {
              if (!user.characterSheet) {
                return (
                  <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340", textAlign: "center", padding: "20px 0" }}>
                    Voce ainda nao tem uma ficha de personagem. Peca para o Conselho enviar uma.
                  </p>
                );
              }
              const parsed = parseFoundryCharacter(user.characterSheet.data);
              if (!parsed) {
                return (
                  <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#f87171", textAlign: "center", padding: "20px 0" }}>
                    Erro ao ler a ficha. Contate o Conselho.
                  </p>
                );
              }
              return (
                <CharacterSheetView
                  sheet={parsed}
                  editable={{
                    hpCurrent: user.characterSheet.hpCurrent,
                    hpTemp: user.characterSheet.hpTemp,
                    exhaustion: user.characterSheet.exhaustion,
                    notes: user.characterSheet.notes,
                  }}
                />
              );
            })()}
          </div>
        </Section>

        {/* Atalho rodape */}
        <p style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
          <Link href="/cartas" style={{ color: "#c9a961", textDecoration: "none" }}>Ver Bestiario →</Link>
        </p>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
        <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
      </div>
      {children}
    </section>
  );
}
