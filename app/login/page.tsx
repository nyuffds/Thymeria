// app/login/page.tsx
// Login estilo Foundry: dropdown de usuarios + campo de senha condicional.
// Background configuravel pelo admin.

"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { checkUserStatus, loginAction } from "@/lib/actions";

interface Settings {
  gameName: string;
  gameSubtitle: string;
  landingBackgroundUrl: string | null;
  landingTagline: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Carrega lista de usuarios e settings
  useEffect(() => {
    fetch("/api/users/list")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setLoadingUsers(false);
      })
      .catch(() => setLoadingUsers(false));

    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings))
      .catch(() => null);
  }, []);

  // Quando usuario muda, verifica status e mostra/esconde senha
  useEffect(() => {
    if (!username) {
      setNeedsPassword(false);
      setPassword("");
      setError(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await checkUserStatus(username);
      if (result.status === "NOT_FOUND") {
        setError("Usuario nao encontrado.");
        setNeedsPassword(false);
        return;
      }
      if (result.status === "NO_PASSWORD") {
        router.push(`/definir-senha?u=${encodeURIComponent(username)}`);
        return;
      }
      setNeedsPassword(true);
      setTimeout(() => passwordRef.current?.focus(), 50);
    });
  }, [username, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username) return setError("Selecione um usuario.");
    if (!password) return setError("Digite a senha.");

    startTransition(async () => {
      try {
        await loginAction(username, password);
        router.push("/");
        router.refresh();
      } catch {
        setError("Senha incorreta.");
      }
    });
  }

  const gameName = settings?.gameName ?? "Thymeria";
  const tagline = settings?.landingTagline ?? "Idade do Pacto · Ano 101";
  const bgUrl = settings?.landingBackgroundUrl;

  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "32px 20px",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background configuravel */}
      {bgUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.5,
            zIndex: 0,
          }}
        />
      )}
      {/* Overlay escuro */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(10,8,5,0.4) 0%, rgba(10,8,5,0.85) 70%, rgba(10,8,5,0.98) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 440,
          width: "100%",
        }}
      >
        {/* Logo */}
        <p
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 10,
            color: "#8b6f3a",
            textTransform: "uppercase",
            letterSpacing: "0.5em",
          }}
        >
          &mdash; {tagline} &mdash;
        </p>

        <h1
          style={{
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 70,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "0.2em",
            textIndent: "0.2em",
            lineHeight: 1,
            background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 40%, #6a4a20 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 6px 24px rgba(201,169,97,0.5))",
          }}
        >
          {gameName.toUpperCase()}
        </h1>

        <div
          style={{
            margin: "20px auto 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            maxWidth: 320,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
          <span style={{ color: "#c9a961", fontSize: 12 }}>✦</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleLogin}
          style={{
            background: "linear-gradient(180deg, rgba(20,16,10,0.92) 0%, rgba(10,8,5,0.95) 100%)",
            border: "1px solid #5a3f1a",
            borderRadius: 6,
            padding: "32px 28px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,169,97,0.2)",
            textAlign: "left",
          }}
        >
          {/* Dropdown de usuarios */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontSize: 10,
                color: "#8b6f3a",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                marginBottom: 8,
              }}
            >
              Aventureiro
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8b6f3a",
                  fontSize: 16,
                  pointerEvents: "none",
                }}
              >
                ♙
              </span>
              <select
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending || loadingUsers}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  background: "#0a0805",
                  color: "#fef3c7",
                  border: "1px solid #3d3022",
                  borderRadius: 4,
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  fontSize: 14,
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                <option value="">{loadingUsers ? "Carregando..." : "Selecione um aventureiro"}</option>
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#c9a961",
                  fontSize: 10,
                  pointerEvents: "none",
                }}
              >
                ▼
              </span>
            </div>
          </div>

          {/* Senha (condicional) */}
          {needsPassword && (
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontFamily: "var(--font-cinzel), Georgia, serif",
                  fontSize: 10,
                  color: "#8b6f3a",
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  marginBottom: 8,
                }}
              >
                Selo Secreto
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8b6f3a",
                    fontSize: 16,
                    pointerEvents: "none",
                  }}
                >
                  ⚷
                </span>
                <input
                  ref={passwordRef}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    background: "#0a0805",
                    color: "#fef3c7",
                    border: "1px solid #3d3022",
                    borderRadius: 4,
                    fontFamily: "monospace",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <p
              style={{
                fontSize: 12,
                color: "#fca5a5",
                background: "rgba(127, 29, 29, 0.3)",
                border: "1px solid #7f1d1d",
                borderLeft: "3px solid #c0392b",
                borderRadius: 4,
                padding: "8px 12px",
                marginBottom: 16,
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontStyle: "italic",
              }}
            >
              {error}
            </p>
          )}

          {/* Botao */}
          <button
            type="submit"
            disabled={isPending || !needsPassword}
            style={{
              width: "100%",
              padding: "12px",
              background: needsPassword && !isPending
                ? "linear-gradient(180deg, #c9a961, #8b6f3a)"
                : "#2a1f10",
              color: needsPassword && !isPending ? "#1a0f05" : "#5f5340",
              border: "none",
              borderRadius: 4,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.3em",
              cursor: needsPassword && !isPending ? "pointer" : "not-allowed",
              boxShadow: needsPassword && !isPending ? "0 4px 16px rgba(201,169,97,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            {isPending ? "AGUARDE..." : "ENTRAR ◊"}
          </button>
        </form>

        <p
          style={{
            marginTop: 24,
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "#5f5340",
          }}
        >
          Os portoes aguardam.
        </p>
      </div>
    </main>
  );
}
