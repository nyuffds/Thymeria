// app/login/page.tsx
// Página de login. Fluxo em 2 etapas:
//   1. Usuário digita o nome → verificamos status
//   2a. Se ainda não tem senha → redireciona pra /definir-senha
//   2b. Se já tem senha → mostra campo de senha e tenta login

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkUserStatus, loginAction } from "@/lib/actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"USERNAME" | "PASSWORD">("USERNAME");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Digite o nome de usuário.");
      return;
    }

    startTransition(async () => {
      const result = await checkUserStatus(username.trim());

      if (result.status === "NOT_FOUND") {
        setError("Usuário não encontrado.");
        return;
      }

      if (result.status === "NO_PASSWORD") {
        // Primeiro acesso: vai pra página de definir senha
        router.push(`/definir-senha?u=${encodeURIComponent(username.trim())}`);
        return;
      }

      // Já tem senha: avança pro passo da senha
      setStep("PASSWORD");
    });
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Digite a senha.");
      return;
    }

    startTransition(async () => {
      try {
        await loginAction(username.trim(), password);
        // Recarrega pra pegar a sessão e ir pra home
        router.push("/");
        router.refresh();
      } catch {
        setError("Senha incorreta.");
      }
    });
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-amber-200">
          Thymeria
        </h1>
        <p className="text-center text-zinc-400 text-sm mb-8">
          {step === "USERNAME" ? "Entre na sua conta" : `Olá, ${username}`}
        </p>

        {step === "USERNAME" ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm text-zinc-300 mb-2">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-zinc-100 placeholder-zinc-500
                           focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                           disabled:opacity-50"
                placeholder="Digite seu nome"
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
              {isPending ? "Verificando..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-zinc-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-zinc-100 placeholder-zinc-500
                           focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                           disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep("USERNAME"); setPassword(""); setError(null); }}
                disabled={isPending}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                           text-zinc-950 font-semibold py-2 rounded-lg transition"
              >
                {isPending ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}