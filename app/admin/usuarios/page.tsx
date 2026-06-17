import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { UsersManager } from "./_components/UsersManager";

const prisma = new PrismaClient();

export default async function AdminUsuariosPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const me = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!me || me.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      role: true,
      coins: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
        &larr; Painel
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Usuarios</h1>
      <p className="text-zinc-400 mb-6">Criar usuarios, gerenciar roles e resetar senhas.</p>

      <UsersManager
        currentUserId={me.id}
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          coins: u.coins,
          hasPassword: !!u.passwordHash,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}