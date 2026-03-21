"use client";

import React from "react";
import { GoalscorerRow, MatchGoalscorer } from "./types";
import { sectionCardStyle, tableWrapStyle, mobileCardStyle, thStyle, tdStyle } from "./constants";
import { EmptyBox } from "./ui";

interface GoalscorersViewProps {
  filteredGoalscorers: GoalscorerRow[] | null;
  allMatchGoalscorers: MatchGoalscorer[];
  selectedRound: number;
  selectedTeamFilter: string;
  isMobile: boolean;
}

export function GoalscorersView({
  filteredGoalscorers,
  allMatchGoalscorers,
  selectedRound,
  selectedTeamFilter,
  isMobile,
}: GoalscorersViewProps) {
  const trendRounds = buildTrendRounds(selectedRound);
  const hotPlayers = buildHotPlayers(allMatchGoalscorers, trendRounds, selectedTeamFilter).slice(0, isMobile ? 5 : 8);

  return (
    <section style={sectionCardStyle}>
      <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
        {selectedTeamFilter === "Összes csapat"
          ? `Góllövőlista a ${selectedRound}. forduló után`
          : `${selectedTeamFilter} góllövői a ${selectedRound}. forduló után`}
      </h2>

      {hotPlayers.length > 0 ? (
        <div
          style={{
            marginBottom: "18px",
            padding: isMobile ? "12px" : "14px",
            borderRadius: "12px",
            border: "1px solid #fed7aa",
            background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
          }}
        >
          <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 800, color: "#9a3412", marginBottom: "6px" }}>
            🔥 Formában lévő játékosok
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280", marginBottom: "12px" }}>
            Utolsó {trendRounds.length} forduló trendje ({trendRounds.join(", ")}. forduló)
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {hotPlayers.map((player, index) => (
              <div
                key={`${player.player}-${player.team}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "36px minmax(0, 1fr) auto auto",
                  gap: isMobile ? "6px" : "12px",
                  alignItems: isMobile ? "start" : "center",
                  padding: isMobile ? "10px" : "12px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255,255,255,0.92)",
                  border: "1px solid #fde68a",
                }}
              >
                <div style={{ fontSize: isMobile ? "12px" : "13px", fontWeight: 800, color: "#9a3412" }}>
                  #{index + 1}
                </div>
                <div>
                  <div style={{ fontSize: isMobile ? "14px" : "15px", fontWeight: 800, color: "#111827" }}>{player.player}</div>
                  <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280", marginTop: "2px" }}>{player.team}</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: isMobile ? "flex-start" : "center", minWidth: isMobile ? undefined : "76px" }}>
                  {player.goalsByRound.map((goals, i) => (
                    <div
                      key={i}
                      title={`${trendRounds[i]}. forduló: ${goals} gól`}
                      style={{
                        width: isMobile ? "12px" : "14px",
                        height: `${Math.max(8, goals * 12 + 8)}px`,
                        borderRadius: "999px",
                        backgroundColor: i === player.goalsByRound.length - 1 ? "#ea580c" : "#fdba74",
                        opacity: 0.95,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "grid", gap: "2px", justifyItems: isMobile ? "start" : "end" }}>
                  <div style={{ fontSize: isMobile ? "12px" : "13px", fontWeight: 800, color: player.trendColor }}>{player.trendLabel}</div>
                  <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280" }}>{player.goalsText}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!filteredGoalscorers || filteredGoalscorers.length === 0 ? (
        <EmptyBox text="Nincs megjeleníthető góllövőlista." />
      ) : isMobile ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredGoalscorers.map((row, i) => (
            <div key={i} style={mobileCardStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr auto",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "16px", textAlign: "center" }}>
                  {row.pos}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.player}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                    {row.team}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: "20px", color: "#166534" }}>
                  {row.goals}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
            <thead>
              <tr style={{ backgroundColor: "#e5e7eb" }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Játékos</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                <th style={thStyle}>Gól</th>
              </tr>
            </thead>
            <tbody>
              {filteredGoalscorers.map((row, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{row.pos}</td>
                  <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                    {row.player}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "left" }}>{row.team}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{row.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function buildTrendRounds(selectedRound: number): number[] {
  const startRound = Math.max(1, selectedRound - 2);
  const rounds: number[] = [];
  for (let round = startRound; round <= selectedRound; round++) {
    rounds.push(round);
  }
  return rounds;
}

function buildHotPlayers(
  allMatchGoalscorers: MatchGoalscorer[],
  trendRounds: number[],
  selectedTeamFilter: string
) {
  const byPlayer = new Map<string, { player: string; team: string; goalsByRound: number[] }>();

  for (const match of allMatchGoalscorers) {
    const roundIndex = trendRounds.indexOf(match.round);
    if (roundIndex === -1) continue;

    for (const scorer of match.home_scorers) {
      if (selectedTeamFilter !== "Összes csapat" && match.home !== selectedTeamFilter) continue;
      const key = `${scorer.player}|${match.home}`;
      const existing = byPlayer.get(key) ?? {
        player: scorer.player,
        team: match.home,
        goalsByRound: Array.from({ length: trendRounds.length }, () => 0),
      };
      existing.goalsByRound[roundIndex] += scorer.goals;
      byPlayer.set(key, existing);
    }

    for (const scorer of match.away_scorers) {
      if (selectedTeamFilter !== "Összes csapat" && match.away !== selectedTeamFilter) continue;
      const key = `${scorer.player}|${match.away}`;
      const existing = byPlayer.get(key) ?? {
        player: scorer.player,
        team: match.away,
        goalsByRound: Array.from({ length: trendRounds.length }, () => 0),
      };
      existing.goalsByRound[roundIndex] += scorer.goals;
      byPlayer.set(key, existing);
    }
  }

  return Array.from(byPlayer.values())
    .map((player) => {
      const totalLastRounds = player.goalsByRound.reduce((sum, value) => sum + value, 0);
      const first = player.goalsByRound[0] ?? 0;
      const last = player.goalsByRound[player.goalsByRound.length - 1] ?? 0;
      const trendDelta = last - first;
      const trend = describeTrend(player.goalsByRound);

      return {
        ...player,
        totalLastRounds,
        latestGoals: last,
        trendDelta,
        trendLabel: trend.label,
        trendColor: trend.color,
        goalsText: player.goalsByRound.join(" → "),
      };
    })
    .filter((player) => player.totalLastRounds > 0)
    .sort(
      (a, b) =>
        b.totalLastRounds - a.totalLastRounds ||
        b.latestGoals - a.latestGoals ||
        b.trendDelta - a.trendDelta ||
        a.player.localeCompare(b.player, "hu")
    );
}

function describeTrend(goalsByRound: number[]) {
  if (goalsByRound.length === 0) {
    return { label: "stabil", color: "#6b7280" };
  }

  const first = goalsByRound[0] ?? 0;
  const last = goalsByRound[goalsByRound.length - 1] ?? 0;
  const middle = goalsByRound.length > 1 ? goalsByRound[goalsByRound.length - 2] ?? 0 : first;

  if (first === 0 && middle === 0 && last > 0) {
    return { label: "berobbant", color: "#ea580c" };
  }
  if (last > middle && middle >= first) {
    return { label: "emelkedő", color: "#16a34a" };
  }
  if (last < middle && middle <= first) {
    return { label: "csökkenő", color: "#dc2626" };
  }
  if (last === first) {
    return { label: "stabil", color: "#6b7280" };
  }
  if (last > first) {
    return { label: "javuló", color: "#16a34a" };
  }
  return { label: "visszaeső", color: "#dc2626" };
}
