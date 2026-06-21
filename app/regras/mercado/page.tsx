// app/regras/mercado/page.tsx
// Como funciona o Mercado do Eitri.

import Link from "next/link";
import { RegrasLayout, ManualSection } from "../_components/RegrasLayout";

export default async function RegrasMercadoPage() {
  return (
    <RegrasLayout
      title="Mercado do Eitri"
      subtitle="Anoes do norte forjam pacotes raros pra aventureiros corajosos."
      maxWidth={820}
    >
      <ManualSection title="O Que e o Mercado">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          O <strong style={{ color: "#e67e22" }}>Mercado do Eitri</strong> e onde voce compra <strong style={{ color: "#c9a961" }}>boosters</strong> selados com cartas aleatorias. Cada booster custa uma quantia em moedas de campanha e contem um numero variavel de cartas conforme suas regras.
        </p>
      </ManualSection>

      <ManualSection title="Como Comprar">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.9 }}>
          <li>Acesse <Link href="/loja" style={{ color: "#e67e22" }}>Mercado</Link> pela barra lateral.</li>
          <li>Escolha um booster - cada um tem descricao, preco e quantidade de cartas.</li>
          <li>Confirme a compra. As moedas sao descontadas do seu patrimonio.</li>
          <li>O booster selado vai para sua <Link href="/estante" style={{ color: "#b76e5f" }}>Estante</Link>.</li>
          <li>Abra o booster quando quiser - as cartas reveladas entram na sua <Link href="/colecao" style={{ color: "#5dade2" }}>Tesouraria</Link>.</li>
        </ol>
      </ManualSection>

      <ManualSection title="Boosters Selados">
        <p style={{ margin: "0 0 12px", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Boosters comprados nao sao abertos automaticamente. Ficam selados na Estante ate voce decidir abri-los. Isso permite acumular pacotes pra abertura em sequencia ou guardar pra eventos especiais.
        </p>
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#8b6f3a", lineHeight: 1.6 }}>
          Boosters selados nao podem ser revendidos nem transferidos.
        </p>
      </ManualSection>

      <ManualSection title="Pity System">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Alguns boosters possuem garantia de raridade minima. O sistema acompanha quantos pacotes voce abriu sem receber uma carta rara o suficiente e garante uma na proxima abertura. Os limites variam por tipo de booster.
        </p>
      </ManualSection>

      <p style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
        Procurando cartas especificas? Veja a <Link href="/regras/bolsa" style={{ color: "#d4a04a" }}>Bolsa</Link> ou os <Link href="/regras/leiloes" style={{ color: "#b76e5f" }}>Leiloes</Link>.
      </p>
    </RegrasLayout>
  );
}
