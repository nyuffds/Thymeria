"use client";

// Esqueleto layout-only para a Etapa 1 do refator do tabuleiro.
// Renderiza placeholders em todas as regioes da arte de fundo.

type Props = {
  matchId: string;
};

export function MatchTableV2Skeleton(_props: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px", background: "#0c0a08", minHeight: "100vh" }}>
      <div
        style={{
          position: "relative",
          width: "1400px",
          maxWidth: "100%",
          aspectRatio: "3 / 2",
          backgroundImage: "url('/board.jpg')",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Placar dos jogadores no topo */}
        <Region pos={{ top: "2.8%", left: "30.3%", width: "9.7%", height: "5.5%" }} label="Placar A" />
        <Region pos={{ top: "2.8%", left: "60%", width: "9.7%", height: "5.5%" }} label="Placar B" />

        {/* Player A - esquerda superior */}
        <Region pos={{ top: "8.5%", left: "6.1%", width: "9.8%", height: "17%" }} label="Lider A" />
        <Region pos={{ top: "30.6%", left: "3.1%", width: "5.8%", height: "14.2%" }} label="Deck A" />
        <Region pos={{ top: "34%", left: "10.9%", width: "4%", height: "4.5%" }} label="Qtd Deck A" />
        <Region pos={{ top: "43.5%", left: "13%", width: "2%", height: "4.5%" }} label="Cem A" />

        {/* Player B - esquerda inferior */}
        <Region pos={{ top: "58.6%", left: "6.1%", width: "9.7%", height: "17%" }} label="Lider B" />
        <Region pos={{ top: "80.2%", left: "3.1%", width: "5.7%", height: "13.8%" }} label="Deck B" />
        <Region pos={{ top: "83.5%", left: "10.9%", width: "4%", height: "4.5%" }} label="Qtd Deck B" />
        <Region pos={{ top: "93%", left: "13%", width: "1.8%", height: "4%" }} label="Cem B" />

        {/* Pontos por fileira - lado esquerdo (player A) */}
        <Region pos={{ top: "20%", left: "22.6%", width: "4%", height: "4%" }} label="Pts A Siege" />
        <Region pos={{ top: "40.5%", left: "22.6%", width: "4%", height: "4%" }} label="Pts A Ranged" />
        <Region pos={{ top: "61.5%", left: "22.6%", width: "4%", height: "4%" }} label="Pts A Melee" />

        {/* Cartas - 3 fileiras x 2 lados */}
        <Region pos={{ top: "9.5%", left: "27.5%", width: "23%", height: "21%" }} label="CERCO A" />
        <Region pos={{ top: "9.5%", left: "52.8%", width: "22.4%", height: "21%" }} label="CERCO B" />
        <Region pos={{ top: "31%", left: "27.5%", width: "23%", height: "21%" }} label="DIST A" />
        <Region pos={{ top: "31%", left: "52.8%", width: "22.4%", height: "21%" }} label="DIST B" />
        <Region pos={{ top: "52.5%", left: "27.5%", width: "23%", height: "21%" }} label="MELEE A" />
        <Region pos={{ top: "52.5%", left: "52.8%", width: "22.4%", height: "21%" }} label="MELEE B" />

        {/* Pontos por fileira - lado direito (player B) */}
        <Region pos={{ top: "20%", left: "75.3%", width: "4%", height: "4%" }} label="Pts B Siege" />
        <Region pos={{ top: "40.5%", left: "75.3%", width: "4%", height: "4%" }} label="Pts B Ranged" />
        <Region pos={{ top: "61.5%", left: "75.3%", width: "4%", height: "4%" }} label="Pts B Melee" />

        {/* Mao do jogador */}
        <Region pos={{ top: "77.2%", left: "21.3%", width: "59.3%", height: "19.5%" }} label="Mao do Jogador" />

        {/* Historico e clima - direita */}
        <Region pos={{ top: "8.5%", left: "83.2%", width: "14.8%", height: "41%" }} label="Historico" />
        <Region pos={{ top: "59.5%", left: "83.2%", width: "14.8%", height: "36.5%" }} label="Clima / Efeitos" />
      </div>
    </div>
  );
}

function Region({ pos, label }: { pos: { top: string; left: string; width: string; height: string }; label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        height: pos.height,
        border: "2px dashed rgba(255, 80, 80, 0.85)",
        background: "rgba(0, 0, 0, 0.20)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "11px",
        color: "#f0d49a",
        padding: "4px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {label}
    </div>
  );
}