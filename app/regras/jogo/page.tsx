import Link from "next/link";

export default function RegrasJogoPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <nav className="mb-6">
        <Link href="/regras" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Manual"}
        </Link>
      </nav>

      <header className="mb-8">
        <p className="text-xs text-amber-500 uppercase tracking-[0.3em] mb-2">Manual</p>
        <h1 className="text-3xl font-bold font-heading text-amber-200">Como Jogar</h1>
      </header>

      <article className="prose prose-invert max-w-none space-y-6 text-zinc-300">
        <section>
          <h2 className="text-xl font-heading text-amber-200">Objetivo</h2>
          <p>
            Vencer 2 das 3 rondas. Em cada ronda, voce e seu oponente jogam cartas no tabuleiro. Quem tiver mais
            poder total quando ambos passarem ganha a ronda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-amber-200">As fileiras</h2>
          <p>O tabuleiro tem 3 fileiras de cada lado:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-amber-300">Vanguarda (Corpo-a-corpo):</strong> linha da frente.</li>
            <li><strong className="text-amber-300">Distancia:</strong> linha intermediaria.</li>
            <li><strong className="text-amber-300">Cerco:</strong> linha de retaguarda.</li>
          </ul>
          <p>Cada carta so pode ser jogada em fileiras especificas (indicadas em sua descricao).</p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-amber-200">Estrutura da partida</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong className="text-amber-300">Inicio:</strong> ambos recebem 10 cartas. Voce pode trocar ate 2 cartas
              na primeira ronda (Redraw).
            </li>
            <li>
              <strong className="text-amber-300">Turnos:</strong> os jogadores alternam jogando uma carta por vez.
              Voce pode passar quando quiser. Quem passou nao pode mais jogar nessa ronda.
            </li>
            <li>
              <strong className="text-amber-300">Fim de ronda:</strong> quando os dois passarem, soma-se o poder total.
              Quem tiver mais ganha a ronda. Em caso de empate, ambos vencem.
            </li>
            <li>
              <strong className="text-amber-300">Nova ronda:</strong> as cartas no tabuleiro vao pro cemiterio,
              novos Redraws (1 na ronda 2, 0 na ronda 3), e quem perdeu a ronda anterior comeca.
            </li>
            <li>
              <strong className="text-amber-300">Vitoria:</strong> quem ganhar 2 rondas primeiro vence a partida.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-heading text-amber-200">O Lider</h2>
          <p>
            Cada deck tem um Lider, que pode ser <strong className="text-amber-300">Persistente</strong> (ja entra no
            tabuleiro no inicio da partida) ou <strong className="text-amber-300">Ativo</strong> (uma habilidade que voce
            pode ativar uma vez por partida).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-amber-200">Cartas Elite</h2>
          <p>
            Cartas marcadas como Elite sao imunes a danos, boosts, climas e qualquer outro efeito. Elas mantem seu
            poder base inalterado durante toda a partida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-amber-200">Tipos de carta</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-amber-300">Unidade:</strong> contribui com poder no tabuleiro.</li>
            <li><strong className="text-amber-300">Especial:</strong> ativa efeito ao ser jogada (pode ficar ou nao no tabuleiro).</li>
            <li><strong className="text-amber-300">Clima:</strong> aplica climas. Vai pro descarte apos uso.</li>
            <li><strong className="text-amber-300">Lider:</strong> unico do deck.</li>
          </ul>
        </section>

        <section>
          <p className="text-zinc-500 text-sm italic">
            Para entender efeitos especificos das suas cartas, consulte <Link href="/regras/cartas" className="text-amber-300 hover:text-amber-200">Suas Cartas</Link> e <Link href="/regras/habilidades" className="text-amber-300 hover:text-amber-200">Habilidades</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}