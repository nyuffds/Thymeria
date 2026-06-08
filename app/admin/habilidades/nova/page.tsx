export const dynamic = "force-dynamic";

// app/admin/habilidades/nova/page.tsx
import Link from "next/link";
import { AbilityForm } from "../_components/AbilityForm";

export default function NovaHabilidadePage() {
  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/habilidades" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Habilidades
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">Nova Habilidade</h1>
      <AbilityForm mode="create" />
    </main>
  );
}