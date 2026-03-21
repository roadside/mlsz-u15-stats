import { useMemo } from "react";

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
  const filteredCards = useMemo(() => {
    let roundCards = cardsData.filter((m) => m.round === selectedRound);
    
    if (selectedTeamFilter !== "Összes csapat") {
      roundCards = roundCards.filter((m) => m.home === selectedTeamFilter || m.away === selectedTeamFilter);
    }
    
    return roundCards;
  }, [cardsData, selectedRound, selectedTeamFilter]);

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
                        <span style={{ color: "#6b7280" }}>{card.minute}'</span>
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
                        <span style={{ color: "#6b7280" }}>{card.minute}'</span>
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
