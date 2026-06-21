export const dynamic = "force-dynamic";

// app/regras/leiloes/page.tsx
// Como funcionam os Leiloes.

import Link from "next/link";
import { RegrasLayout, ManualSection } from "../_components/RegrasLayout";

export default async function RegrasLeiloesPage() {
  return (
    <RegrasLayout
      title="Os Leiloes"
      subtitle="Quando o preco fixo nao basta, os lances decidem."
      maxWidth={820}
    >
      <ManualSection title="O Que sao os Leiloes">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Os <strong style={{ color: "#b76e5f" }}>Leiloes</strong> sao a forma mais teatral de adquirir cartas raras. Em vez de comprar por preco fixo, os aventureiros disputam em lances crescentes ate o tempo se esgotar.
        </p>
      </ManualSection>

      <ManualSection title="Criando um Leilao">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.9 }}>
          <li>Escolha uma carta da sua <Link href="/colecao" style={{ color: "#5dade2" }}>Tesouraria</Link>.</li>
          <li>Defina o lance minimo e a duracao do leilao.</li>
          <li>A carta fica listada nos <Link href="/leiloes" style={{ color: "#b76e5f" }}>Leiloes</Link> publicos.</li>
          <li>Quando o tempo expirar, o maior lance leva.</li>
        </ol>
      </ManualSection>

      <ManualSection title="Dando um Lance">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.9 }}>
          <li>Acesse os Leiloes ativos.</li>
          <li>Cada lance precisa ser maior que o atual.</li>
          <li>Suas moedas ficam <strong style={{ color: "#c9a961" }}>reservadas</strong> enquanto voce e o maior lance.</li>
          <li>Se outro aventureiro superar seu lance, suas moedas sao liberadas automaticamente.</li>
        </ol>
      </ManualSection>

      <ManualSection title="Resolucao">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Quando o tempo se esgota: o maior lance vence. As moedas sao transferidas para o vendedor e a carta vai para a Tesouraria do vencedor. Se nao houver lances, a carta volta para o vendedor sem custos.
        </p>
      </ManualSection>

      <ManualSection title="Snipping Protection">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Se um lance for dado nos minutos finais, o tempo restante e <strong style={{ color: "#c9a961" }}>estendido</strong> para dar chance de contra-lance. Garante leiloes justos sem sniper de ultimo segundo.
        </p>
      </ManualSection>

      <p style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
        Para vendas com preco fixo, prefira a <Link href="/regras/bolsa" style={{ color: "#d4a04a" }}>Bolsa</Link>.
      </p>
    </RegrasLayout>
  );
}
