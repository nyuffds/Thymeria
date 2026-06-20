// app/api/settings/public/route.ts
// Settings publicos (gameName, gameSubtitle, landingBackgroundUrl, tagline).
// Usado pela tela de login.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
    select: {
      gameName: true,
      gameSubtitle: true,
      landingTagline: true,
      landingBackgroundUrl: true,
      themePrimaryColor: true,
    },
  });
  return NextResponse.json({ settings });
}
