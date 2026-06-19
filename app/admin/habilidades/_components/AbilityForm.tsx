// app/admin/habilidades/_components/AbilityForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAbilityAction,
  updateAbilityAction,
  deleteAbilityAction,
} from "@/lib/actions";
import { ENGINE_KEYS } from "@/lib/constants";

interface CardOpt { id: string; name: string; rarity: string; }

type Mode =
  | { mode: "create"; allCards: CardOpt[] }
  | {
      mode: "edit";
      id: string;
      allCards: CardOpt[];
      initial: {
        name: string;
        description: string;
        engineKey: string;
        engineValue: number | null;
        isActive: boolean;
        targetCardIdsCsv: string | null;
        targetCardType: string | null;
        targetCount: number | null;
        secondaryEngineKey: string | null;
        secondaryEngineValue: number | null;
        secondaryTargetCardIdsCsv: string | null;
        secondaryTargetCardType: string | null;
        secondaryTargetCount: number | null;
        triggerMode: string;
      };
    };

export function AbilityForm(props: Mode) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const init = isEdit
    ? props.initial
    : { name: "", description: "", engineKey: "", engineValue: null as number | null, isActive: true, targetCardIdsCsv: null as string | null, targetCardType: null as string | null, targetCount: null as number | null, secondaryEngineKey: null as string | null, secondaryEngineValue: null as number | null, secondaryTargetCardIdsCsv: null as string | null, secondaryTargetCardType: null as string | null, secondaryTargetCount: null as number | null, triggerMode: "MANUAL" };

  const [name, setName]                 = useState(init.name);
  const [description, setDescription]   = useState(init.description);
  const [engineKey, setEngineKey]       = useState(init.engineKey);
  const [engineValue, setEngineValue]   = useState<string>(init.engineValue?.toString() ?? "");
  const [isActive, setIsActive]         = useState(init.isActive);
  const [targetCardIds, setTargetCardIds] = useState<string[]>(init.targetCardIdsCsv ? init.targetCardIdsCsv.split(",").filter(Boolean) : []);
  const [targetCardType, setTargetCardType] = useState<string | null>(init.targetCardType);
  const [targetCount, setTargetCount] = useState<string>(init.targetCount?.toString() ?? "");
  // Efeito secundario
  const [secondaryEngineKey, setSecondaryEngineKey] = useState<string>(init.secondaryEngineKey ?? "");
  const [secondaryEngineValue, setSecondaryEngineValue] = useState<string>(init.secondaryEngineValue?.toString() ?? "");
  const [secondaryTargetCardIdsCsv, setSecondaryTargetCardIdsCsv] = useState<string | null>(init.secondaryTargetCardIdsCsv);
  const [secondaryTargetCardType, setSecondaryTargetCardType] = useState<string | null>(init.secondaryTargetCardType);
  const [secondaryTargetCount, setSecondaryTargetCount] = useState<string>(init.secondaryTargetCount?.toString() ?? "");
  const [triggerMode, setTriggerMode]     = useState(init.triggerMode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const valueNum = engineValue.trim() === "" ? null : parseInt(engineValue, 10);
    if (engineKey && (valueNum === null || Number.isNaN(valueNum))) {
      setError("Habilidade com motor precisa de valor numérico.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateAbilityAction(props.id, {
            name, description, engineKey, engineValue: valueNum, isActive,
            targetCardIdsCsv: targetCardIds.join(",") || null,
            targetCardType,
            targetCount: targetCount.trim() === "" ? null : parseInt(targetCount, 10),
            secondaryEngineKey: secondaryEngineKey || null,
            secondaryEngineValue: secondaryEngineValue.trim() === "" ? null : parseInt(secondaryEngineValue, 10),
            secondaryTargetCardIdsCsv,
            secondaryTargetCardType,
            secondaryTargetCount: secondaryTargetCount.trim() === "" ? null : parseInt(secondaryTargetCount, 10),
            triggerMode,
          });
        } else {
          await createAbilityAction({
            name, description, engineKey, engineValue: valueNum,
            targetCardIdsCsv: targetCardIds.join(",") || null,
            targetCardType,
            targetCount: targetCount.trim() === "" ? null : parseInt(targetCount, 10),
            secondaryEngineKey: secondaryEngineKey || null,
            secondaryEngineValue: secondaryEngineValue.trim() === "" ? null : parseInt(secondaryEngineValue, 10),
            secondaryTargetCardIdsCsv,
            secondaryTargetCardType,
            secondaryTargetCount: secondaryTargetCount.trim() === "" ? null : parseInt(secondaryTargetCount, 10),
            triggerMode,
          });
        }
        router.push("/admin/habilidades");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Excluir a habilidade "${name}"? Isto não pode ser desfeito.`)) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteAbilityAction(props.id);
        router.push("/admin/habilidades");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  const selectedEngine = ENGINE_KEYS.find((e) => e.key === engineKey);

  return (
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
          placeholder="Ex: Chamado de Kali"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-2">
          Descrição <span className="text-zinc-500">(aparece na carta)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-zinc-100 focus:outline-none focus:border-amber-500"
          placeholder="O texto que o jogador lê na carta."
        />
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-3">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">
          Comportamento no motor
        </p>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">Tipo de efeito</label>
          <select
            value={engineKey}
            onChange={(e) => setEngineKey(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">— Narrativa (GM resolve à mão) —</option>
            {ENGINE_KEYS.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label} ({e.key})
              </option>
            ))}
          </select>
          {selectedEngine && (
            <p className="text-xs text-zinc-500 mt-2 italic">{selectedEngine.desc}</p>
          )}
        </div>

        {engineKey && (
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Valor numérico</label>
            <input
              type="number"
              value={engineValue}
              onChange={(e) => setEngineValue(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
              placeholder="Ex: 2"
            />
          </div>
        )}
        {/* Efeito Secundario (opcional) */}
        <div className="border-t border-zinc-700 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-amber-300 mb-3">Efeito Secundario (opcional)</h4>
          <p className="text-xs text-zinc-500 mb-3 italic">Permite criar habilidades duplas (ex: Vampiro = DAMAGE + HEAL). Deixe em branco se nao quiser usar.</p>

          <label className="block text-sm text-zinc-300 mb-2">Tipo de efeito secundario</label>
          <select
            value={secondaryEngineKey}
            onChange={(e) => setSecondaryEngineKey(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 mb-3"
          >
            <option value="">-- Nenhum --</option>
            {ENGINE_KEYS.map((e) => (
              <option key={e.key} value={e.key}>{e.label}</option>
            ))}
          </select>

          {secondaryEngineKey && (
            <>
              <label className="block text-sm text-zinc-300 mb-2">Valor numerico do secundario</label>
              <input
                type="number"
                value={secondaryEngineValue}
                onChange={(e) => setSecondaryEngineValue(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 mb-3"
                placeholder="Ex: 2"
              />

              {(secondaryEngineKey === "BOOST_MANY" || secondaryEngineKey === "SHUFFLE_AND_DRAW") && (
                <div className="mb-3">
                  <label className="block text-sm text-zinc-300 mb-2">Quantidade de alvos (secundario)</label>
                  <input
                    type="number"
                    value={secondaryTargetCount}
                    onChange={(e) => setSecondaryTargetCount(e.target.value)}
                    disabled={isPending}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {secondaryEngineKey === "TUTOR_BY_TYPE" && (
                <div className="mb-3">
                  <label className="block text-sm text-zinc-300 mb-2">Tipo de carta-alvo (secundario)</label>
                  <select
                    value={secondaryTargetCardType ?? ""}
                    onChange={(e) => setSecondaryTargetCardType(e.target.value || null)}
                    disabled={isPending}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Escolha --</option>
                    <option value="UNIT">Unidade</option>
                    <option value="SPECIAL">Especial</option>
                    <option value="WEATHER">Clima</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modo de ativacao */}
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Modo de ativacao</label>
          <select
            value={triggerMode}
            onChange={(e) => setTriggerMode(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
          >
            <option value="MANUAL">Manual (jogador ativa quando joga a carta)</option>
            <option value="ON_PLAY">Ao entrar em campo (automatica)</option>
          </select>
        </div>

        {/* Cartas alvo (so para engines que precisam, como PULL_BY_NAME) */}
        {(engineKey === "PULL_BY_NAME" || engineKey === "ON_DEATH_SPAWN" || engineKey === "SUMMON_TO_HAND_BY_NAME" || engineKey === "SUMMON_TO_BOARD_BY_NAME") && (
          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              {engineKey === "ON_DEATH_SPAWN" ? "Carta que sera gerada quando esta carta morrer" : engineKey === "SUMMON_TO_HAND_BY_NAME" ? "Cartas que serao puxadas para a mao" : engineKey === "SUMMON_TO_BOARD_BY_NAME" ? "Cartas que serao invocadas direto no campo" : "Cartas que esta habilidade puxa da mao"}
            </label>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
              {props.allCards.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Nenhuma carta cadastrada ainda.</p>
              ) : (
                props.allCards.map((c) => {
                  const isChecked = targetCardIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setTargetCardIds((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                          );
                        }}
                        disabled={isPending}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span className="text-sm text-zinc-200">{c.name}</span>
                      <span className="text-xs text-zinc-500 ml-auto">{c.rarity}</span>
                    </label>
                  );
                })
              )}
            </div>
            {targetCardIds.length > 0 && (
              <p className="text-xs text-amber-400 mt-2">
                {targetCardIds.length} carta(s) selecionada(s)
              </p>
            )}
          </div>
        )}

        {/* Quantidade de alvos (BOOST_MANY / Nutrir) */}
        {(engineKey === "BOOST_MANY" || engineKey === "SHUFFLE_AND_DRAW") && (
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Quantidade de alvos / cartas (depende da habilidade)</label>
            <input type="number" min="1" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} disabled={isPending} className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500" placeholder="Ex: 2 (cartas a comprar / criaturas a afetar)" />
          </div>
        )}

        {/* Tipo de carta-alvo (so para engines de tutor como TUTOR_BY_TYPE / Caos) */}
        {engineKey === "TUTOR_BY_TYPE" && (
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Tipo de carta que esta habilidade puxa do deck</label>
            <select value={targetCardType ?? ""} onChange={(e) => setTargetCardType(e.target.value || null)} disabled={isPending} className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500">
              <option value="">- Escolha um tipo -</option>
              <option value="UNIT">Unidade</option>
              <option value="SPECIAL">Especial</option>
              <option value="WEATHER">Clima</option>
            </select>
          </div>
        )}

      </div>

      {isEdit && (
        <div>
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 accent-amber-500"
            />
            Habilidade ativa (disponível para uso em cartas)
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/habilidades")}
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
            {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar habilidade"}
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:text-red-300 text-sm transition disabled:opacity-50"
          >
            Excluir habilidade
          </button>
        )}
      </div>
    </form>
  );
}