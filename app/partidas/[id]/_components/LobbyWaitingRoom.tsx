"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinLobbyAction, leaveLobbyAction, cancelLobbyAction } from "@/lib/lobby-actions";

interface PlayerInfo {
  id: string;
  side: string;
  userId: string;
  user: { username: string };
  deckId: string;
}

interface MatchData {
  id: string;
  creatorUserId: string | null;
  players: PlayerInfo[];
}

interface DeckOpt {
  id: string;
  name: string;
  factionName: string;
  factionColor: string;
  leaderName: string;
  cardCount: number;
}

export function LobbyWaitingRoom({
  matchId,
  match,
  sessionUserName,
}: {
  matchId: string;
  match: MatchData;
  sessionUserName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Decks disponíveis (carregados via API simples)
  const [decks, setDecks] = useState<DeckOpt[] | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");

  // Quem é o usuário logado?
  const myPlayer = match.players.find((p) => p.user.username === sessionUserName);
  const otherPlayer = match.players.find((p) => p.user.username !== sessionUserName);
  const isCreator = false; // Será calculado abaixo
  // OBS: para saber se é criador precisamos do creatorUserId comparado ao id do user logado.
  // Vamos resolver via fetch dos decks que já traz info do user.

  // Carrega decks jogáveis do usuário logado
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me/playable-decks", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao carregar decks.");
        const data = await res.json();
        if (!cancelled) {
          setDecks(data.decks);
          if (data.decks.length > 0) setSelectedDeckId(data.decks[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

// SSE: escuta mudanças do servidor (entrada/saída de jogadores, partida começou)
  useEffect(() => {
    const eventSource = new EventSource("/api/partidas/" + matchId + "/stream");

    eventSource.addEventListener("change", () => {
      router.refresh();
    });

    return () => {
      eventSource.close();
    };
  }, [matchId, router]);

  function handleJoin() {
    if (!selectedDeckId) return;
    setError(null);
    startTransition(async () => {
      try {
        await joinLobbyAction({ matchId, deckId: selectedDeckId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao entrar.");
      }
    });
  }

  function handleLeave() {
    if (!confirm("Sair da sala?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await leaveLobbyAction(matchId);
        router.push("/lobby");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao sair.");
      }
    });
  }

  function handleCancelLobby() {
    if (!confirm("Cancelar esta sala?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelLobbyAction(matchId);
        router.push("/lobby");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao cancelar.");
      }
    });
  }

  const inMatch = !!myPlayer;
  const playerCount = match.players.length;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/lobby" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Lobby
      </Link>

      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Sala de espera</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Aguardando 2 jogadores. A partida começa automaticamente quando ambos escolherem seus decks.
      </p>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Status de cada vaga */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {[0, 1].map((slot) => {
          const p = match.players[slot];
          return (
            <div
              key={slot}
              className={"rounded-xl border-2 p-4 " +
                (p ? "border-amber-700/40 bg-amber-950/20" : "border-dashed border-zinc-700 bg-zinc-900/30")}
            >
              <p className="text-xs uppercase text-zinc-500 mb-1">Vaga {slot + 1}</p>
              {p ? (
                <>
                  <p className="font-semibold text-zinc-100">
                    {p.user.username}
                    {p.user.username === sessionUserName && (
                      <span className="ml-2 text-xs text-amber-400">— você</span>
                    )}
                  </p>
                  <p className="text-xs text-emerald-400 mt-0.5">✓ pronto</p>
                </>
              ) : (
                <p className="text-zinc-500 italic">Aguardando jogador…</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Painel de ação */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        {inMatch ? (
          <>
            <p className="text-zinc-200 mb-3">
              ✓ Você está nesta sala com o deck escolhido.
              {playerCount < 2 ? " Aguardando oponente entrar…" : " Iniciando partida…"}
            </p>
            <button
              onClick={handleLeave}
              disabled={isPending}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded text-sm transition"
            >
              Sair da sala
            </button>
          </>
        ) : (
          <>
            <h2 className="font-heading text-amber-200 mb-3">Escolher seu deck</h2>

            {decks === null ? (
              <p className="text-zinc-500 italic">Carregando decks…</p>
            ) : decks.length === 0 ? (
              <div>
                <p className="text-zinc-400 mb-2">
                  Você não tem nenhum deck jogável.
                </p>
                <Link href="/decks" className="text-amber-300 hover:text-amber-200 underline text-sm">
                  Ir aos decks →
                </Link>
              </div>
            ) : (
              <>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.factionName}, líder {d.leaderName}, {d.cardCount} cartas)
                    </option>
                  ))}
                </select>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleJoin}
                    disabled={isPending || !selectedDeckId}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-5 py-2 rounded transition"
                  >
                    {isPending ? "Entrando..." : "Entrar com este deck"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Botão de cancelar para o criador, só se não há mais ninguém */}
        {match.creatorUserId && playerCount === 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <button
              onClick={handleCancelLobby}
              disabled={isPending}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Cancelar sala
            </button>
          </div>
        )}
      </div>
    </main>
  );
}