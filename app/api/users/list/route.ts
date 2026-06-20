// app/api/users/list/route.ts
// Lista publica de usernames (somente nomes, sem dados sensiveis).
// Usado pelo dropdown de login estilo Foundry.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { username: true },
    orderBy: { username: "asc" },
  });
  return NextResponse.json({ users: users.map((u) => u.username) });
}
