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
    minUnits: number;
    maxUnits: number;
    minSpecials: number;
    maxSpecials: number;
    minWeathers: number;
    maxWeathers: number;
    maxElites: number;
  };
}

const TYPE_COLORS = {
  UNIT: "#34d399",
  SPECIAL: "#c9a961",
  WEATHER: "#6ab1ff",
};

const TYPE_LABELS = {
  UNIT: "Unidades",
  SPECIAL: "Especiais",
  WEATHER: "Climas",
};

export function DeckBuilder({ deck, collection, availableLeaders, settings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState(deck.name);
  const [editingName, setEditingName] = useState(false);
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);

  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [hideMaxed, setHideMaxed] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  // Agrupar cartas do deck por tipo, e dentro de cada tipo por cardId
  const deckByType = useMemo(() => {
    const buckets: Record<string, Map<string, { card: DeckCardData; count: number }>> = {
      UNIT: new Map(),
      SPECIAL: new Map(),
      WEATHER: new Map(),
    };
    for (const c of deck.cards) {
      const bucket = buckets[c.cardType];
      if (!bucket) continue;
      const existing = bucket.get(c.cardId);
      if (existing) existing.count++;
      else bucket.set(c.cardId, { card: c, count: 1 });
    }
    const result: Record<string, { card: DeckCardData; count: number }[]> = {};
    for (const type of ["UNIT", "SPECIAL", "WEATHER"]) {
      result[type] = Array.from(buckets[type].values()).sort((a, b) => {
        const ra = RARITIES.findIndex((r) => r.key === a.card.rarity);
        const rb = RARITIES.findIndex((r) => r.key === b.card.rarity);
        if (ra !== rb) return ra - rb;
        return a.card.name.localeCompare(b.card.name);
      });
    }
    return result;
  }, [deck.cards]);

  const totalCards = deck.cards.length;
  const MAX_ELITE = settings.maxElites;
  const unitCount = deck.cards.filter((c) => c.cardType === "UNIT").length;
  const specialCount = deck.cards.filter((c) => c.cardType === "SPECIAL").length;
  const weatherCount = deck.cards.filter((c) => c.cardType === "WEATHER").length;
  const unitsOk = unitCount >= settings.minUnits && unitCount <= settings.maxUnits;
  const specialsOk = specialCount >= settings.minSpecials && specialCount <= settings.maxSpecials;
  const weathersOk = weatherCount >= settings.minWeathers && weatherCount <= settings.maxWeathers;
  const eliteCount = deck.cards.filter((c) => c.isElite).length;
  const eliteOk = eliteCount <= MAX_ELITE;
  const isValid = totalCards >= settings.minCards && totalCards <= settings.maxCards && unitsOk && specialsOk && weathersOk && eliteOk;

  const filteredCollection = useMemo(() => {
    return collection.filter((e) => {
      if (rarityFilter && e.card.rarity !== rarityFilter) return false;
      if (typeFilter && e.card.cardType !== typeFilter) return false;
      if (query && !e.card.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (hideMaxed) {
        const maxAllowed = e.card.isElite ? 1 : (e.card.maxPerDeckOverride ?? settings.maxPerRarity[e.card.rarity] ?? 1);
        const remainingByLimit = maxAllowed - e.quantityInDeck;
        const remainingByOwn = e.quantityOwned - e.quantityInDeck;
        if (Math.min(remainingByLimit, remainingByOwn) <= 0) return false;
      }
      return true;
    });
  }, [collection, rarityFilter, typeFilter, query, hideMaxed, settings.maxPerRarity]);

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

  // Calcular % de progresso (limitando em 100% pra barra não estourar)
  function pct(value: number, max: number) {
    if (max <= 0) return 0;
    return Math.min(100, (value / max) * 100);
  }

  return (
    <div className="mt-4" style={{ color: "#e9d9b6" }}>
      {/* HEADER */}
      <div
        className="flex items-start justify-between mb-6 pb-4"
        style={{ borderBottom: "1px solid #3d3022" }}
      >
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
              className="text-3xl font-bold font-heading"
              style={{
                color: "#c9a961",
                background: "#1c150d",
                border: "1px solid #3d3022",
                borderRadius: "4px",
                padding: "4px 10px",
                letterSpacing: "0.04em",
              }}
            />
          ) : (
            <h1
              className="font-heading cursor-pointer hover:opacity-80"
              style={{
                color: "#c9a961",
                fontSize: "34px",
                letterSpacing: "0.04em",
                fontWeight: 500,
                margin: 0,
              }}
              onClick={() => setEditingName(true)}
              title="Clique para renomear"
            >
              {deck.name} <span style={{ fontSize: "14px", color: "#5f5340" }}>✎</span>
            </h1>
          )}
          <p
            style={{
              fontSize: "12px",
              color: deck.faction.color,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "4px",
            }}
          >
            {deck.faction.name}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "28px",
              fontWeight: 500,
              color: isValid ? "#34d399" : "#fcd34d",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {totalCards} / {settings.maxCards}
          </p>
          <p
            style={{
              fontSize: "10px",
              color: "#5f5340",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: "4px",
            }}
          >
            Min {settings.minCards} · Max {settings.maxCards}
          </p>
        </div>
      </div>

      {error && (
        <p
          className="mb-4 text-sm"
          style={{
            color: "#fca5a5",
            background: "rgba(127, 29, 29, 0.3)",
            border: "1px solid #7f1d1d",
            borderRadius: "6px",
            padding: "8px 12px",
          }}
        >
          {error}
        </p>
      )}

      {/* BODY: 3 colunas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 1fr",
          gap: "16px",
        }}
      >
        {/* COLUNA 1: LÍDER + COMPOSIÇÃO */}
        <div>
          {/* Líder */}
          <div
            style={{
              background: "#1c150d",
              border: "1px solid #3d3022",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
              <p
                style={{
                  fontSize: "9px",
                  color: "#8b6f3a",
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  margin: 0,
                }}
              >
                Líder
              </p>
              <button
                onClick={() => setShowLeaderPicker(!showLeaderPicker)}
                disabled={isPending}
                style={{
                  fontSize: "10px",
                  color: "#8b6f3a",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {showLeaderPicker ? "Fechar" : "Trocar"}
              </button>
            </div>

            {deck.leader ? (
              <>
                <div
                  style={{
                    aspectRatio: "1023/1537",
                    background: deck.leader.imageUrl
                      ? `url(${deck.leader.imageUrl})`
                      : "linear-gradient(135deg, #3d2d18, #1c150d)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: `2px solid ${deck.leader.faction.color}`,
                    borderRadius: "6px",
                    marginBottom: "10px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      left: "6px",
                      background: "rgba(0,0,0,0.7)",
                      color: "#fcd34d",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "2px",
                    }}
                  >
                    LÍDER
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-heading), Georgia, serif",
                    color: "#fef3c7",
                    fontSize: "16px",
                    fontWeight: 500,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {deck.leader.name}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: deck.leader.faction.color,
                    textAlign: "center",
                    marginTop: "2px",
                  }}
                >
                  {deck.leader.faction.name}
                </p>
              </>
            ) : (
              <p style={{ fontSize: "12px", color: "#5f5340", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                Sem líder
              </p>
            )}

            {showLeaderPicker && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #3d3022",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {availableLeaders.length === 0 ? (
                  <p style={{ fontSize: "11px", color: "#5f5340", fontStyle: "italic" }}>
                    Sem outros líderes.
                  </p>
                ) : (
                  availableLeaders.map((l) => (
                    <button
                      key={l.cardId}
                      onClick={() => handleChangeLeader(l.cardId)}
                      disabled={isPending || l.cardId === deck.leader?.cardId}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px",
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: "4px",
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: "2px",
                        opacity: l.cardId === deck.leader?.cardId ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#2a1f10")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "32px",
                          borderRadius: "2px",
                          background: l.imageUrl ? `url(${l.imageUrl})` : "#3d2d18",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          border: `1px solid ${l.faction.color}66`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: "12px", color: "#fef3c7", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {l.name}
                        </p>
                        <p style={{ fontSize: "10px", color: l.faction.color, margin: 0 }}>
                          {l.faction.name}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Composição */}
          <div
            style={{
              background: "#1c150d",
              border: "1px solid #3d3022",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <p
              style={{
                fontSize: "9px",
                color: "#8b6f3a",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                margin: "0 0 12px",
              }}
            >
              Composição
            </p>

            {/* Unidades */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "#d3c89a" }}>Unidades</span>
                <span style={{ fontFamily: "monospace", fontSize: "13px", color: unitsOk ? "#34d399" : "#fca5a5", fontWeight: 500 }}>
                  {unitCount} <span style={{ color: "#5f5340", fontSize: "10px" }}>/ {settings.minUnits}-{settings.maxUnits}</span>
                </span>
              </div>
              <div style={{ height: "4px", background: "#2a1f10", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: pct(unitCount, settings.maxUnits) + "%", height: "100%", background: unitsOk ? "#34d399" : "#fca5a5", transition: "width 0.2s" }} />
              </div>
            </div>

            {/* Especiais */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "#d3c89a" }}>Especiais</span>
                <span style={{ fontFamily: "monospace", fontSize: "13px", color: specialsOk ? "#c9a961" : "#fca5a5", fontWeight: 500 }}>
                  {specialCount} <span style={{ color: "#5f5340", fontSize: "10px" }}>/ {settings.minSpecials}-{settings.maxSpecials}</span>
                </span>
              </div>
              <div style={{ height: "4px", background: "#2a1f10", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: pct(specialCount, settings.maxSpecials || 1) + "%", height: "100%", background: specialsOk ? "#c9a961" : "#fca5a5", transition: "width 0.2s" }} />
              </div>
            </div>

            {/* Climas */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "#d3c89a" }}>Climas</span>
                <span style={{ fontFamily: "monospace", fontSize: "13px", color: weathersOk ? "#6ab1ff" : "#fca5a5", fontWeight: 500 }}>
                  {weatherCount} <span style={{ color: "#5f5340", fontSize: "10px" }}>/ {settings.minWeathers}-{settings.maxWeathers}</span>
                </span>
              </div>
              <div style={{ height: "4px", background: "#2a1f10", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: pct(weatherCount, settings.maxWeathers || 1) + "%", height: "100%", background: weathersOk ? "#6ab1ff" : "#fca5a5", transition: "width 0.2s" }} />
              </div>
            </div>

            {/* Elites */}
            <div
              style={{
                borderTop: "1px solid #3d3022",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: "#fcd34d" }}>👑 Elites</span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  color: eliteOk ? "#fcd34d" : "#fca5a5",
                  fontWeight: 500,
                }}
              >
                {eliteCount} / {MAX_ELITE}
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA 2: DECK ATUAL */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
            <p
              className="font-heading"
              style={{
                fontSize: "13px",
                color: "#c9a961",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                margin: 0,
              }}
            >
              ◆ Deck
            </p>
          </div>

          {totalCards === 0 ? (
            <div
              style={{
                background: "#1c150d",
                border: "1px dashed #3d3022",
                borderRadius: "8px",
                padding: "40px 20px",
                textAlign: "center",
                color: "#5f5340",
                fontSize: "13px",
                fontStyle: "italic",
              }}
            >
              Adicione cartas da sua coleção →
            </div>
          ) : (
            <>
              {(["UNIT", "SPECIAL", "WEATHER"] as const).map((type) => {
                const group = deckByType[type];
                if (group.length === 0) return null;
                const typeColor = TYPE_COLORS[type];
                const typeLabel = TYPE_LABELS[type];
                const typeCount = group.reduce((sum, g) => sum + g.count, 0);

                return (
                  <div key={type} style={{ marginBottom: "14px" }}>
                    <p
                      style={{
                        fontSize: "10px",
                        color: typeColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        margin: "0 0 6px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>· {typeLabel}</span>
                      <span style={{ color: "#5f5340" }}>{typeCount}</span>
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {group.map((g) => (
                        <CardTooltip
                          placement="right"
                          key={g.card.cardId}
                          card={{
                            name: g.card.name,
                            power: g.card.power,
                            rarity: g.card.rarity,
                            cardType: g.card.cardType,
                            imageUrl: g.card.imageUrl,
                            frameUrl: null,
                            faction: g.card.faction,
                            ability: g.card.ability,
                          }}
                        >
                          <div
                            onClick={(ev) => { if (ev.shiftKey) { ev.stopPropagation(); openCard(g.card); } }}
                            style={{
                              display: "flex",
                              gap: "10px",
                              padding: "6px",
                              background: `${typeColor}0a`,
                              border: `1px solid ${typeColor}33`,
                              borderRadius: "6px",
                              alignItems: "center",
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = `${typeColor}1a`)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = `${typeColor}0a`)}
                          >
                            <div
                              style={{
                                width: "38px",
                                height: "56px",
                                background: g.card.imageUrl ? `url(${g.card.imageUrl})` : "#3d2d18",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                borderRadius: "3px",
                                border: `1px solid ${g.card.isElite ? "#fbbf24" : "#8b6f3a"}`,
                                boxShadow: g.card.isElite ? "0 0 4px rgba(251,191,36,0.4)" : "none",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  margin: 0,
                                  color: "#fef3c7",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {g.card.isElite && "👑 "}{g.card.name}
                              </p>
                              <p style={{ margin: 0, fontSize: "10px", color: "#8b6f3a" }}>
                                {g.card.faction.name}
                                {g.card.ability && ` · ${g.card.ability.name}`}
                              </p>
                            </div>
                            <span
                              style={{
                                fontFamily: "monospace",
                                color: "#c9a961",
                                fontSize: "14px",
                                fontWeight: 500,
                                marginRight: "4px",
                              }}
                            >
                              {g.card.power}
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                color: "#5f5340",
                                fontSize: "11px",
                                minWidth: "22px",
                                textAlign: "center",
                              }}
                            >
                              ×{g.count}
                            </span>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleRemove(g.card.cardId); }}
                              disabled={isPending}
                              style={{
                                width: "22px",
                                height: "22px",
                                background: "transparent",
                                color: "#b85050",
                                border: "1px solid #3d3022",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                              title="Remover 1 cópia"
                            >
                              −
                            </button>
                          </div>
                        </CardTooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* COLUNA 3: COLEÇÃO */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
            <p
              className="font-heading"
              style={{
                fontSize: "13px",
                color: "#c9a961",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                margin: 0,
              }}
            >
              ◆ Coleção
            </p>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => setViewMode("list")}
                title="Lista"
                style={{
                  background: viewMode === "list" ? "#c9a961" : "#1c150d",
                  color: viewMode === "list" ? "#1c150d" : "#c9a961",
                  border: "1px solid " + (viewMode === "list" ? "#c9a961" : "#3d3022"),
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: viewMode === "list" ? 600 : 400,
                }}
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Grade"
                style={{
                  background: viewMode === "grid" ? "#c9a961" : "#1c150d",
                  color: viewMode === "grid" ? "#1c150d" : "#c9a961",
                  border: "1px solid " + (viewMode === "grid" ? "#c9a961" : "#3d3022"),
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: viewMode === "grid" ? 600 : 400,
                }}
              >
                ▦
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              style={{
                flex: "1 1 120px",
                background: "#1c150d",
                border: "1px solid #3d3022",
                color: "#e9d9b6",
                padding: "5px 10px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: "#1c150d",
                border: "1px solid #3d3022",
                color: "#e9d9b6",
                padding: "5px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              <option value="">Todos</option>
              <option value="UNIT">Unidade</option>
              <option value="SPECIAL">Especial</option>
              <option value="WEATHER">Clima</option>
            </select>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              style={{
                background: "#1c150d",
                border: "1px solid #3d3022",
                color: "#e9d9b6",
                padding: "5px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              <option value="">Raridade</option>
              {RARITIES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#8b6f3a", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hideMaxed}
                onChange={(e) => setHideMaxed(e.target.checked)}
                style={{ accentColor: "#c9a961" }}
              />
              Esgotadas
            </label>
          </div>

          {filteredCollection.length === 0 ? (
            <div
              style={{
                background: "#1c150d",
                border: "1px solid #3d3022",
                borderRadius: "8px",
                padding: "40px 20px",
                textAlign: "center",
                color: "#5f5340",
                fontSize: "13px",
              }}
            >
              {collection.length === 0
                ? "Coleção vazia. Compre boosters da facção do deck."
                : "Nenhuma carta com esses filtros."}
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
              {filteredCollection.map((e) => {
                const maxAllowed = e.card.isElite ? 1 : (e.card.maxPerDeckOverride ?? settings.maxPerRarity[e.card.rarity] ?? 1);
                const limitReached = e.quantityInDeck >= maxAllowed;
                const ownReached = e.quantityInDeck >= e.quantityOwned;
                const deckFull = totalCards >= settings.maxCards;
                const eliteFull = e.card.isElite && eliteCount >= MAX_ELITE;
                const cannotAdd = limitReached || ownReached || deckFull || eliteFull;
                let cannotReason = "";
                if (deckFull) cannotReason = "Deck cheio";
                else if (limitReached) cannotReason = `Máx ${maxAllowed} no deck`;
                else if (ownReached) cannotReason = "Sem cópias";
                else if (eliteFull) cannotReason = `Máx ${MAX_ELITE} Elites`;
                const inDeck = e.quantityInDeck > 0;

                return (
                  <CardTooltip
                    placement="left"
                    key={e.cardId}
                    card={{
                      name: e.card.name,
                      power: e.card.power,
                      rarity: e.card.rarity,
                      cardType: e.card.cardType,
                      imageUrl: e.card.imageUrl,
                      frameUrl: null,
                      faction: e.card.faction,
                      ability: e.card.ability,
                    }}
                  >
                    <div
                      onClick={(ev) => { if (ev.shiftKey) { ev.stopPropagation(); openCard(e.card); } }}
                      style={{
                        background: inDeck ? "rgba(52, 211, 153, 0.05)" : "#1c150d",
                        border: "1px solid " + (e.card.isElite ? "#fbbf24" : inDeck ? "#34d399" : "#3d3022"),
                        borderRadius: "6px",
                        padding: "6px",
                        cursor: "pointer",
                        boxShadow: e.card.isElite ? "0 0 6px rgba(251,191,36,0.2)" : "none",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: "1023/1537",
                          background: e.card.imageUrl ? `url(${e.card.imageUrl})` : "linear-gradient(135deg, #3d2d18, #1c150d)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "4px",
                          border: `1px solid ${e.card.faction.color}66`,
                          marginBottom: "6px",
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "4px",
                            left: "4px",
                            background: e.card.isElite ? "#fbbf24" : "rgba(0,0,0,0.75)",
                            color: e.card.isElite ? "#1c150d" : "#fcd34d",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "1px 5px",
                            borderRadius: "2px",
                            fontFamily: "monospace",
                          }}
                        >
                          {e.card.power}{e.card.isElite && "👑"}
                        </span>
                        <span
                          style={{
                            position: "absolute",
                            bottom: "4px",
                            right: "4px",
                            background: inDeck ? "#34d399" : "rgba(0,0,0,0.75)",
                            color: inDeck ? "#042f2e" : "#34d399",
                            fontSize: "9px",
                            padding: "1px 4px",
                            borderRadius: "2px",
                            fontWeight: inDeck ? 600 : 400,
                          }}
                        >
                          {e.quantityInDeck}/{e.quantityOwned}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#fef3c7",
                          fontSize: "11px",
                          fontWeight: 500,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {e.card.name}
                      </p>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleAdd(e.cardId); }}
                        disabled={isPending || cannotAdd}
                        title={cannotAdd ? cannotReason : "Adicionar"}
                        style={{
                          width: "100%",
                          marginTop: "4px",
                          padding: "3px",
                          background: cannotAdd ? "#2a1f10" : "#c9a961",
                          color: cannotAdd ? "#5f5340" : "#1c150d",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: cannotAdd ? "not-allowed" : "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </CardTooltip>
                );
              })}
            </div>
          ) : (
            // LIST MODE
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filteredCollection.map((e) => {
                const maxAllowed = e.card.isElite ? 1 : (e.card.maxPerDeckOverride ?? settings.maxPerRarity[e.card.rarity] ?? 1);
                const limitReached = e.quantityInDeck >= maxAllowed;
                const ownReached = e.quantityInDeck >= e.quantityOwned;
                const deckFull = totalCards >= settings.maxCards;
                const eliteFull = e.card.isElite && eliteCount >= MAX_ELITE;
                const cannotAdd = limitReached || ownReached || deckFull || eliteFull;
                let cannotReason = "";
                if (deckFull) cannotReason = "Deck cheio";
                else if (limitReached) cannotReason = `Máx ${maxAllowed} no deck`;
                else if (ownReached) cannotReason = "Sem cópias";
                else if (eliteFull) cannotReason = `Máx ${MAX_ELITE} Elites`;
                const inDeck = e.quantityInDeck > 0;

                return (
                  <CardTooltip
                    placement="left"
                    key={e.cardId}
                    card={{
                      name: e.card.name,
                      power: e.card.power,
                      rarity: e.card.rarity,
                      cardType: e.card.cardType,
                      imageUrl: e.card.imageUrl,
                      frameUrl: null,
                      faction: e.card.faction,
                      ability: e.card.ability,
                    }}
                  >
                    <div
                      onClick={(ev) => { if (ev.shiftKey) { ev.stopPropagation(); openCard(e.card); } }}
                      style={{
                        display: "flex",
                        gap: "10px",
                        padding: "6px",
                        background: inDeck ? "rgba(52, 211, 153, 0.05)" : "#1c150d",
                        border: "1px solid " + (e.card.isElite ? "#fbbf24" : inDeck ? "#34d399" : "#3d3022"),
                        borderRadius: "6px",
                        alignItems: "center",
                        cursor: "pointer",
                        boxShadow: e.card.isElite ? "0 0 4px rgba(251,191,36,0.2)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "56px",
                          background: e.card.imageUrl ? `url(${e.card.imageUrl})` : "#3d2d18",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "3px",
                          border: `1px solid ${e.card.faction.color}66`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            color: "#fef3c7",
                            fontSize: "13px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {e.card.isElite && "👑 "}{e.card.name}
                        </p>
                        <p style={{ margin: 0, fontSize: "10px", color: e.card.faction.color }}>
                          {e.card.faction.name}
                          {e.card.ability && <span style={{ color: "#8b6f3a" }}> · {e.card.ability.name}</span>}
                        </p>
                      </div>
                      <span style={{ fontFamily: "monospace", color: "#c9a961", fontSize: "14px", fontWeight: 500, marginRight: "4px" }}>
                        {e.card.power}
                      </span>
                      <span style={{ fontFamily: "monospace", color: inDeck ? "#34d399" : "#5f5340", fontSize: "11px", minWidth: "40px", textAlign: "center" }}>
                        {e.quantityInDeck}/{e.quantityOwned}
                      </span>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleAdd(e.cardId); }}
                        disabled={isPending || cannotAdd}
                        title={cannotAdd ? cannotReason : "Adicionar"}
                        style={{
                          width: "26px",
                          height: "26px",
                          background: cannotAdd ? "#2a1f10" : "#c9a961",
                          color: cannotAdd ? "#5f5340" : "#1c150d",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: cannotAdd ? "not-allowed" : "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </CardTooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CardModal card={viewingCard} onClose={() => setViewingCard(null)} />
    </div>
  );
}
