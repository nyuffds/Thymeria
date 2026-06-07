// app/api/auth/[...nextauth]/route.ts
// Expõe os endpoints HTTP do NextAuth (/api/auth/signin, /api/auth/signout, /api/auth/session, etc.)

import { handlers } from "@/auth";

export const { GET, POST } = handlers;