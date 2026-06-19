"use client";

import { CardPreview } from "@/app/components/CardPreview";
import type { CardPreviewData } from "@/app/components/CardPreview";

interface Props {
  card: CardPreviewData | null;
  onClose: () => void;
}

export function CardModal({ card, onClose }: Props) {
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <CardPreview card={card} size="large" />
        </div>
        <button
          onClick={onClose}
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}