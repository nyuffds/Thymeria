// app/admin/faccoes/nova/page.tsx
import Link from "next/link";
import { FactionForm } from "../_components/FactionForm";

export default function NovaFaccaoPage() {
  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin/faccoes" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Facções
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-6">Nova Facção</h1>
      <FactionForm mode="create" />
    </main>
  );
}