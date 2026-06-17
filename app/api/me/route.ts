// app/api/me/route.ts
// Retorna informações do usuário logado, incluindo saldo.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.name) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, username: true, role: true, coins: true },
  });

  return NextResponse.json({ user });
}