// app/definir-senha/page.tsx
// Primeiro acesso: usuário define a senha.
// Recebe o username via query string (?u=NomeDoUsuario).
// Após definir, faz login automático e redireciona pra home.

"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setPasswordAction } from "@/lib/actions";

function DefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Lê o ?u=Nome da URL
  useEffect(() => {
    const u = searchParams.get("u");
    if (!u) {
      router.replace("/login");
      return;
    }
    setUsername(u);
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      try {
        await setPasswordAction(username, password);
        router.push("/");
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao definir senha.";
        setError(msg);
      }
    });
  }

  if (!username) return null;

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-amber-200">
          Primeiro acesso
        </h1>
        <p className="text-center text-zinc-400 text-sm mb-8">
          Olá, <span className="text-amber-300 font-semibold">{username}</span>. Defina sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-300 mb-2">
              Nova senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 placeholder-zinc-500
                         focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                         disabled:opacity-50"
              placeholder="Mínimo 4 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm text-zinc-300 mb-2">
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 placeholder-zinc-500
                         focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                         disabled:opacity-50"
              placeholder="Digite a senha novamente"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                       text-zinc-950 font-semibold py-2 rounded-lg transition"
          >
            {isPending ? "Salvando..." : "Definir senha e entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <DefinirSenhaForm />
    </Suspense>
  );
}