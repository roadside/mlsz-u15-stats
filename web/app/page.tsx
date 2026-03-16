
"use client";

import { useMemo } from "react";
import matches from "../data/matches.json";
import goalscorers from "../data/goalscorers.json";

// --- helper styles ---
const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "8px",
};

// --- component ---
export default function TeamExtras({
  selectedTeamFilter,
  allMatches,
  getStatusStyle,
}) {
  // Top scorers for selected team
  const teamTopScorers = useMemo(() => {
    if (!selectedTeamFilter || selectedTeamFilter === "Összes csapat") return [];

    const map = new Map();

    goalscorers.forEach((round) => {
      round.goalscorers.forEach((g) => {
        if (g.team === selectedTeamFilter) {
          map.set(g.player, (map.get(g.player) || 0) + Number(g.goals));
        }
      });
    });

    return Array.from(map.entries())
      .map(([player, goals]) => ({ player, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);
  }, [selectedTeamFilter]);

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Top góllövők – {selectedTeamFilter}</h3>

      {teamTopScorers.map((s, i) => (
        <div key={i} style={rowStyle}>
          <span>
            {i + 1}. {s.player}
          </span>
          <strong>{s.goals}</strong>
        </div>
      ))}
    </div>
  );
}
