// app/admin/panteao/novo/page.tsx
// Form de criacao rapida (campos minimos; resto se edita depois).

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { createDeityAction } from "@/lib/panteao-actions";

const prisma = new PrismaClient();

export default async function NovaDivindadePage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/");

  return (
    <main style={{ flex: 1, padding: "40px 32px", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Link href="/admin/panteao" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 11, color: "#8b6f3a", textDecoration: "none",
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24,
        }}>&larr; Panteao</Link>

        <h1 style={{
          margin: 0, fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 32, fontWeight: 700, letterSpacing: "0.1em",
          color: "#fcd34d",
        }}>Nova Divindade</h1>
        <p style={{
          margin: "8px 0 24px", fontFamily: "var(--font-cormorant), Georgia, serif",
          fontStyle: "italic", fontSize: 14, color: "#8b6f3a",
        }}>Preencha o essencial. Lore, imagem e citacao voce edita depois.</p>

        <form action={createDeityAction}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Nome</label>
            <input name="name" required style={inputStyle} placeholder="Ex: Eitri" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Slug (url)</label>
            <input name="slug" required pattern="[a-z0-9-]+" style={inputStyle} placeholder="ex: eitri" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Dominio</label>
            <input name="domain" required style={inputStyle} placeholder="Ex: Forja e Tesouros" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Simbolo</label>
            <input name="symbol" required maxLength={4} defaultValue="✦" style={{ ...inputStyle, fontSize: 22, textAlign: "center", maxWidth: 80 }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Alinhamento</label>
            <select name="alignment" required style={inputStyle}>
              <option value="NEUTRAL">Neutro</option>
              <option value="ORDER">Ordem</option>
              <option value="CHAOS">Caos</option>
            </select>
          </div>

          <button type="submit" style={{
            padding: "12px 28px",
            background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
            color: "#1a0f05",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontWeight: 700, fontSize: 12, letterSpacing: "0.2em",
            border: 0, cursor: "pointer", borderRadius: 4,
            boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
            marginTop: 12,
          }}>CRIAR E EDITAR</button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(20,12,4,0.6)",
  border: "1px solid #5a3f1a",
  borderRadius: 3,
  color: "#fef3c7",
  fontSize: 13,
  fontFamily: "system-ui, sans-serif",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 5,
  fontSize: 10,
  color: "#8b6f3a",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  fontFamily: "var(--font-cinzel), Georgia, serif",
};
