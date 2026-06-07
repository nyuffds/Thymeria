// app/providers.tsx
// Wrapper client-side que disponibiliza a sessão do NextAuth para toda a árvore React.

"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}