export const dynamic = "force-dynamic";

// app/regras/bolsa/page.tsx
// Como funciona a Bolsa de cartas entre jogadores.

import Link from "next/link";
import { RegrasLayout, ManualSection } from "../_components/RegrasLayout";

export default async function RegrasBolsaPage() {
  return (
    <RegrasLayout
      title="A Bolsa"
      subtitle="Onde aventureiros negociam reliquias diretamente."
      maxWidth={820}
    >
      <ManualSection title="O Que e a Bolsa">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          A <strong style={{ color: "#d4a04a" }}>Bolsa</strong> e o sistema de compra e venda direta de cartas entre jogadores. Diferente do Mercado (onde voce compra boosters aleatorios), aqui voce define exatamente qual carta quer e quanto esta disposto a pagar.
        </p>
      </ManualSection>

      <ManualSection title="Vendendo Uma Carta">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.9 }}>
          <li>Acesse sua <Link href="/colecao" style={{ color: "#5dade2" }}>Tesouraria</Link> e escolha uma carta.</li>
          <li>Defina o preco de venda em moedas.</li>
          <li>A carta fica listada na Bolsa publica.</li>
          <li>Quando outro aventureiro comprar, voce recebe as moedas e a carta sai da sua colecao.</li>
        </ol>
      </ManualSection>

      <ManualSection title="Comprando Uma Carta">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.9 }}>
          <li>Acesse a <Link href="/mercado" style={{ color: "#d4a04a" }}>Bolsa</Link>.</li>
          <li>Filtre por faccao, raridade ou nome.</li>
          <li>Compre cartas oferecidas por outros aventureiros pelo preco anunciado.</li>
          <li>As moedas saem do seu patrimonio e a carta vai pra sua Tesouraria.</li>
        </ol>
      </ManualSection>

      <ManualSection title="Sobre Precos">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Os precos sao definidos livremente pelos vendedores. Uma carta lendaria rara pode valer muito mais que seu valor base; uma carta comum saturada no mercado pode ser barata. <strong style={{ color: "#c9a961" }}>O mercado se ajusta sozinho.</strong>
        </p>
      </ManualSection>

      <ManualSection title="Cancelando uma Venda">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Enquanto sua carta nao for vendida, voce pode cancelar a listagem a qualquer momento. A carta volta para sua Tesouraria sem custo.
        </p>
      </ManualSection>

      <p style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
        Para cartas raras e disputadas, veja os <Link href="/regras/leiloes" style={{ color: "#b76e5f" }}>Leiloes</Link>.
      </p>
    </RegrasLayout>
  );
}
