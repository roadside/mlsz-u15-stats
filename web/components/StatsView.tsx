"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { TeamStrengthRow, ChampionshipChanceRow } from "./types";
import {
  sectionCardStyle,
  sectionTitleStyle,
  sectionSubTitleStyle,
  tableWrapStyle,
  mobileCardStyle,
  selectStyle,
  thStyle,
  tdStyle,
  getLogo,
} from "./constants";
import { EmptyBox, LogoCircle, MiniStat, MetricCard, TeamInfoCard } from "./ui";

interface PoissonResult {
  homeLambda: number;
  awayLambda: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  top3: { homeGoals: number; awayGoals: number; probabilityPercent: number }[];
}

interface RoundGoalRow {
  round: number;
  totalGoals: number;
  avgGoals: number;
}

interface TopScoringTeamRow {
  team: string;
  goals: number;
}

interface StatsViewProps {
  isMobile: boolean;
  selectedTeamFilter: string;
  // Round goals
  roundGoalsStats: { rows: RoundGoalRow[]; maxGoals: number };
  // Team strength
  visibleTeamStrengthRows: TeamStrengthRow[];
  // Poisson
  teamOptions: string[];
  selectedHomeTeam: string;
  selectedAwayTeam: string;
  setSelectedHomeTeam: (t: string) => void;
  setSelectedAwayTeam: (t: string) => void;
  poissonPrediction: PoissonResult | null;
  selectedHomeStats: TeamStrengthRow | null;
  selectedAwayStats: TeamStrengthRow | null;
  // Championship Monte Carlo
  visibleMonteCarloRows: ChampionshipChanceRow[];
  championshipMonteCarlo: { simulationCount: number; maxTitlePct: number };
  // Top scoring teams
  visibleTopScoringTeamsRows: TopScoringTeamRow[];
  topScoringTeamsStats: { maxGoals: number };
}

export function StatsView({
  isMobile,
  selectedTeamFilter,
  roundGoalsStats,
  visibleTeamStrengthRows,
  teamOptions,
  selectedHomeTeam,
  selectedAwayTeam,
  setSelectedHomeTeam,
  setSelectedAwayTeam,
  poissonPrediction,
  selectedHomeStats,
  selectedAwayStats,
  visibleMonteCarloRows,
  championshipMonteCarlo,
  visibleTopScoringTeamsRows,
  topScoringTeamsStats,
}: StatsViewProps) {
  return (
    <>
      <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
        Liga statisztika
      </h2>

      <div style={{ display: "grid", gap: "16px" }}>

        {/* ── Round goals trend ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Góltrend fordulónként</div>
          <div style={sectionSubTitleStyle}>Fordulónkénti összgól</div>

          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {roundGoalsStats.rows.map((row) => (
              <div
                key={row.round}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "58px 1fr" : "80px 1fr 70px",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 600 }}>
                  {row.round}. ford.
                </div>

                <div
                  style={{
                    backgroundColor: "#e5e7eb",
                    height: "14px",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(row.totalGoals / roundGoalsStats.maxGoals) * 100}%`,
                      height: "100%",
                      backgroundColor: "#2563eb",
                      borderRadius: "999px",
                    }}
                  />
                </div>

                {isMobile ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      justifyContent: "flex-end",
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "-4px",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#111827" }}>
                      {row.totalGoals} gól
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: "bold", textAlign: "right" }}>
                    {row.totalGoals} gól
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Team strength index ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Csapat támadó / védekező index</div>
          <div style={sectionSubTitleStyle}>
            Támadó index: 1 felett jobb a ligaátlagnál. Védekező index: 1 felett jobb védekezés.
          </div>

          {isMobile ? (
            <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
              {visibleTeamStrengthRows.map((row) => {
                const logo = getLogo(row.team);
                return (
                  <div key={row.team} style={mobileCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <LogoCircle logo={logo} team={row.team} size={26} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.team}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{row.matches} meccs</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "8px" }}>
                      <MiniStat label="LG" value={row.goalsFor} />
                      <MiniStat label="KG" value={row.goalsAgainst} />
                      <MiniStat label="LG / meccs" value={row.goalsForPerMatch} />
                      <MiniStat label="KG / meccs" value={row.goalsAgainstPerMatch} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <MiniStat label="Támadó index" value={row.attackIndex} valueColor="#166534" strong />
                      <MiniStat label="Védekező index" value={row.defenseIndex} valueColor="#1d4ed8" strong />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", backgroundColor: "#ffffff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                    <th style={thStyle}>M</th>
                    <th style={thStyle}>LG</th>
                    <th style={thStyle}>KG</th>
                    <th style={thStyle}>LG / meccs</th>
                    <th style={thStyle}>KG / meccs</th>
                    <th style={thStyle}>Támadó index</th>
                    <th style={thStyle}>Védekező index</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeamStrengthRows.map((row) => {
                    const logo = getLogo(row.team);
                    return (
                      <tr key={row.team}>
                        <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <LogoCircle logo={logo} team={row.team} size={24} />
                            <span>{row.team}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{row.matches}</td>
                        <td style={tdStyle}>{row.goalsFor}</td>
                        <td style={tdStyle}>{row.goalsAgainst}</td>
                        <td style={tdStyle}>{row.goalsForPerMatch}</td>
                        <td style={tdStyle}>{row.goalsAgainstPerMatch}</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#166534" }}>{row.attackIndex}</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#1d4ed8" }}>{row.defenseIndex}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Poisson predictor ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Poisson meccs-előrejelző</div>
          <div style={sectionSubTitleStyle}>
            A becslés a csapatok támadó és védekező indexéből számolt várható gólértékekre épül.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "12px",
              marginTop: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Hazai csapat</div>
              <select value={selectedHomeTeam} onChange={(e) => setSelectedHomeTeam(e.target.value)} style={selectStyle}>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Vendég csapat</div>
              <select value={selectedAwayTeam} onChange={(e) => setSelectedAwayTeam(e.target.value)} style={selectStyle}>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          {poissonPrediction && selectedHomeStats && selectedAwayStats ? (
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "12px" }}>
                <MetricCard label="Hazai várható gól" value={poissonPrediction.homeLambda} />
                <MetricCard label="Vendég várható gól" value={poissonPrediction.awayLambda} />
                <MetricCard label="Hazai győzelem" value={`${poissonPrediction.homeWin}%`} valueColor="#166534" />
                <MetricCard label="Döntetlen / vendég" value={`${poissonPrediction.draw}% / ${poissonPrediction.awayWin}%`} />
              </div>

              {isMobile ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  {poissonPrediction.top3.map((row, index) => (
                    <div key={`${row.homeGoals}-${row.awayGoals}`} style={mobileCardStyle}>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                        {index + 1}. legvalószínűbb
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                        {selectedHomeTeam} {row.homeGoals}-{row.awayGoals} {selectedAwayTeam}
                      </div>
                      <div style={{ fontSize: "13px", color: "#111827" }}>{row.probabilityPercent}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#e5e7eb" }}>
                        <th style={thStyle}>#</th>
                        <th style={{ ...thStyle, textAlign: "left" }}>Legvalószínűbb eredmény</th>
                        <th style={thStyle}>Valószínűség</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poissonPrediction.top3.map((row, index) => (
                        <tr key={`${row.homeGoals}-${row.awayGoals}`}>
                          <td style={tdStyle}>{index + 1}</td>
                          <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                            {selectedHomeTeam} {row.homeGoals}-{row.awayGoals} {selectedAwayTeam}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: "bold" }}>{row.probabilityPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <TeamInfoCard team={selectedHomeTeam} attackIndex={selectedHomeStats.attackIndex} defenseIndex={selectedHomeStats.defenseIndex} />
                <TeamInfoCard team={selectedAwayTeam} attackIndex={selectedAwayStats.attackIndex} defenseIndex={selectedAwayStats.defenseIndex} />
              </div>
            </div>
          ) : (
            <EmptyBox text="Nincs elég adat az előrejelzéshez." />
          )}
        </div>

        {/* ── Championship Monte Carlo ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>Bajnoki esélymodell</div>
          <div style={sectionSubTitleStyle}>
            {championshipMonteCarlo.simulationCount} szezonfutás alapján becsült valószínűségek (%)
          </div>

          {/* ── Bar chart ── */}
          <div style={{ marginTop: "20px", width: "100%" }}>
            <ResponsiveContainer width="100%" height={isMobile ? 320 : 380}>
              <BarChart
                data={visibleMonteCarloRows.map((r) => ({
                  name: isMobile
                    ? r.team.split(" ").pop() ?? r.team   // rövidítés mobilon: utolsó szó
                    : r.team,
                  "Bajnoki": r.titlePct,
                  "Top 3": r.top3Pct,
                  "Top 6": r.top6Pct,
                  "Utolsó": r.lastPct,
                  fullName: r.team,
                  currentPoints: r.currentPoints,
                  simulatedAvgPoints: r.simulatedAvgPoints,
                }))}
                margin={{ top: 8, right: 16, left: 0, bottom: isMobile ? 60 : 40 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "#374151" }}
                  angle={isMobile ? -40 : -25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: "#374151" }}
                  width={42}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name as string]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row
                      ? `${row.fullName} — ${row.currentPoints} pt (várható: ${row.simulatedAvgPoints})`
                      : label;
                  }}
                  contentStyle={{ fontSize: "13px", borderRadius: "8px" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
                  iconType="square"
                />
                <Bar dataKey="Bajnoki" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Top 3"   fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Top 6"   fill="#0891b2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Utolsó"  fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Részletes kártyák mobilon / táblázat desktopon ── */}
          {isMobile ? (
            <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
              {visibleMonteCarloRows.map((row) => {
                const logo = getLogo(row.team);
                return (
                  <div key={row.team} style={mobileCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <LogoCircle logo={logo} team={row.team} size={26} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.team}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          Jelenlegi pont: {row.currentPoints} • Várható: {row.simulatedAvgPoints}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <MiniStat label="Bajnoki esély" value={`${row.titlePct}%`} />
                      <MiniStat label="Top 3" value={`${row.top3Pct}%`} valueColor="#166534" />
                      <MiniStat label="Top 6" value={`${row.top6Pct}%`} valueColor="#1d4ed8" />
                      <MiniStat label="Utolsó hely" value={`${row.lastPct}%`} valueColor="#991b1b" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...tableWrapStyle, marginTop: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px", backgroundColor: "#ffffff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                    <th style={thStyle}>Jelenlegi pont</th>
                    <th style={thStyle}>Várható pont</th>
                    <th style={{ ...thStyle, color: "#2563eb" }}>Bajnoki</th>
                    <th style={{ ...thStyle, color: "#16a34a" }}>Top 3</th>
                    <th style={{ ...thStyle, color: "#0891b2" }}>Top 6</th>
                    <th style={{ ...thStyle, color: "#dc2626" }}>Utolsó</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMonteCarloRows.map((row) => {
                    const logo = getLogo(row.team);
                    return (
                      <tr key={row.team}>
                        <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <LogoCircle logo={logo} team={row.team} size={24} />
                            <span>{row.team}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{row.currentPoints}</td>
                        <td style={tdStyle}>{row.simulatedAvgPoints}</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#2563eb" }}>{row.titlePct}%</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#16a34a" }}>{row.top3Pct}%</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#0891b2" }}>{row.top6Pct}%</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#dc2626" }}>{row.lastPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Top scoring teams ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>
            {selectedTeamFilter === "Összes csapat" ? "Legtöbb gólt szerző csapatok" : "A csapat összes gólja"}
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {visibleTopScoringTeamsRows.map((row) => {
              const logo = getLogo(row.team);
              return (
                <div
                  key={row.team}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "minmax(0, 1fr) 52px" : "minmax(0, 1fr) 120px 40px",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <LogoCircle logo={logo} team={row.team} size={24} />
                    <div style={{ fontSize: isMobile ? "13px" : "14px", color: "#111827", fontWeight: 600, minWidth: 0 }}>
                      {row.team}
                    </div>
                  </div>
                  {!isMobile ? (
                    <div style={{ backgroundColor: "#e5e7eb", height: "18px", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${(row.goals / topScoringTeamsStats.maxGoals) * 100}%`,
                          height: "100%",
                          backgroundColor: "#16a34a",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  ) : null}
                  <div style={{ fontSize: isMobile ? "13px" : "14px", color: "#111827", fontWeight: "bold", textAlign: "right" }}>
                    {row.goals}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
