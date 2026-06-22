// lib/panteao-actions.ts
// Server actions para CRUD de divindades do panteao.

"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const prisma = new PrismaClient();

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!me || me.role !== "ADMIN") throw new Error("Permissao negada. Apenas o Conselho pode editar o Panteao.");
  return me;
}

export async function createDeityAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const alignment = String(formData.get("alignment") ?? "NEUTRAL").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "✦").trim();

  if (!slug || !name || !domain) throw new Error("Slug, nome e dominio sao obrigatorios.");
  if (!["ORDER", "NEUTRAL", "CHAOS"].includes(alignment)) throw new Error("Alinhamento invalido.");

  const exists = await prisma.pantheonDeity.findUnique({ where: { slug } });
  if (exists) throw new Error("Ja existe uma divindade com este slug.");

  const maxOrder = await prisma.pantheonDeity.aggregate({ _max: { displayOrder: true } });
  const next = (maxOrder._max.displayOrder ?? 0) + 1;

  const deity = await prisma.pantheonDeity.create({
    data: { slug, name, alignment, domain, symbol, displayOrder: next, color: "#c9a961" },
  });

  revalidatePath("/admin/panteao");
  revalidatePath("/panteao");
  redirect(`/admin/panteao/${deity.id}`);
}

export async function updateDeityAction(id: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const alignment = String(formData.get("alignment") ?? "NEUTRAL").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "✦").trim();
  const color = String(formData.get("color") ?? "#c9a961").trim();
  const quote = String(formData.get("quote") ?? "").trim() || null;
  const quoteSource = String(formData.get("quoteSource") ?? "").trim() || null;
  const loreText = String(formData.get("loreText") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const famousDevotees = String(formData.get("famousDevotees") ?? "").trim() || null;
  const isPublished = formData.get("isPublished") === "on";
  const displayOrderRaw = Number(formData.get("displayOrder") ?? 0);
  const displayOrder = Number.isFinite(displayOrderRaw) ? displayOrderRaw : 0;

  if (!name || !slug || !domain) throw new Error("Slug, nome e dominio sao obrigatorios.");
  if (!["ORDER", "NEUTRAL", "CHAOS"].includes(alignment)) throw new Error("Alinhamento invalido.");

  await prisma.pantheonDeity.update({
    where: { id },
    data: {
      name, slug, alignment, domain, symbol, color,
      quote, quoteSource, loreText, imageUrl, famousDevotees,
      isPublished, displayOrder,
    },
  });

  revalidatePath("/admin/panteao");
  revalidatePath(`/admin/panteao/${id}`);
  revalidatePath("/panteao");
}

export async function deleteDeityAction(id: string) {
  await requireAdmin();
  await prisma.pantheonDeity.delete({ where: { id } });
  revalidatePath("/admin/panteao");
  revalidatePath("/panteao");
  redirect("/admin/panteao");
}

export async function seedDeitiesAction() {
  await requireAdmin();
  const existing = await prisma.pantheonDeity.count();
  if (existing > 0) throw new Error("Panteao ja foi populado. Apague tudo antes de re-popular.");

  const seed = [
    { slug: "morrigan", name: "Morrigan", alignment: "NEUTRAL", domain: "Guerra e Profecia",       symbol: "🜃", color: "#a89070", displayOrder: 1 },
    { slug: "skanda",   name: "Skanda",   alignment: "ORDER",   domain: "Ordem e Lanca Divina",    symbol: "🜂", color: "#5dade2", displayOrder: 2 },
    { slug: "lugh",     name: "Lugh",     alignment: "ORDER",   domain: "Sol, Artesanato e Luz",   symbol: "☀", color: "#fcd34d",  displayOrder: 3 },
    { slug: "eitri",    name: "Eitri",    alignment: "ORDER",   domain: "Forja e Tesouros",        symbol: "⚒", color: "#b76e5f",  displayOrder: 4 },
    { slug: "aine",     name: "Aine",     alignment: "ORDER",   domain: "Verao e Amor",            symbol: "🌸", color: "#e67e22", displayOrder: 5 },
    { slug: "diana",    name: "Diana",    alignment: "NEUTRAL", domain: "Caca e Lua",              symbol: "🌙", color: "#d3c89a", displayOrder: 6 },
    { slug: "kali",     name: "Kali",     alignment: "NEUTRAL", domain: "Tempo e Destruicao",      symbol: "🗡", color: "#8e44ad",  displayOrder: 7 },
    { slug: "eris",     name: "Eris",     alignment: "CHAOS",   domain: "Discordia e Caos",        symbol: "🜄", color: "#c0392b", displayOrder: 8 },
    { slug: "typhon",   name: "Typhon",   alignment: "CHAOS",   domain: "Tempestades e Abismos",   symbol: "🜁", color: "#34495e", displayOrder: 9 },
    { slug: "nergal",   name: "Nergal",   alignment: "CHAOS",   domain: "Pragas e Sombras",        symbol: "☠", color: "#5f5340",  displayOrder: 10 },
    { slug: "azmedan",  name: "Azmedan",  alignment: "CHAOS",   domain: "Pactos e Dividas",        symbol: "❦", color: "#b76e5f",  displayOrder: 11 },
  ];

  for (const d of seed) {
    await prisma.pantheonDeity.create({ data: d });
  }

  revalidatePath("/admin/panteao");
  revalidatePath("/panteao");
}
