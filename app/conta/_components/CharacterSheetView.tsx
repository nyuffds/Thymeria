"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParsedCharacterSheet } from "@/lib/character-sheet";
import { updateMySheetAction } from "../_actions_sheet";

const ABILITY_LABELS: Record<string, string> = {
  str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR",
};

interface Props {
  sheet: ParsedCharacterSheet;
  editable: { hpCurrent: number; hpTemp: number; exhaustion: number; notes: string };
}

export function CharacterSheetView({ sheet, editable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hp, setHp] = useState(editable.hpCurrent);
  const [hpTemp, setHpTemp] = useState(editable.hpTemp);
  const [exhaustion, setExhaustion] = useState(editable.exhaustion);
  const [notes, setNotes] = useState(editable.notes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "details" | "skills" | "combat" | "spells" | "items">("overview");

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateMySheetAction({ hpCurrent: hp, hpTemp, exhaustion, notes });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  const hpMax = sheet.hp.max ?? hp; // fallback

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-amber-700/40 rounded-xl p-5 flex gap-4 items-start">
        {sheet.img && (
          <img src={sheet.img} alt={sheet.name} className="w-24 h-24 rounded-lg object-cover border border-amber-700/40" />
        )}
        <div className="flex-1">
          <h2 className="font-heading text-2xl text-amber-200">{sheet.name}</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {sheet.race} {sheet.classes.map((c) => `${c.name}${c.subclass ? " (" + c.subclass + ")" : ""} ${c.level}`).join(" / ")}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Nivel {sheet.level} {sheet.alignment ? "- " + sheet.alignment : ""} {sheet.background ? "- " + sheet.background : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {([
          ["overview", "Geral"],
          ["details", "Detalhes"],
          ["skills", "Pericias"],
          ["combat", "Combate"],
          ["spells", "Magias"],
          ["items", "Inventario"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs uppercase tracking-wider transition ${
              tab === key ? "text-amber-200 border-b-2 border-amber-500" : "text-zinc-500 hover:text-amber-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Editavel */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-200 mb-3">Status atual (editavel)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">PV atual {sheet.hp.max !== null ? `/ ${sheet.hp.max}` : ""}</label>
                <input type="number" value={hp} min={0} onChange={(e) => setHp(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">PV temporario</label>
                <input type="number" value={hpTemp} min={0} onChange={(e) => setHpTemp(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Niveis de exaustao (0-10)</label>
                <input type="number" value={exhaustion} min={0} max={10} onChange={(e) => setExhaustion(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500" />
              </div>
            </div>
          </div>

          {/* Atributos */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-200 mb-3">Atributos</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(sheet.abilities).map(([key, a]) => (
                <div key={key} className="bg-zinc-950/60 border border-zinc-800 rounded p-2 text-center">
                  <div className="text-xs text-zinc-500 uppercase">{ABILITY_LABELS[key]}</div>
                  <div className="text-xl font-bold text-amber-200">{a.value}</div>
                  <div className="text-sm text-zinc-300">{a.mod >= 0 ? "+" : ""}{a.mod}</div>
                  {a.saveProf && <div className="text-[9px] text-emerald-400 uppercase mt-1">salv</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Defesa */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-200 mb-3">Defesa</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-zinc-500 uppercase">CA</div>
                <div className="text-2xl font-bold text-amber-200">{sheet.ac ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Inic</div>
                <div className="text-2xl font-bold text-amber-200">{sheet.initiative >= 0 ? "+" : ""}{sheet.initiative}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Bonus prof</div>
                <div className="text-2xl font-bold text-amber-200">+{sheet.proficiencyBonus}</div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Velocidade: <span className="text-zinc-300">{sheet.speed}</span>
            </p>
          </div>

          {/* Notas */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-200 mb-3">Notas</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Suas anotacoes sobre a campanha..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {tab === "details" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          {sheet.details.biography && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Biografia</h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{sheet.details.biography}</p>
            </div>
          )}
          {sheet.details.appearance && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Aparencia</h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{sheet.details.appearance}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {sheet.details.age && <Field label="Idade" value={sheet.details.age} />}
            {sheet.details.height && <Field label="Altura" value={sheet.details.height} />}
            {sheet.details.weight && <Field label="Peso" value={sheet.details.weight} />}
            {sheet.details.gender && <Field label="Genero" value={sheet.details.gender} />}
            {sheet.details.eyes && <Field label="Olhos" value={sheet.details.eyes} />}
            {sheet.details.hair && <Field label="Cabelo" value={sheet.details.hair} />}
            {sheet.details.skin && <Field label="Pele" value={sheet.details.skin} />}
            {sheet.details.faith && <Field label="Fe" value={sheet.details.faith} />}
          </div>
          {sheet.details.ideal && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Ideais</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{sheet.details.ideal}</p>
            </div>
          )}
          {sheet.details.bond && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Vinculos</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{sheet.details.bond}</p>
            </div>
          )}
          {sheet.details.flaw && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Defeitos</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{sheet.details.flaw}</p>
            </div>
          )}
          {sheet.details.trait && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Tracos</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{sheet.details.trait}</p>
            </div>
          )}
          {sheet.languages.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Idiomas</h3>
              <div className="flex flex-wrap gap-2">
                {sheet.languages.map((l) => <span key={l} className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300">{l}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-amber-200 mb-3">Pericias</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {sheet.skills.map((sk) => (
              <div key={sk.key} className="flex items-center justify-between py-1 text-sm">
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${sk.proficient ? "bg-emerald-400" : "bg-zinc-700"}`} />
                  <span className="text-zinc-300">{sk.label}</span>
                  <span className="text-xs text-zinc-500">({ABILITY_LABELS[sk.ability]})</span>
                </span>
                <span className="font-mono text-amber-200">{sk.value >= 0 ? "+" : ""}{sk.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "combat" && (
        <div className="space-y-4">
          {sheet.weapons.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-200 mb-3">Armas</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2">Nome</th>
                    <th className="text-left py-2">Dano</th>
                    <th className="text-center py-2">Equipada</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.weapons.map((w, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 text-zinc-200">{w.name}</td>
                      <td className="py-2 text-zinc-400 font-mono text-xs">{w.damage}</td>
                      <td className="py-2 text-center">{w.equipped ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sheet.armor.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-200 mb-3">Armadura</h3>
              <table className="w-full text-sm">
                <tbody>
                  {sheet.armor.map((a, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 text-zinc-200">{a.name}</td>
                      <td className="py-2 text-zinc-400 text-right">{a.ac ? `CA ${a.ac}` : "-"}</td>
                      <td className="py-2 text-center w-12">{a.equipped ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sheet.feats.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-200 mb-3">Talentos / Habilidades de classe</h3>
              <div className="space-y-3">
                {sheet.feats.map((f, i) => (
                  <details key={i} className="bg-zinc-950/60 border border-zinc-800 rounded p-2">
                    <summary className="cursor-pointer text-amber-200 font-semibold">{f.name}</summary>
                    {f.description && <p className="text-xs text-zinc-400 mt-2 whitespace-pre-wrap leading-relaxed">{f.description}</p>}
                  </details>
                ))}
              </div>
            </div>
          )}
          {(sheet.resistances.length > 0 || sheet.immunities.length > 0 || sheet.vulnerabilities.length > 0) && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-200 mb-3">Resistencias / Imunidades</h3>
              {sheet.resistances.length > 0 && <p className="text-xs text-zinc-400 mb-1"><span className="text-emerald-400">Resistencia:</span> {sheet.resistances.join(", ")}</p>}
              {sheet.immunities.length > 0 && <p className="text-xs text-zinc-400 mb-1"><span className="text-amber-400">Imunidade:</span> {sheet.immunities.join(", ")}</p>}
              {sheet.vulnerabilities.length > 0 && <p className="text-xs text-zinc-400"><span className="text-red-400">Vulnerabilidade:</span> {sheet.vulnerabilities.join(", ")}</p>}
            </div>
          )}
        </div>
      )}

      {tab === "spells" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-amber-200 mb-3">Magias</h3>
          {sheet.spells.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">Nenhuma magia conhecida.</p>
          ) : (
            <div className="space-y-2">
              {sheet.spells.sort((a, b) => a.level - b.level).map((s, i) => (
                <details key={i} className="bg-zinc-950/60 border border-zinc-800 rounded p-2">
                  <summary className="cursor-pointer">
                    <span className="text-amber-200 font-semibold">{s.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">{s.level === 0 ? "truque" : `nivel ${s.level}`}</span>
                  </summary>
                  {s.description && <p className="text-xs text-zinc-400 mt-2 whitespace-pre-wrap leading-relaxed">{s.description}</p>}
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "items" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-amber-200 mb-2">Moedas</h3>
            <div className="flex gap-3 text-sm">
              <span className="text-yellow-300">PO {sheet.currency.gp}</span>
              <span className="text-zinc-300">PP {sheet.currency.sp}</span>
              <span className="text-orange-400">PE {sheet.currency.ep}</span>
              <span className="text-amber-700">PC {sheet.currency.cp}</span>
              <span className="text-blue-300">PL {sheet.currency.pp}</span>
            </div>
          </div>
          {sheet.items.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-2">Itens</h3>
              <table className="w-full text-sm">
                <tbody>
                  {sheet.items.map((i, idx) => (
                    <tr key={idx} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 text-zinc-200">{i.name}</td>
                      <td className="py-2 text-right text-zinc-500 text-xs">x{i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Botao salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          {isPending ? "Salvando..." : "Salvar alteracoes"}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ salvo</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-zinc-500 uppercase block">{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
  );
}