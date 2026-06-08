export const dynamic = "force-dynamic";

import { CardFrame } from "@/app/_components/CardFrame";

export default function TesteCarta() {
  return (
    <main className="flex-1 p-8 bg-zinc-950">
      <h1 className="text-2xl text-amber-200 mb-8 text-center font-heading">Teste do CardFrame</h1>

      <div className="flex flex-wrap items-end justify-center gap-8">
        {/* Grande (preview/catalogo) */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-xs uppercase">Grande</p>
          <CardFrame
            name="Guarda de Griffenhal"
            power={2}
            rarity="COMMON"
            cardType="UNIT"
            imageUrl="/api/placeholder"
            factionName="Valtres"
            factionColor="#1e3a8a"
            size="lg"
          />
        </div>

        {/* Medio (mao/colecao) */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-xs uppercase">Medio</p>
          <CardFrame
            name="Roderic Vellhart"
            power={7}
            rarity="LEGENDARY"
            cardType="LEADER"
            imageUrl={null}
            factionName="A'Ralith"
            factionColor="#27ae60"
            size="md"
          />
        </div>

        {/* Pequeno (tabuleiro) */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-xs uppercase">Pequeno</p>
          <CardFrame
            name="Tempestade"
            power={0}
            rarity="EPIC"
            cardType="WEATHER"
            imageUrl={null}
            factionName="Kaldaey"
            factionColor="#1a5276"
            size="sm"
          />
        </div>

        {/* Pequeno com escudo */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-xs uppercase">Com escudo</p>
          <CardFrame
            name="Soldado"
            power={5}
            basePower={3}
            rarity="RARE"
            cardType="UNIT"
            imageUrl={null}
            factionName="Qadesh"
            factionColor="#c0392b"
            size="sm"
            shielded={true}
          />
        </div>
      </div>
    </main>
  );
}