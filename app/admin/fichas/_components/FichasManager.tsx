"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCharacterSheetAction, deleteCharacterSheetAction } from "../_actions";

interface UserItem {
  id: string;
  username: string;
  hasSheet: boolean;
  characterName: string | null;
}

export function FichasManager({ users }: { users: UserItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [jsonContent, setJsonContent] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonContent(text);
  }

  async function handleUpload() {
    setError(null);
    setSuccess(null);
    if (!selectedUserId) {
      setError("Selecione um jogador.");
      return;
    }
    if (!jsonContent) {
      setError("Faca upload do arquivo JSON.");
      return;
    }
    startTransition(async () => {
      try {
        await uploadCharacterSheetAction({ userId: selectedUserId, jsonContent });
        setSuccess("Ficha enviada com sucesso.");
        setJsonContent("");
        setSelectedUserId("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar.");
      }
    });
  }

  async function handleDelete(userId: string) {
    if (!confirm("Deletar ficha desse jogador?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCharacterSheetAction(userId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-3">Nova ficha</h2>

        <label className="block text-xs uppercase text-zinc-500 mb-1">Jogador</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={isPending}
          className="w-full mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500"
        >
          <option value="">-- selecionar --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}{u.hasSheet ? " (ja tem ficha)" : ""}</option>
          ))}
        </select>

        <label className="block text-xs uppercase text-zinc-500 mb-1">Arquivo JSON do Foundry</label>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={isPending}
          className="text-xs text-zinc-400 file:mr-2 file:px-3 file:py-1 file:rounded file:bg-amber-600 file:text-zinc-950 file:border-0 file:cursor-pointer mb-3"
        />

        {jsonContent && (
          <p className="text-xs text-emerald-400 mb-3">
            Arquivo carregado ({(jsonContent.length / 1024).toFixed(1)} KB).
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={isPending}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          {isPending ? "Enviando..." : "Salvar ficha"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2">{success}</p>}

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-3">Fichas atuais</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <th className="text-left py-2">Jogador</th>
              <th className="text-left py-2">Personagem</th>
              <th className="text-right py-2">Acao</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="py-3 text-zinc-200">{u.username}</td>
                <td className="py-3 text-zinc-400">
                  {u.hasSheet ? (u.characterName ?? "(sem nome)") : <span className="italic text-zinc-600">sem ficha</span>}
                </td>
                <td className="py-3 text-right">
                  {u.hasSheet && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}