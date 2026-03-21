"use client";

import React from "react";
import { GoalscorerRow } from "./types";
import { sectionCardStyle, tableWrapStyle, mobileCardStyle, thStyle, tdStyle } from "./constants";
import { EmptyBox } from "./ui";

interface GoalscorersViewProps {
  filteredGoalscorers: GoalscorerRow[] | null;
  selectedRound: number;
  selectedTeamFilter: string;
  isMobile: boolean;
}

export function GoalscorersView({
  filteredGoalscorers,
  selectedRound,
  selectedTeamFilter,
  isMobile,
}: GoalscorersViewProps) {
  return (
    <section style={sectionCardStyle}>
      <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
        {selectedTeamFilter === "Összes csapat"
          ? `Góllövőlista a ${selectedRound}. forduló után`
          : `${selectedTeamFilter} góllövői a ${selectedRound}. forduló után`}
      </h2>

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
