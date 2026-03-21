import { useMemo, useState } from "react";

interface CardPlayer {
  player: string;
  team?: string;
  minute: number;
}

interface CardMatch {
  round: number;
  home: string;
  away: string;
  date: string;
  match_url?: string;
  yellow_cards: CardPlayer[];
  red_cards: CardPlayer[];
}

interface CardsViewProps {
  cardsData: CardMatch[];
  selectedRound: number;
  selectedTeamFilter: string;
  isMobile: boolean;
}

export function CardsView({ cardsData, selectedRound, selectedTeamFilter, isMobile }: CardsViewProps) {
  const [disciplinaryScope, setDisciplinaryScope] = useState<"season" | "round">("season");

  const filteredCards = useMemo(() => {
    let roundCards = cardsData.filter((m) => m.round === selectedRound);
    
    if (selectedTeamFilter !== "Összes csapat") {
      roundCards = roundCards.filter((m) => m.home === selectedTeamFilter || m.away === selectedTeamFilter);
    }
    
    return roundCards;
  }, [cardsData, selectedRound, selectedTeamFilter]);

  const disciplinaryCards = useMemo(() => {
    let scopedCards = disciplinaryScope === "season" ? cardsData : cardsData.filter((m) => m.round === selectedRound);

    if (selectedTeamFilter !== "Összes csapat") {
      scopedCards = scopedCards.filter((m) => m.home === selectedTeamFilter || m.away === selectedTeamFilter);
    }

    return scopedCards;
  }, [cardsData, disciplinaryScope, selectedRound, selectedTeamFilter]);

  const disciplinaryStats = useMemo(() => {
    const teamYellowCards = new Map<string, number>();
    const teamRedCards = new Map<string, number>();

    for (const match of disciplinaryCards) {
      for (const card of match.yellow_cards) {
        const team = card.team || (match.home.includes(card.player) ? match.home : match.away);
        teamYellowCards.set(team, (teamYellowCards.get(team) || 0) + 1);
      }

      for (const card of match.red_cards) {
        const team = card.team || (match.home.includes(card.player) ? match.home : match.away);
        teamRedCards.set(team, (teamRedCards.get(team) || 0) + 1);
      }
    }

    return Array.from(new Set([...teamYellowCards.keys(), ...teamRedCards.keys()]))
      .map((team) => {
        const yellow = teamYellowCards.get(team) || 0;
        const red = teamRedCards.get(team) || 0;
        return {
          team,
          yellow,
          red,
          points: yellow + red * 3,
        };
      })
      .sort((a, b) => b.points - a.points || b.red - a.red || b.yellow - a.yellow || a.team.localeCompare(b.team, "hu"));
  }, [disciplinaryCards]);

  const cardsStats = useMemo(() => {
    const teamYellowCards = new Map<string, number>();
    const teamRedCards = new Map<string, number>();
    const playerYellowCards = new Map<string, { count: number; team: string }>();
    const playerRedCards = new Map<string, { count: number; team: string }>();

    for (const match of filteredCards) {
      // Sárga lapok
      for (const card of match.yellow_cards) {
        const team = card.team || (match.home.includes(card.player) ? match.home : match.away);
        teamYellowCards.set(team, (teamYellowCards.get(team) || 0) + 1);
        
        const existing = playerYellowCards.get(card.player);
        if (existing) {
          existing.count += 1;
        } else {
          playerYellowCards.set(card.player, { count: 1, team });
        }
      }

      // Piros lapok
      for (const card of match.red_cards) {
        const team = card.team || (match.home.includes(card.player) ? match.home : match.away);
        teamRedCards.set(team, (teamRedCards.get(team) || 0) + 1);
        
        const existing = playerRedCards.get(card.player);
        if (existing) {
          existing.count += 1;
        } else {
          playerRedCards.set(card.player, { count: 1, team });
        }
      }
    }

    return {
      teamYellowCards: Array.from(teamYellowCards.entries()).map(([team, count]) => ({ team, count }))
        .sort((a, b) => b.count - a.count),
      teamRedCards: Array.from(teamRedCards.entries()).map(([team, count]) => ({ team, count }))
        .sort((a, b) => b.count - a.count),
      playerYellowCards: Array.from(playerYellowCards.entries()).map(([player, data]) => ({ player, ...data }))
        .sort((a, b) => b.count - a.count || a.player.localeCompare(b.player, "hu")),
      playerRedCards: Array.from(playerRedCards.entries()).map(([player, data]) => ({ player, ...data }))
        .sort((a, b) => b.count - a.count || a.player.localeCompare(b.player, "hu")),
    };
  }, [filteredCards]);

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: isMobile ? "12px" : "16px",
    marginBottom: "14px",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  };

  const headerStyle = {
    fontSize: isMobile ? "16px" : "18px",
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#111827",
  };

  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "20px",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: isMobile ? "14px" : "15px",
  };

  const thStyle = {
    backgroundColor: "#f3f4f6",
    padding: isMobile ? "8px" : "10px",
    textAlign: "left" as const,
    fontWeight: "bold",
    borderBottom: "2px solid #e5e7eb",
  };

  const tdStyle = {
    padding: isMobile ? "8px" : "10px",
    borderBottom: "1px solid #e5e7eb",
  };

  const yellowCardStyle = {
    display: "inline-block",
    width: "12px",
    height: "16px",
    backgroundColor: "#fbbf24",
    borderRadius: "2px",
    marginRight: "6px",
    verticalAlign: "middle",
  };

  const disciplinaryCardStyle = {
    ...cardStyle,
    background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
    border: "1px solid #fed7aa",
  };

  const redCardStyle = {
    display: "inline-block",
    width: "12px",
    height: "16px",
    backgroundColor: "#ef4444",
    borderRadius: "2px",
    marginRight: "6px",
    verticalAlign: "middle",
  };

  if (filteredCards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
        <div style={{ fontSize: "18px", marginBottom: "8px" }}>Nincsenek adatok</div>
        <div>A kiválasztott fordulóban vagy csapatnál nincsenek lapok rögzítve.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={disciplinaryCardStyle}>
        <h3 style={headerStyle}>🟥🟨 Fegyelmi index</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: isMobile ? "13px" : "14px", color: "#4b5563" }}>
            Pontozás: sárga = 1, piros = 3
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setDisciplinaryScope("season")}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: disciplinaryScope === "season" ? "1px solid #ea580c" : "1px solid #d1d5db",
                backgroundColor: disciplinaryScope === "season" ? "#ffedd5" : "#ffffff",
                color: disciplinaryScope === "season" ? "#9a3412" : "#374151",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Összesített
            </button>
            <button
              type="button"
              onClick={() => setDisciplinaryScope("round")}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: disciplinaryScope === "round" ? "1px solid #ea580c" : "1px solid #d1d5db",
                backgroundColor: disciplinaryScope === "round" ? "#ffedd5" : "#ffffff",
                color: disciplinaryScope === "round" ? "#9a3412" : "#374151",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {selectedRound}. forduló
            </button>
          </div>
        </div>

        <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280", marginBottom: "12px" }}>
          {disciplinaryScope === "season"
            ? selectedTeamFilter === "Összes csapat"
              ? "Az összes forduló összesített fegyelmi pontjai alapján."
              : `${selectedTeamFilter} összes fordulós meccsei alapján.`
            : selectedTeamFilter === "Összes csapat"
            ? `Csak a ${selectedRound}. forduló alapján.`
            : `Csak a ${selectedRound}. forduló ${selectedTeamFilter} meccsei alapján.`}
        </div>

        {disciplinaryStats.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Csapat</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Index</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sárga</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Piros</th>
              </tr>
            </thead>
            <tbody>
              {disciplinaryStats.map(({ team, points, yellow, red }, index) => (
                <tr key={team}>
                  <td style={{ ...tdStyle, width: "44px", fontWeight: "bold" }}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: index === 0 ? "bold" : 600 }}>{team}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold", color: "#b45309" }}>{points}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{yellow}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{red}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "16px" }}>
        {selectedTeamFilter === "Összes csapat"
          ? `${selectedRound}. forduló lapjai`
          : `${selectedRound}. forduló – ${selectedTeamFilter} lapjai`}
      </h2>

      {/* Statisztikák */}
      <div style={statsGridStyle}>
        {/* Csapat statisztikák */}
        <div style={cardStyle}>
          <h3 style={headerStyle}>Csapat statisztikák</h3>
          
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#f59e0b" }}>
              <span style={yellowCardStyle}></span>Sárga lapok ({cardsStats.teamYellowCards.reduce((sum, { count }) => sum + count, 0)})
            </h4>
            {cardsStats.teamYellowCards.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Csapat</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Db</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsStats.teamYellowCards.map(({ team, count }) => (
                    <tr key={team}>
                      <td style={tdStyle}>{team}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#dc2626" }}>
              <span style={redCardStyle}></span>Piros lapok ({cardsStats.teamRedCards.reduce((sum, { count }) => sum + count, 0)})
            </h4>
            {cardsStats.teamRedCards.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Csapat</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Db</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsStats.teamRedCards.map(({ team, count }) => (
                    <tr key={team}>
                      <td style={tdStyle}>{team}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Játékos statisztikák */}
        <div style={cardStyle}>
          <h3 style={headerStyle}>Játékos statisztikák</h3>
          
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#f59e0b" }}>
              <span style={yellowCardStyle}></span>Sárga lapok ({cardsStats.playerYellowCards.length})
            </h4>
            {cardsStats.playerYellowCards.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Játékos</th>
                    <th style={thStyle}>Csapat</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Db</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsStats.playerYellowCards.slice(0, 10).map(({ player, team, count }) => (
                    <tr key={player}>
                      <td style={tdStyle}>{player}</td>
                      <td style={tdStyle}>{team}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#dc2626" }}>
              <span style={redCardStyle}></span>Piros lapok ({cardsStats.playerRedCards.length})
            </h4>
            {cardsStats.playerRedCards.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Játékos</th>
                    <th style={thStyle}>Csapat</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Db</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsStats.playerRedCards.slice(0, 10).map(({ player, team, count }) => (
                    <tr key={player}>
                      <td style={tdStyle}>{player}</td>
                      <td style={tdStyle}>{team}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Meccsenkénti bontás */}
      <div>
        <h3 style={headerStyle}>Meccsenkénti bontás</h3>
        {filteredCards.map((match, index) => (
          <div key={index} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", fontSize: isMobile ? "15px" : "16px" }}>
                {match.home} - {match.away}
              </div>
              <div style={{ color: "#6b7280", fontSize: isMobile ? "13px" : "14px" }}>
                {match.date}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "16px" }}>
              {/* Sárga lapok */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#f59e0b" }}>
                  <span style={yellowCardStyle}></span>Sárga lapok ({match.yellow_cards.length})
                </h4>
                {match.yellow_cards.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {match.yellow_cards.map((card, idx) => (
                      <div key={idx} style={{ fontSize: "14px", display: "flex", justifyContent: "space-between" }}>
                        <span>{card.player}</span>
                        <span style={{ color: "#6b7280" }}>{card.minute}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Piros lapok */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#dc2626" }}>
                  <span style={redCardStyle}></span>Piros lapok ({match.red_cards.length})
                </h4>
                {match.red_cards.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {match.red_cards.map((card, idx) => (
                      <div key={idx} style={{ fontSize: "14px", display: "flex", justifyContent: "space-between" }}>
                        <span>{card.player}</span>
                        <span style={{ color: "#6b7280" }}>{card.minute}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
