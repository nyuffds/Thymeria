// app/api/partidas/[id]/stream/route.ts
// Server-Sent Events: mantém conexão aberta e empurra um "ping" sempre
// que a partida muda no servidor. O cliente, ao receber, faz router.refresh().

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { subscribeToMatch } from "@/lib/match-events";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.name) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: matchId } = await params;

  // Verifica que o usuário tem direito de assistir a essa partida.
  // Em ONLINE: só os 2 jogadores. Em HOTSEAT: qualquer logado.
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: { include: { user: { select: { username: true } } } } },
  });
  if (!match) return new Response("Match not found", { status: 404 });

if (match.mode === "ONLINE") {
    // Permite acesso a:
    //   1. Quem já é MatchPlayer (escolheu deck e entrou)
    //   2. O criador da sala (ainda não escolheu deck)
    //   3. Qualquer um se a sala está em LOBBY (pra ver lista de jogadores)
    const isPlayer = match.players.some((p) => p.user.username === session.user!.name);
    const isCreator = !!match.creatorUserId && (await (async () => {
      const u = await prisma.user.findUnique({
        where: { username: session.user!.name! },
        select: { id: true },
      });
      return u?.id === match.creatorUserId;
    })());
    const isLobby = match.status === "LOBBY";

    if (!isPlayer && !isCreator && !isLobby) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Estado local pra evitar enviar depois de close
      let closed = false;

      function safeSend(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      }

      // 1) Envia evento "connected" inicial
      safeSend(`event: connected\ndata: ${JSON.stringify({ matchId })}\n\n`);

      // 2) Assina mudanças da partida
      const unsubscribe = subscribeToMatch(matchId, () => {
        safeSend(`event: change\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      });

      // 3) Heartbeat a cada 25s pra manter conexão viva
      //    (proxies derrubam conexões ociosas)
      const heartbeat = setInterval(() => {
        safeSend(`: heartbeat ${Date.now()}\n\n`);
      }, 25000);

      // 4) Cleanup quando cliente desconecta
      const abortHandler = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* já fechado */ }
      };

      request.signal.addEventListener("abort", abortHandler);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",  // pra nginx/etc não bufferizar
    },
  });
}