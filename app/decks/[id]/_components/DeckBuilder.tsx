"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCardToDeckAction,
  removeCardFromDeckAction,
  renameDeckAction,
  changeDeckLeaderAction,
} from "@/lib/actions";
import { RARITIES } from "@/lib/constants";
import { CardTooltip } from "@/app/components/CardTooltip";
import { CardModal } from "@/app/components/CardModal";
import type { CardPreviewData } from "@/app/components/CardPreview";

interface CardData {
  id: string;
  name: string;
  power: number;
  rows: string;
  rarity: string;
  cardType: string;
  isElite: boolean;
  loreText: string | null;
  imageUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
  sellPriceOverride?: number | null;
  maxPerDeckOverride?: number | null;
}

interface DeckCardData {
  cardId: string;
  name: string;
  power: number;
  rows: string;
  rarity: string;
  cardType: string;
  isElite: boolean;
  loreText: string | null;
  imageUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
}

interface CollectionEntry {
  cardId: string;
  quantityOwned: number;
  quantityInDeck: number;
  card: CardData;
}

interface LeaderOption {
  cardId: string;
  name: string;
  imageUrl: string | null;
  faction: { id: string; name: string; color: string };
}

interface Props {
  deck: {
    id: string;
    name: string;
    faction: { id: string; name: string; color: string };
    leader: {
      cardId: string;
      name: string;
      imageUrl: string | null;
      faction: { name: string; color: string };
    } | null;
    cards: DeckCardData[];
  };
  collection: CollectionEntry[];
  availableLeaders: LeaderOption[];
  settings: {
    minCards: number;
    maxCards: number;
    maxPerRarity: Record<string, number>;
  };
}

export function DeckBuilder({ deck, collection, availableLeaders, settings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Rename inline
  const [nameDraft, setNameDraft] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);

  // Trocar líder
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);

  // Filtros da coleção
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [hideMaxed, setHideMaxed] = useState(false);
  const [viewingCard, setViewingCard] = useState<CardPreviewData | null>(null);

  function openCard(c: CardData | DeckCardData) {
    setViewingCard({
      name: c.name,
      power: c.power,
      rows: c.rows,
      rarity: c.rarity,
      cardType: c.cardType,
      loreText: c.loreText,
      imageUrl: c.imageUrl,
      frameUrl: null,
      faction: c.faction,
      ability: c.ability,
    });
  }

  // Cartas do deck agrupadas
  const deckGroups = useMemo(() => {
    const map = new Map<string, { card: DeckCardData; count: number }>();
    for (const c of deck.cards) {
      const existing = map.get(c.cardId);
      if (existing) existing.count++;
      else map.set(c.cardId, { card: c, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => {
      const ra = RARITIES.findIndex((r) => r.key === a.card.rarity);
      const rb = RARITIES.findIndex((r) => r.key === b.card.rarity);
      if (ra !== rb) return ra - rb;
      return a.card.name.localeCompare(b.card.name);
    });
  }, [deck.cards]);

  const totalCards = deck.cards.length;
  const MAX_ELITE = 4;
  const eliteCount = deck.cards.filter((c) => c.isElite).length;
  const isValid = totalCards >= settings.minCards && totalCards <= settings.maxCards;

  // Coleção filtrada
  const filteredCollection = useMemo(() => {
    return collection.filter((e) => {
      if (rarityFilter && e.card.rarity !== rarityFilter) return false;
      if (query && !e.card.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (hideMaxed) {
        const maxAllowed = e.card.isElite ? 1 : (e.card.maxPerDeckOverride ?? settings.maxPerRarity[e.card.rarity] ?? 1);
        const remainingByLimit = maxAllowed - e.quantityInDeck;
        const remainingByOwn   = e.quantityOwned - e.quantityInDeck;
        if (Math.min(remainingByLimit, remainingByOwn) <= 0) return false;
      }
      return true;
    });
  }, [collection, rarityFilter, query, hideMaxed, settings.maxPerRarity]);

  function withGuard(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function saveName() {
    if (!nameDraft.trim() || nameDraft === deck.name) {
      setEditingName(false);
      setNameDraft(deck.name);
      return;
    }
    withGuard(async () => {
      await renameDeckAction(deck.id, nameDraft.trim());
      setEditingName(false);
    });
  }

  function handleAdd(cardId: string) {
    withGuard(async () => { await addCardToDeckAction(deck.id, cardId); });
  }

  function handleRemove(cardId: string) {
    withGuard(async () => { await removeCardFromDeckAction(deck.id, cardId); });
  }

  function handleChangeLeader(cardId: string) {
    if (!confirm("Trocar de líder pode remover cartas incompatíveis com a nova facção. Confirmar?")) return;
    withGuard(async () => {
      await changeDeckLeaderAction(deck.id, cardId);
      setShowLeaderPicker(false);
    });
  }

  return (
    <div className="mt-4">
      {/* Header com nome e contador */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") { setEditingName(false); setNameDraft(deck.name); }
              }}
              className="text-3xl font-bold font-heading text-amber-200 bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
            />
          ) : (
            <h1
              className="text-3xl font-bold font-heading text-amber-200 cursor-pointer hover:text-amber-100"
              onClick={() => setEditingName(true)}
              title="Clique para renomear"
            >
              {deck.name}
            </h1>
          )}
          <p className="text-sm mt-1" style={{ color: deck.faction.color }}>
            {deck.faction.name}
          </p>
        </div>

        <div className="text-right">
          <p className={"text-2xl font-mono font-bold " + (isValid ? "text-emerald-400" : "text-amber-400")}>
            {totalCards} / {settings.maxCards}
          </p>
          <p className="text-xs text-zinc-500">
                          Mín: {settings.minCards}
            </p>
            <p className={"text-xs " + (eliteCount > MAX_ELITE ? "text-red-400 font-bold" : "text-amber-400")}>
              👑 Elites: {eliteCount} / {MAX_ELITE}
            </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6">
        {/* COLUNA ESQUERDA: o deck */}
        <div>
          {/* Líder */}
          <div className="bg-zinc-900/60 border-2 rounded-xl p-4 mb-4" style={{ borderColor: deck.faction.color + "55" }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading text-sm uppercase tracking-wider text-amber-300">Líder</h2>
              <button
                onClick={() => setShowLeaderPicker(!showLeaderPicker)}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-amber-200"
              >
                {showLeaderPicker ? "Fechar" : "Trocar"}
              </button>
            </div>

            {deck.leader ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded bg-zinc-800 flex-shrink-0 border-2"
                  style={{
                    borderColor: deck.leader.faction.color,
                    ...(deck.leader.imageUrl ? {
                      backgroundImage: "url(" + deck.leader.imageUrl + ")",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    } : {}),
                  }}
                />
                <div>
                  <p className="font-semibold text-zinc-100">{deck.leader.name}</p>
                  <p className="text-xs" style={{ color: deck.leader.faction.color }}>{deck.leader.faction.name}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Sem líder definido.</p>
            )}

            {showLeaderPicker && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1 max-h-60 overflow-y-auto">
                {availableLeaders.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">Você não possui outros líderes.</p>
                ) : (
                  availableLeaders.map((l) => (
                    <button
                      key={l.cardId}
                      onClick={() => handleChangeLeader(l.cardId)}
                      disabled={isPending || l.cardId === deck.leader?.cardId}
                      className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <div
                        className="w-8 h-8 rounded bg-zinc-800 flex-shrink-0"
                        style={l.imageUrl ? {
                          backgroundImage: "url(" + l.imageUrl + ")",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        } : {}}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-100 truncate">{l.name}</p>
                        <p className="text-xs" style={{ color: l.faction.color }}>{l.faction.name}</p>
                      </div>
                      {l.cardId === deck.leader?.cardId && (
                        <span className="text-xs text-emerald-400">atual</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Lista de cartas no deck */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h2 className="font-heading text-sm uppercase tracking-wider text-amber-300 mb-3">
              Cartas no deck
            </h2>

            {deckGroups.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-8 text-center">
                Adicione cartas pela sua coleção →
              </p>
            ) : (
              <ul className="space-y-1">
                {deckGroups.map((g) => {
                  const rarity = RARITIES.find((r) => r.key === g.card.rarity);
                  return (
                    <CardTooltip card={{ name: g.card.name, power: g.card.power, rarity: g.card.rarity, cardType: g.card.cardType, imageUrl: g.card.imageUrl, frameUrl: null, faction: g.card.faction, ability: g.card.ability }}>
                    <li
                      key={g.card.cardId}
                      onClick={(ev) => { if (ev.shiftKey) { ev.stopPropagation(); openCard(g.card); } }}
                      className="flex items-center gap-2 bg-zinc-800/40 hover:bg-zinc-800/70 rounded px-2 py-1.5 transition cursor-pointer"
                    >
                      <span
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: rarity?.color ?? "#aaa" }}
                      />
                      <span className="font-mono text-amber-300 text-sm font-bold w-6 text-center">
                        {g.card.power}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm text-zinc-200">
                        {g.card.isElite && <span title="Elite">👑 </span>}{g.card.name}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 w-8 text-center">
                        ×{g.count}
                      </span>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleRemove(g.card.cardId); }}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300 text-xs px-1 disabled:opacity-30"
                        title="Remover 1 cópia"
                      >
                        −
                      </button>
                    </li>
                    </CardTooltip>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: coleção */}
        <div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-3">
            <h2 className="font-heading text-sm uppercase tracking-wider text-amber-300 mb-3">
              Sua coleção elegível
            </h2>

            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                             text-zinc-100 focus:outline-none focus:border-amber-500"
                  placeholder="Buscar..."
                />
              </div>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                           text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">Todas raridades</option>
                {RARITIES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideMaxed}
                  onChange={(e) => setHideMaxed(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500"
                />
                Esconder esgotadas
              </label>
            </div>
          </div>

          {filteredCollection.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
              {collection.length === 0
                ? "Sua coleção elegível está vazia. Compre boosters da facção do seu deck."
                : "Nenhuma carta com esses filtros."}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredCollection.map((e) => {
                const rarity = RARITIES.find((r) => r.key === e.card.rarity);
                const maxAllowed = e.card.isElite ? 1 : (e.card.maxPerDeckOverride ?? settings.maxPerRarity[e.card.rarity] ?? 1);
                const limitReached = e.quantityInDeck >= maxAllowed;
                const ownReached = e.quantityInDeck >= e.quantityOwned;
                const deckFull = totalCards >= settings.maxCards;
                  const eliteFull = e.card.isElite && eliteCount >= MAX_ELITE;
                  const cannotAdd = limitReached || ownReached || deckFull || eliteFull;

                let cannotReason = "";
                if (deckFull) cannotReason = "Deck cheio";
                else if (limitReached) cannotReason = `Máx ${maxAllowed} no deck`;
                else if (ownReached) cannotReason = "Sem cópias na coleção";
                  else if (eliteFull) cannotReason = `Máx ${MAX_ELITE} Elites no deck`;

                return (
                  <CardTooltip card={{ name: e.card.name, power: e.card.power, rarity: e.card.rarity, cardType: e.card.cardType, imageUrl: e.card.imageUrl, frameUrl: null, faction: e.card.faction, ability: e.card.ability }}>
                  <li
                    key={e.cardId}
                    onClick={(ev) => { if (ev.shiftKey) { ev.stopPropagation(); openCard(e.card); } }}
                    className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded px-2 py-1.5 transition cursor-pointer"
                  >
                    <span
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rarity?.color ?? "#aaa" }}
                    />
                    <div
                      className="w-10 h-10 rounded bg-zinc-800 flex-shrink-0"
                      style={e.card.imageUrl ? {
                        backgroundImage: "url(" + e.card.imageUrl + ")",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      } : {}}
                    />
                    <span className="font-mono text-amber-300 text-sm font-bold w-6 text-center">
                      {e.card.power}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-100 truncate">{e.card.isElite && <span title="Elite">👑 </span>}{e.card.name}</p>
                      <p className="text-xs" style={{ color: e.card.faction.color }}>
                        {e.card.faction.name}
                        {e.card.ability && <span className="text-zinc-500"> · ⚡ {e.card.ability.name}</span>}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 w-14 text-right">
                      {e.quantityInDeck}/{e.quantityOwned}
                    </span>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleAdd(e.cardId); }}
                      disabled={isPending || cannotAdd}
                      className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed
                                 text-zinc-950 font-bold w-7 h-7 rounded transition flex items-center justify-center"
                      title={cannotAdd ? cannotReason : "Adicionar 1 cópia"}
                    >
                      +
                    </button>
                  </li>
                  </CardTooltip>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <CardModal card={viewingCard} onClose={() => setViewingCard(null)} />
    </div>
  );
}