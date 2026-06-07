// auth.ts
// Configuração central do NextAuth v5 (Auth.js).
// Exporta { auth, handlers, signIn, signOut } usados em toda a aplicação.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        // Primeiro acesso: ainda sem senha definida.
        // Bloqueamos login até o jogador definir uma senha em /definir-senha.
        if (!user.passwordHash) return null;

        if (!password) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Injeta role no JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    // Expõe role na sessão pro client/server
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});