"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCardAction,
  updateCardAction,
  deleteCardAction,
} from "@/lib/actions";
import { ROWS, RARITIES, CARD_TYPES, LEADER_MODES } from "@/lib/constants";
import { CardPreview } from "@/app/components/CardPreview";

interface FactionOpt { id: string; name: string; color: string; }
interface AbilityOpt { id: string; name: string; description: string; }

type Mode =
  | {
      mode: "create";
      factions: FactionOpt[];
      abilities: AbilityOpt[];
    }
  | {
      mode: "edit";
      id: string;
      factions: FactionOpt[];
      abilities: AbilityOpt[];
      initial: {
        name: string;
        factionId: string;
        power: number;
        rows: string[];
        rarity: string;
        cardType: string;
        isElite: boolean;
        leaderMode: string | null;
        abilityId: string | null;
        loreText: string;
        imageUrl: string;
        frameUrl: string;
        isReleased: boolean;
      };
    };

export function CardForm(props: Mode) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";

  const defaultFaction = props.factions[0]?.id ?? "";
  const init = isEdit
    ? props.initial
    : {
        name: "",
        factionId: defaultFaction,
        power: 5,
        rows: ["MELEE"] as string[],
        rarity: "COMMON",
        cardType: "UNIT",
        isElite: false,
        leaderMode: null as string | null,
        abilityId: null as string | null,
        loreText: "",
        imageUrl: "",
        frameUrl: "",
        isReleased: true,
      };

  const [name, setName]             = useState(init.name);
  const [factionId, setFactionId]   = useState(init.factionId);
  const [power, setPower]           = useState<string>(init.power.toString());
  const [rows, setRows]             = useState<string[]>(init.rows);
  const [rarity, setRarity]         = useState(init.rarity);
  const [cardType, setCardType]     = useState(init.cardType);
  const [isElite, setIsElite]       = useState(init.isElite);
  const [leaderMode, setLeaderMode] = useState<string>(init.leaderMode ?? "PASSIVE");
  const [abilityId, setAbilityId]   = useState<string>(init.abilityId ?? "");
  const [loreText, setLoreText]     = useState(init.loreText);
  const [imageUrl, setImageUrl]     = useState(init.imageUrl);
  const [frameUrl, setFrameUrl]     = useState(init.frameUrl);
  const [isReleased, setIsReleased] = useState(init.isReleased);

  function toggleRow(rowKey: string) {
    setRows((prev) =>
      prev.includes(rowKey) ? prev.filter((r) => r !== rowKey) : [...prev, rowKey]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const powerNum = parseInt(power, 10);
    if (Number.isNaN(powerNum)) {
      setError("Poder deve ser um número válido.");
      return;
    }

    const payload = {
      name,
      factionId,
      power: powerNum,
      rows,
      rarity,
      cardType,
      leaderMode: cardType === "LEADER" ? leaderMode : null,
      isElite,
      abilityId: abilityId || null,
      loreText,
      imageUrl,
      frameUrl,
      isReleased,
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateCardAction(props.id, payload);
        } else {
          await createCardAction(payload);
        }
        router.push("/admin/cartas");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Excluir a carta "${name}"? Isto não pode ser desfeito.`)) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteCardAction(props.id);
        router.push("/admin/cartas");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  const previewFaction = props.factions.find((f) => f.id === factionId);
  const previewAbility = props.abilities.find((a) => a.id === abilityId);
  const selectedLeaderMode = LEADER_MODES.find((m) => m.key === leaderMode);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
            placeholder="Ex: Roderic Vellhart"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Facção</label>
            <select
              value={factionId}
              onChange={(e) => setFactionId(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              {props.factions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">Poder</label>
            <input
              type="number"
              value={power}
              onChange={(e) => setPower(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">Fileiras permitidas</label>
          <div className="flex gap-2">
            {ROWS.map((r) => (
              <label
                key={r.key}
                className={`flex-1 cursor-pointer px-3 py-2 rounded-lg border text-sm text-center transition
                  ${rows.includes(r.key)
                    ? "bg-amber-600 border-amber-500 text-zinc-950 font-semibold"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={rows.includes(r.key)}
                  onChange={() => toggleRow(r.key)}
                  disabled={isPending}
                />
                {r.label}
              </label>
            ))}
          </div>
          {cardType === "WEATHER" && (
            <p className="text-xs text-zinc-500 mt-2 italic">
              Cartas de clima não entram em fileira; a fileira escolhida determina onde o efeito é aplicado.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Raridade</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              {RARITIES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">Tipo</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              {CARD_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

                {/* Elite (categoria especial: imune a tudo, max 1 copia por nome no deck) */}
        {cardType !== "LEADER" && cardType !== "WEATHER" && (
          <div className="bg-zinc-900/40 border border-amber-700/30 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isElite}
                onChange={(e) => setIsElite(e.target.checked)}
                disabled={isPending}
                className="mt-1 w-4 h-4 accent-amber-500"
              />
              <div>
                <span className="text-sm text-amber-200 font-semibold">👑 Carta Elite</span>
                <p className="text-xs text-zinc-400 mt-1">
                  Carta unica e poderosa. Imune a todos os efeitos (boost, dano, climas, BOND). 
                  Apenas <span className="text-amber-300">1 copia por nome</span> permitida em cada deck.
                </p>
              </div>
            </label>
          </div>
        )}

        {cardType === "LEADER" && (
          <div className="bg-zinc-900/40 border border-amber-700/30 rounded-lg p-4 space-y-2">
            <label className="block text-sm text-amber-200 mb-2">Modo do líder</label>
            <select
              value={leaderMode}
              onChange={(e) => setLeaderMode(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              {LEADER_MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            {selectedLeaderMode && (
              <p className="text-xs text-zinc-400 italic">{selectedLeaderMode.desc}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm text-zinc-300 mb-2">Habilidade</label>
          <select
            value={abilityId}
            onChange={(e) => setAbilityId(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">— Sem habilidade —</option>
            {props.abilities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {previewAbility && (
            <p className="text-xs text-zinc-500 mt-2 italic">{previewAbility.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">URL da arte (opcional)</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">URL do frame customizado (opcional)</label>
          <input
            type="text"
            value={frameUrl}
            onChange={(e) => setFrameUrl(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
            placeholder="https://... (PNG com transparência, sobrepõe a moldura padrão)"
          />
          <p className="text-xs text-zinc-500 mt-1 italic">
            Se preenchido, substitui a moldura padrão. PNG transparente com mesmo aspect ratio 2:3.
          </p>
        </div>


        <div>
          <label className="block text-sm text-zinc-300 mb-2">Lore / Citação (opcional)</label>
          <textarea
            value={loreText}
            onChange={(e) => setLoreText(e.target.value)}
            disabled={isPending}
            rows={2}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
            placeholder="A luz não cega. A fé cega."
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isReleased}
              onChange={(e) => setIsReleased(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 accent-amber-500"
            />
            Liberada (jogadores podem encontrar em boosters)
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/cartas")}
              disabled={isPending}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                         text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
            >
              {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar carta"}
            </button>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-red-400 hover:text-red-300 text-sm transition disabled:opacity-50"
            >
              Excluir carta
            </button>
          )}
        </div>
      </form>

      <div className="lg:sticky lg:top-20">
        <p className="text-xs uppercase text-zinc-500 mb-3 tracking-wide">Pré-visualização</p>
        <CardPreview
          card={{
            name: name || "Nome da Carta",
            power: parseInt(power, 10) || 0,
            rows: rows.join(","),
            rarity,
            cardType,
            loreText: loreText || null,
            frameUrl: frameUrl || null,
            imageUrl: imageUrl || null,
            faction: previewFaction
              ? { name: previewFaction.name, color: previewFaction.color }
              : { name: "?", color: "#95a5a6" },
            ability: previewAbility
              ? { name: previewAbility.name, description: previewAbility.description }
              : null,
          }}
        />
      </div>
    </div>
  );
}