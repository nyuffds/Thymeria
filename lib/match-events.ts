// lib/match-events.ts
// Event emitter em memória pra SSE de partidas.
// Mantém listeners por matchId e dispara updates quando o estado muda.
//
// Limitação conhecida: só funciona dentro de UMA instância Node.
// Pra produção escalada precisaria de Redis Pub/Sub ou similar.

type Listener = () => void;

// Estado precisa sobreviver a hot-reloads do Next em dev.
// Guardamos no globalThis pra não recriar a cada reimport.
declare global {
  // eslint-disable-next-line no-var
  var __matchListeners: Map<string, Set<Listener>> | undefined;
}

const listeners: Map<string, Set<Listener>> =
  globalThis.__matchListeners ?? (globalThis.__matchListeners = new Map());

/**
 * Registra um listener pra mudanças em uma partida específica.
 * Retorna função pra desregistrar.
 */
export function subscribeToMatch(matchId: string, fn: Listener): () => void {
  let set = listeners.get(matchId);
  if (!set) {
    set = new Set();
    listeners.set(matchId, set);
  }
  set.add(fn);

  return () => {
    const s = listeners.get(matchId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) listeners.delete(matchId);
  };
}

/**
 * Notifica todos os listeners que a partida mudou.
 * Chamado pelas server actions depois de gravar no banco.
 */
export function notifyMatchChange(matchId: string): void {
  const set = listeners.get(matchId);
  if (!set) return;
  // Snapshot pra evitar mutação durante iteração
  for (const fn of Array.from(set)) {
    try { fn(); } catch (err) { console.error("Listener error:", err); }
  }
}

/**
 * Retorna número de listeners ativos (útil pra debug).
 */
export function listenerCount(matchId: string): number {
  return listeners.get(matchId)?.size ?? 0;
}