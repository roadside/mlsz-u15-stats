"use client";

import React from "react";
import { RoundTable } from "./types";
import { getLogo, tableWrapStyle, mobileCardStyle, thStyle, tdStyle } from "./constants";
import { EmptyBox, LogoCircle, MiniStat, FormBadge } from "./ui";

interface TableViewProps {
  selectedTable: RoundTable | undefined;
  selectedRound: number;
  selectedTeamFilter: string;
  isMobile: boolean;
}

export function TableView({
  selectedTable,
  selectedRound,
  selectedTeamFilter,
  isMobile,
}: TableViewProps) {
  if (!selectedTable || selectedTable.table.length === 0) {
    return <EmptyBox text="Nincs megjeleníthető tabella." />;
  }

  return (
    <>
      <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
        {selectedRound}. forduló tabellája
      </h2>

      {isMobile ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {selectedTable.table.map((row, i) => {
            const logo = getLogo(row.team);
            return (
              <div
                key={i}
                style={{
                  ...mobileCardStyle,
                  border:
                    row.team === selectedTeamFilter
                      ? "2px solid #2563eb"
                      : "1px solid #d1d5db",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#111827", textAlign: "center" }}>
                    {row.pos}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <LogoCircle logo={logo} team={row.team} size={26} />
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                      {row.team}
                    </div>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800 }}>{row.points}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "10px" }}>
                  <MiniStat label="M" value={row.played} />
                  <MiniStat label="GY" value={row.won} />
                  <MiniStat label="D" value={row.draw} />
                  <MiniStat label="V" value={row.lost} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    marginBottom: row.form?.length ? "10px" : "0",
                  }}
                >
                  <MiniStat label="LG" value={row.gf} />
                  <MiniStat label="KG" value={row.ga} />
                  <MiniStat label="GK" value={row.gd} />
                  <MiniStat label="P" value={row.points} strong />
                </div>

                {row.form && row.form.length > 0 ? (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {row.form.map((f, idx) => (
                      <FormBadge key={idx} form={f} size="sm" />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "950px" }}>
            <thead>
              <tr style={{ backgroundColor: "#e5e7eb" }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                <th style={thStyle}>M</th>
                <th style={thStyle}>GY</th>
                <th style={thStyle}>D</th>
                <th style={thStyle}>V</th>
                <th style={thStyle}>LG</th>
                <th style={thStyle}>KG</th>
                <th style={thStyle}>GK</th>
                <th style={thStyle}>P</th>
                <th style={thStyle}>Forma</th>
              </tr>
            </thead>
            <tbody>
              {selectedTable.table.map((row, i) => {
                const logo = getLogo(row.team);
                return (
                  <tr
                    key={i}
                    style={{
                      backgroundColor:
                        row.team === selectedTeamFilter
                          ? "#dbeafe"
                          : i < 3
                          ? "#f8fafc"
                          : "#ffffff",
                    }}
                  >
                    <td style={tdStyle}>{row.pos}</td>
                    <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <LogoCircle logo={logo} team={row.team} size={24} />
                        <span>{row.team}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{row.played}</td>
                    <td style={tdStyle}>{row.won}</td>
                    <td style={tdStyle}>{row.draw}</td>
                    <td style={tdStyle}>{row.lost}</td>
                    <td style={tdStyle}>{row.gf}</td>
                    <td style={tdStyle}>{row.ga}</td>
                    <td style={tdStyle}>{row.gd}</td>
                    <td style={{ ...tdStyle, fontWeight: "bold" }}>{row.points}</td>
                    <td style={tdStyle}>
                      {row.form && row.form.length > 0 ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "nowrap" }}>
                          {row.form.map((f, idx) => (
                            <FormBadge key={idx} form={f} size="sm" />
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
