"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction, resetPasswordAction, setUserRoleAction, deleteUserAction, renameUserAction } from "../_actions";

interface UserItem {
  id: string;
  username: string;
  role: string;
  coins: number;
  hasPassword: boolean;
  createdAt: string;
}

interface Props {
  currentUserId: string;
  users: UserItem[];
}

export function UsersManager({ currentUserId, users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatedPwd, setGeneratedPwd] = useState<{ username: string; password: string } | null>(null);

  // Criar usuario
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"PLAYER" | "ADMIN">("PLAYER");

  function handleCreate() {
    setError(null);
    setGeneratedPwd(null);
    startTransition(async () => {
      try {
        const res = await createUserAction({ username: newUsername, role: newRole });
        setGeneratedPwd({ username: newUsername.trim(), password: res.password });
        setNewUsername("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleResetPassword(u: UserItem) {
    if (!confirm(`Resetar a senha de ${u.username}?`)) return;
    setError(null);
    setGeneratedPwd(null);
    startTransition(async () => {
      try {
        const res = await resetPasswordAction(u.id);
        setGeneratedPwd({ username: u.username, password: res.password });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleToggleRole(u: UserItem) {
    const newRole = u.role === "ADMIN" ? "PLAYER" : "ADMIN";
    if (!confirm(`Mudar ${u.username} para ${newRole}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await setUserRoleAction({ userId: u.id, role: newRole });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleRename(u: UserItem) {
    const newName = prompt(`Novo username para ${u.username}:`, u.username);
    if (!newName || newName.trim() === u.username) return;
    setError(null);
    startTransition(async () => {
      try {
        await renameUserAction({ userId: u.id, newUsername: newName });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleDelete(u: UserItem) {
    if (!confirm(`DELETAR ${u.username}? Esta acao remove cartas, decks, fichas e todo o historico.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAction(u.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Criar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-3">Criar usuario</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "PLAYER" | "ADMIN")}
              disabled={isPending}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="PLAYER">Jogador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !newUsername.trim()}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
          >
            {isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</p>
      )}

      {generatedPwd && (
        <div className="bg-emerald-950/40 border border-emerald-700 rounded-xl p-4">
          <p className="text-sm text-emerald-300 font-bold mb-2">
            Senha gerada para <span className="font-mono">{generatedPwd.username}</span>:
          </p>
          <code className="block bg-zinc-950 border border-emerald-800 rounded p-3 text-amber-300 font-mono text-lg text-center select-all">
            {generatedPwd.password}
          </code>
          <p className="text-xs text-zinc-400 mt-2 italic">
            Copie agora. Esta senha NAO sera mostrada novamente.
          </p>
          <button
            onClick={() => setGeneratedPwd(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-amber-200 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-3">Usuarios cadastrados</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <th className="text-left py-2">Username</th>
              <th className="text-left py-2">Role</th>
              <th className="text-center py-2">Moedas</th>
              <th className="text-center py-2">Senha</th>
              <th className="text-right py-2">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-3 text-zinc-200">
                    {u.username}
                    {isMe && <span className="ml-2 text-xs text-amber-400">(voce)</span>}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.role === "ADMIN" ? "bg-red-900/50 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-center text-amber-300 font-mono">{u.coins}</td>
                  <td className="py-3 text-center text-xs">
                    {u.hasPassword ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={isPending}
                        className="text-xs text-amber-400 hover:text-amber-200 transition"
                      >
                        Resetar senha
                      </button>
                      <button
                        onClick={() => handleRename(u)}
                        disabled={isPending}
                        className="text-xs text-zinc-300 hover:text-amber-200 transition"
                      >
                        Renomear
                      </button>
                      {!isMe && (
                        <>
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={isPending}
                            className="text-xs text-blue-400 hover:text-blue-200 transition"
                          >
                            {u.role === "ADMIN" ? "Tornar jogador" : "Tornar admin"}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isPending}
                            className="text-xs text-red-400 hover:text-red-200 transition"
                          >
                            Deletar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}