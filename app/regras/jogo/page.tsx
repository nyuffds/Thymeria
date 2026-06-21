export const dynamic = "force-dynamic";

// app/regras/jogo/page.tsx
// Como jogar - regras basicas.

import Link from "next/link";
import { RegrasLayout, ManualSection } from "../_components/RegrasLayout";

export default async function RegrasJogoPage() {
  return (
    <RegrasLayout title="Como Jogar" subtitle="Aprenda as regras basicas do duelo.">

      <ManualSection title="Objetivo">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Vencer <strong style={{ color: "#c9a961" }}>2 das 3 rondas</strong>. Em cada ronda, voce e seu oponente jogam cartas no tabuleiro. Quem tiver mais poder total quando ambos passarem ganha a ronda.
        </p>
      </ManualSection>

      <ManualSection title="As Fileiras">
        <p style={{ margin: "0 0 12px", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          O tabuleiro tem 3 fileiras de cada lado:
        </p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.8 }}>
          <li><strong style={{ color: "#c9a961" }}>Vanguarda (Corpo-a-corpo):</strong> linha da frente.</li>
          <li><strong style={{ color: "#c9a961" }}>Distancia:</strong> linha intermediaria.</li>
          <li><strong style={{ color: "#c9a961" }}>Cerco:</strong> linha de retaguarda.</li>
        </ul>
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#8b6f3a", lineHeight: 1.6 }}>
          Cada carta so pode ser jogada em fileiras especificas, indicadas em sua descricao.
        </p>
      </ManualSection>

      <ManualSection title="Estrutura da Partida">
        <ol style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.8 }}>
          <li><strong style={{ color: "#c9a961" }}>Inicio:</strong> ambos recebem 10 cartas. Voce pode trocar ate 3 cartas na primeira ronda (Redraw).</li>
          <li><strong style={{ color: "#c9a961" }}>Turnos:</strong> os jogadores alternam jogando uma carta por vez. Voce pode passar quando quiser. Quem passou nao pode mais jogar nessa ronda.</li>
          <li><strong style={{ color: "#c9a961" }}>Fim de ronda:</strong> quando os dois passarem, soma-se o poder total. Quem tiver mais ganha a ronda. Em caso de empate, ambos vencem.</li>
          <li><strong style={{ color: "#c9a961" }}>Nova ronda:</strong> as cartas no tabuleiro vao pro cemiterio, novos Redraws (2 na ronda 2, 1 na ronda 3), e quem perdeu a ronda anterior comeca.</li>
          <li><strong style={{ color: "#c9a961" }}>Vitoria:</strong> quem ganhar 2 rondas primeiro vence a partida.</li>
        </ol>
      </ManualSection>

      <ManualSection title="O Lider">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Cada deck tem um Lider, que pode ser <strong style={{ color: "#c9a961" }}>Persistente</strong> (ja entra no tabuleiro no inicio da partida) ou <strong style={{ color: "#c9a961" }}>Ativo</strong> (uma habilidade que voce pode ativar uma vez por partida).
        </p>
      </ManualSection>

      <ManualSection title="Cartas Elite">
        <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 16, color: "#d3c89a", lineHeight: 1.7 }}>
          Cartas marcadas como <strong style={{ color: "#fbbf24" }}>⚜ Elite</strong> sao imunes a danos, boosts, climas e qualquer outro efeito. Elas mantem seu poder base inalterado durante toda a partida.
        </p>
      </ManualSection>

      <ManualSection title="Tipos de Carta">
        <ul style={{ margin: 0, paddingLeft: 24, fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 15, color: "#d3c89a", lineHeight: 1.8 }}>
          <li><strong style={{ color: "#34d399" }}>Unidade:</strong> contribui com poder no tabuleiro.</li>
          <li><strong style={{ color: "#c9a961" }}>Especial:</strong> ativa efeito ao ser jogada (pode ficar ou nao no tabuleiro).</li>
          <li><strong style={{ color: "#6ab1ff" }}>Clima:</strong> aplica climas. Vai pro descarte apos uso.</li>
          <li><strong style={{ color: "#fbbf24" }}>Lider:</strong> unico do deck.</li>
        </ul>
      </ManualSection>

      <p style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#5f5340" }}>
        Para entender efeitos especificos das suas cartas, consulte{" "}
        <Link href="/regras/cartas" style={{ color: "#c9a961" }}>Suas Cartas</Link>
        {" e "}
        <Link href="/regras/habilidades" style={{ color: "#c9a961" }}>Habilidades</Link>.
      </p>
    </RegrasLayout>
  );
}
