"use client";

import React from "react";
import Image from "next/image";
import { Match } from "./types";
import {
  sectionCardStyle,
  statCardStyle,
  statLabelStyle,
  statValueStyle,
  getLogo,
} from "./constants";
import { EmptyBox, MiniStat, FormBadge } from "./ui";
import { getFormBadgeStyle } from "./constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamProfile {
  team: string;
  position: string | null;
  points: string | null;
  goalDifference: string | null;
  playedMatches: number;
  form: string[];
}

interface TeamMiniStats {
  pointsPerMatch: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  winRate: number;
}

interface FormTrendRow {
  round: number;
  opponent: string;
  isHome: boolean;
  result: "GY" | "D" | "V";
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface TeamTableMovement {
  rows: { round: number; position: number; points: number; goalDifference: number; form: string[] }[];
  firstPosition: number;
  currentPosition: number;
  bestPosition: number;
  movement: number;
}

interface NextOpponentStats {
  team: string;
  position: string;
  points: string;
  goalDifference: string;
  played: string;
  form: string[];
  lastHeadToHead: Match | null;
}

interface HomeAwayBucket {
  matches: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  goalDifference: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  pointsPerMatch: number;
}

interface TeamHomeAwayStats {
  home: HomeAwayBucket;
  away: HomeAwayBucket;
}

interface TopScorer {
  player: string;
  team: string;
  goals: number;
}

interface TeamProfileProps {
  isMobile: boolean;
  selectedTeamFilter: string;
  selectedTeamProfile: TeamProfile | null;
  teamMiniStats: TeamMiniStats | null;
  teamFormTrend: { rows: FormTrendRow[]; totalPoints: number } | null;
  teamTableMovement: TeamTableMovement | null;
  nextOpponentStats: NextOpponentStats | null;
  teamHomeAwayStats: TeamHomeAwayStats | null;
  teamTopScorers: TopScorer[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeamProfile({
  isMobile,
  selectedTeamFilter,
  selectedTeamProfile,
  teamMiniStats,
  teamFormTrend,
  teamTableMovement,
  nextOpponentStats,
  teamHomeAwayStats,
  teamTopScorers,
}: TeamProfileProps) {
  if (!selectedTeamProfile) return null;

  return (
    <>
      {/* ── Profile header ── */}
      <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
        <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
          {selectedTeamProfile.team} – csapatprofil
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
            gap: "12px",
          }}
        >
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Helyezés</div>
            <div style={statValueStyle}>{selectedTeamProfile.position ?? "-"}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Pont</div>
            <div style={statValueStyle}>{selectedTeamProfile.points ?? "-"}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Gólkülönbség</div>
            <div style={statValueStyle}>{selectedTeamProfile.goalDifference ?? "-"}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Lejátszott meccsek</div>
            <div style={statValueStyle}>{selectedTeamProfile.playedMatches}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Forma</div>
            {selectedTeamProfile.form?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", minHeight: "40px" }}>
                {selectedTeamProfile.form.map((f, idx) => (
                  <FormBadge key={idx} form={f} />
                ))}
              </div>
            ) : (
              <div style={statValueStyle}>-</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Mini stats ── */}
      {teamMiniStats && (
        <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Pont / meccs</div>
              <div style={statValueStyle}>{teamMiniStats.pointsPerMatch}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Lőtt gól / meccs</div>
              <div style={statValueStyle}>{teamMiniStats.goalsForPerMatch}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Kapott gól / meccs</div>
              <div style={statValueStyle}>{teamMiniStats.goalsAgainstPerMatch}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Győzelmi arány</div>
              <div style={statValueStyle}>{teamMiniStats.winRate}%</div>
            </div>
          </div>
        </section>
      )}

      {/* ── Form trend ── */}
      {teamFormTrend && (
        <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>Forma trend</h2>

          {teamFormTrend.rows.length === 0 ? (
            <EmptyBox text="Nincs még elegendő lejátszott mérkőzés." />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)", gap: "10px" }}>
                {teamFormTrend.rows.map((row, index) => (
                  <div
                    key={`${selectedTeamFilter}-trend-${index}-${row.round}`}
                    style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", backgroundColor: "#f8fafc" }}
                  >
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                      {row.round}. forduló
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        minWidth: "40px",
                        height: "32px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        fontWeight: 800,
                        ...getFormBadgeStyle(row.result),
                      }}
                    >
                      {row.result}
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                      {row.isHome ? "vs. " : "@ "}{row.opponent}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#374151" }}>
                      {row.goalsFor}-{row.goalsAgainst} • {row.points} pont
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "12px" }}>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Utolsó {teamFormTrend.rows.length} meccs pontjai</div>
                  <div style={statValueStyle}>{teamFormTrend.totalPoints}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Maximum szerezhető pont</div>
                  <div style={statValueStyle}>{teamFormTrend.rows.length * 3}</div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Table movement ── */}
      {teamTableMovement && (
        <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>Tabella-mozgás</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: "10px" }}>
            {teamTableMovement.rows.map((row) => (
              <div
                key={`${selectedTeamFilter}-movement-${row.round}`}
                style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", backgroundColor: "#f8fafc" }}
              >
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{row.round}. forduló</div>
                <div style={{ fontSize: isMobile ? "24px" : "28px", fontWeight: 800, lineHeight: 1, color: "#111827" }}>
                  {row.position}.
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#374151", display: "grid", gap: "4px" }}>
                  <div>Pont: {row.points}</div>
                  <div>GK: {row.goalDifference}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "12px" }}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Nyitó → jelenlegi helyezés</div>
              <div style={statValueStyle}>
                {teamTableMovement.firstPosition}. → {teamTableMovement.currentPosition}.
              </div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Legjobb helyezés</div>
              <div style={statValueStyle}>{teamTableMovement.bestPosition}.</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Pozícióváltozás</div>
              <div style={statValueStyle}>
                {teamTableMovement.movement > 0 ? `+${teamTableMovement.movement}` : teamTableMovement.movement}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Next opponent ── */}
      {nextOpponentStats && (
        <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>Következő ellenfél</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: "16px", alignItems: "stretch" }}>
            <div style={statCardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", border: "1px solid #e5e7eb", overflow: "hidden", flexShrink: 0 }}>
                  {getLogo(nextOpponentStats.team) ? (
                    <Image src={getLogo(nextOpponentStats.team)!} alt={nextOpponentStats.team} width={38} height={38} style={{ objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>N/A</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                    {nextOpponentStats.team}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Következő ellenfél</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Helyezés</div>
                  <div style={statValueStyle}>{nextOpponentStats.position}.</div>
                </div>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Pont</div>
                  <div style={statValueStyle}>{nextOpponentStats.points}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Gólkülönbség</div>
                  <div style={statValueStyle}>{nextOpponentStats.goalDifference}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>Lejátszott meccs</div>
                  <div style={statValueStyle}>{nextOpponentStats.played}</div>
                </div>
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>
                Forma és egymás elleni
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ ...statLabelStyle, marginBottom: "8px" }}>Aktuális forma</div>
                {nextOpponentStats.form.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {nextOpponentStats.form.map((f, idx) => (
                      <FormBadge key={idx} form={f} />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: "14px" }}>Nincs formaadat.</div>
                )}
              </div>

              <div>
                <div style={{ ...statLabelStyle, marginBottom: "8px" }}>Utolsó egymás elleni</div>
                {nextOpponentStats.lastHeadToHead ? (
                  <div style={{ fontSize: "14px", color: "#111827" }}>
                    <strong>
                      {nextOpponentStats.lastHeadToHead.home} {nextOpponentStats.lastHeadToHead.home_goals}-
                      {nextOpponentStats.lastHeadToHead.away_goals} {nextOpponentStats.lastHeadToHead.away}
                    </strong>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      {nextOpponentStats.lastHeadToHead.date} • {nextOpponentStats.lastHeadToHead.round}. forduló
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: "14px" }}>Nincs korábbi mérkőzés.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Home / Away stats ── */}
      {teamHomeAwayStats && (
        <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>Hazai / vendég statisztika</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
            {(["home", "away"] as const).map((side) => {
              const bucket = teamHomeAwayStats[side];
              const label = side === "home" ? "Hazai" : "Vendég";
              return (
                <div key={side} style={statCardStyle}>
                  <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <MiniStat label="Meccs" value={bucket.matches} />
                    <MiniStat label="Pont" value={bucket.points} />
                    <MiniStat label="Mérleg" value={`${bucket.won}-${bucket.draw}-${bucket.lost}`} />
                    <MiniStat label="Gólkülönbség" value={bucket.goalDifference} />
                    <MiniStat label="Lőtt gól / meccs" value={bucket.goalsForPerMatch} />
                    <MiniStat label="Kapott gól / meccs" value={bucket.goalsAgainstPerMatch} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Top scorers ── */}
      <section style={{ ...sectionCardStyle, marginBottom: "16px" }}>
        <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
          Top góllövők – {selectedTeamFilter}
        </h2>

        {teamTopScorers.length === 0 ? (
          <EmptyBox text="Nincs megjeleníthető góllövő adat." />
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {teamTopScorers.map((row, index) => (
              <div
                key={`${row.player}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "44px 1fr auto" : "52px 1fr auto",
                  alignItems: "center",
                  gap: "14px",
                  padding: isMobile ? "14px" : "16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "36px" : "40px",
                    height: isMobile ? "36px" : "40px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: isMobile ? "20px" : "22px",
                    color: "#1d4ed8",
                    backgroundColor: "#dbeafe",
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? "14px" : "15px", fontWeight: 800, color: "#111827", textTransform: "uppercase", lineHeight: 1.2 }}>
                    {row.player}
                  </div>
                  <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280", marginTop: "4px" }}>
                    {row.team}
                  </div>
                </div>
                <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 900, color: "#166534", paddingLeft: "8px" }}>
                  {row.goals}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
