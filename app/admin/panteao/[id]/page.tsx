// app/admin/panteao/[id]/page.tsx
// Editor de uma divindade.

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { updateDeityAction, deleteDeityAction } from "@/lib/panteao-actions";

const prisma = new PrismaClient();

export default async function DeityEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/");

  const d = await prisma.pantheonDeity.findUnique({ where: { id } });
  if (!d) notFound();

  const updateBound = updateDeityAction.bind(null, id);
  const deleteBound = deleteDeityAction.bind(null, id);

  return (
    <main style={{ flex: 1, padding: "40px 32px", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin/panteao" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 11, color: "#8b6f3a", textDecoration: "none",
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24,
        }}>&larr; Panteao</Link>

        <h1 style={{
          margin: 0,
          fontFamily: "var(--font-cinzel), Georgia, serif",
          fontSize: 32, fontWeight: 700, letterSpacing: "0.1em",
          color: "#fcd34d",
        }}>{d.name}</h1>

        <form action={updateBound} style={{ marginTop: 24 }}>
          <FieldGroup>
            <Field label="Nome">
              <input name="name" defaultValue={d.name} required style={inputStyle} />
            </Field>
            <Field label="Slug (url)">
              <input name="slug" defaultValue={d.slug} required pattern="[a-z0-9-]+" style={inputStyle} />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field label="Dominio">
              <input name="domain" defaultValue={d.domain} required style={inputStyle} />
            </Field>
            <Field label="Simbolo (emoji/char)">
              <input name="symbol" defaultValue={d.symbol} required maxLength={4} style={{ ...inputStyle, fontSize: 22, textAlign: "center", maxWidth: 80 }} />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field label="Alinhamento">
              <select name="alignment" defaultValue={d.alignment} required style={inputStyle}>
                <option value="ORDER">Ordem</option>
                <option value="NEUTRAL">Neutro</option>
                <option value="CHAOS">Caos</option>
              </select>
            </Field>
            <Field label="Cor tematica (#hex)">
              <input name="color" defaultValue={d.color} required style={inputStyle} />
            </Field>
            <Field label="Ordem de exibicao">
              <input name="displayOrder" type="number" defaultValue={d.displayOrder} required style={{ ...inputStyle, maxWidth: 100 }} />
            </Field>
          </FieldGroup>

          <Field label="URL da imagem (vertical, ex: 1023x1537)">
            <input name="imageUrl" defaultValue={d.imageUrl ?? ""} placeholder="https://i.imgur.com/..." style={inputStyle} />
          </Field>

          <FieldGroup>
            <Field label="Citacao (quote)">
              <textarea name="quote" defaultValue={d.quote ?? ""} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="Fonte da citacao">
              <input name="quoteSource" defaultValue={d.quoteSource ?? ""} placeholder="Cantos de Beltane, Cap. II" style={inputStyle} />
            </Field>
          </FieldGroup>

          <Field label="Lore (texto principal, varios paragrafos OK)">
            <textarea name="loreText" defaultValue={d.loreText ?? ""} rows={10} style={{ ...inputStyle, resize: "vertical", fontFamily: "Georgia, serif" }} />
          </Field>

          <Field label="Devotos famosos (separados por virgula)">
            <input name="famousDevotees" defaultValue={d.famousDevotees ?? ""} placeholder="Thalyria, Casa Aldwen, Mae Mirabella" style={inputStyle} />
          </Field>

          <Field label="">
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input name="isPublished" type="checkbox" defaultChecked={d.isPublished} />
              <span>Publicado (visivel em /panteao)</span>
            </label>
          </Field>

          <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center" }}>
            <button type="submit" style={{
              padding: "12px 28px",
              background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
              color: "#1a0f05",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontWeight: 700, fontSize: 12, letterSpacing: "0.2em",
              border: 0, cursor: "pointer", borderRadius: 4,
              boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
            }}>SALVAR</button>
          </div>
        </form>

        <form action={deleteBound} style={{ marginTop: 40, paddingTop: 20, borderTop: "1px dashed #3d3022" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#8b6f3a", letterSpacing: "0.3em", textTransform: "uppercase" }}>Zona Vermelha</p>
          <button type="submit" style={{
            padding: "8px 18px",
            background: "transparent",
            color: "#c0392b",
            border: "1px solid #c0392b55",
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontWeight: 600, fontSize: 11, letterSpacing: "0.2em",
            cursor: "pointer", borderRadius: 4,
          }}>EXCLUIR DEFINITIVAMENTE</button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      {label && (
        <label style={{
          display: "block",
          marginBottom: 5,
          fontSize: 10,
          color: "#8b6f3a",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontFamily: "var(--font-cinzel), Georgia, serif",
        }}>{label}</label>
      )}
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{children}</div>;
}
