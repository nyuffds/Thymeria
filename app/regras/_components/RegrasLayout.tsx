// app/regras/_components/RegrasLayout.tsx
// Wrapper visual compartilhado das paginas do Manual.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Props {
  title: string;
  subtitle?: string;
  maxWidth?: number;
  children: React.ReactNode;
}

export async function RegrasLayout({ title, subtitle, maxWidth = 900, children }: Props) {
  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <main
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100vh",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {settings.landingBackgroundUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${settings.landingBackgroundUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#0a0805",
            backgroundAttachment: "fixed",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,5,0.45) 0%, rgba(10,8,5,0.75) 70%, rgba(10,8,5,0.9) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Nav voltar */}
        <Link
          href="/regras"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 11,
            color: "#8b6f3a",
            textDecoration: "none",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          &larr; Manual
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; Manual do Aventureiro &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textIndent: "0.15em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 16px rgba(201,169,97,0.4))",
            }}
          >
            {title.toUpperCase()}
          </h1>
          {subtitle && (
            <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 580, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              &ldquo;{subtitle}&rdquo;
            </p>
          )}
        </div>

        {children}
      </div>
    </main>
  );
}

// Section reusavel
export function ManualSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #8b6f3a)" }} />
        <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 11, color: "#c9a961", textTransform: "uppercase", letterSpacing: "0.4em", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #8b6f3a)" }} />
      </div>
      <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: 24 }}>
        {children}
      </div>
    </section>
  );
}
