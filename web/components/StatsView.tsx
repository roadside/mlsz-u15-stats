"use client";

import React, { useMemo, useState } from "react";
import { TeamStrengthRow, ChampionshipChanceRow, MatchGoalscorer, GoalscorerRow } from "./types";
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

interface GoalTimingBucketRow {
  label: string;
  value: number;
}

interface DangerousPlayerRow {
  player: string;
  team: string;
  seasonGoals: number;
  recentGoals5: number;
  recentGoals3: number;
  teamGoalShare: number;
  trendLabel: string;
  trendColor: string;
  goalsByRecentRound: number[];
  dangerScore: number;
  badgeLabel: string;
}

interface StatsViewProps {
  isMobile: boolean;
  selectedTeamFilter: string;
  nextOpponentTeam: string | null;
  allMatchGoalscorers: MatchGoalscorer[];
  latestGoalscorers: GoalscorerRow[];
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
  nextOpponentTeam,
  allMatchGoalscorers,
  latestGoalscorers,
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
  const [mcSortKey, setMcSortKey] = useState<
    "team" | "currentPoints" | "simulatedAvgPoints" | "titlePct" | "top3Pct" | "top6Pct" | "lastPct"
  >("titlePct");
  const [mcSortDir, setMcSortDir] = useState<"asc" | "desc">("desc");

  const sortedMonteCarloRows = useMemo(() => {
    const dir = mcSortDir === "asc" ? 1 : -1;

    const keyGetters: Record<typeof mcSortKey, (r: ChampionshipChanceRow) => number | string> = {
      team: (r) => r.team,
      currentPoints: (r) => r.currentPoints,
      simulatedAvgPoints: (r) => r.simulatedAvgPoints,
      titlePct: (r) => r.titlePct,
      top3Pct: (r) => r.top3Pct,
      top6Pct: (r) => r.top6Pct,
      lastPct: (r) => r.lastPct,
    };

    const get = keyGetters[mcSortKey];
    const indexed = visibleMonteCarloRows.map((row, idx) => ({ row, idx }));

    indexed.sort((a, b) => {
      const av = get(a.row);
      const bv = get(b.row);

      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv, "hu");
        return cmp !== 0 ? cmp * dir : a.idx - b.idx;
      }

      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      const cmp = an - bn;
      return cmp !== 0 ? cmp * dir : a.idx - b.idx;
    });

    return indexed.map((x) => x.row);
  }, [visibleMonteCarloRows, mcSortKey, mcSortDir]);

  const onMcHeaderClick = (key: typeof mcSortKey) => {
    if (mcSortKey !== key) {
      setMcSortKey(key);
      setMcSortDir(key === "team" ? "asc" : "desc");
      return;
    }
    setMcSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const sortLabel = (key: typeof mcSortKey, label: string) => {
    const active = mcSortKey === key;
    const arrow = !active ? "" : mcSortDir === "asc" ? " ▲" : " ▼";
    return label + arrow;
  };

  const goalTimingStats = useMemo(() => {
    const buckets: GoalTimingBucketRow[] = [
      { label: "0–15", value: 0 },
      { label: "16–30", value: 0 },
      { label: "31–45", value: 0 },
      { label: "46–60", value: 0 },
      { label: "61–75", value: 0 },
      { label: "76–90", value: 0 },
    ];

    for (const match of allMatchGoalscorers) {
      const scorerGroups =
        selectedTeamFilter === "Összes csapat"
          ? [match.home_scorers, match.away_scorers]
          : [
              ...(match.home === selectedTeamFilter ? [match.home_scorers] : []),
              ...(match.away === selectedTeamFilter ? [match.away_scorers] : []),
            ];

      for (const scorers of scorerGroups) {
        for (const scorer of scorers) {
          for (const rawMinute of scorer.minutes ?? []) {
            const bucketIndex = getGoalTimingBucketIndex(rawMinute);
            if (bucketIndex >= 0) {
              buckets[bucketIndex].value += 1;
            }
          }
        }
      }
    }

    const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1);
    const totalGoals = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
    const peakBucket = buckets.reduce((best, current) => (current.value > best.value ? current : best), buckets[0]);

    return {
      buckets,
      maxValue,
      totalGoals,
      insight: buildGoalTimingInsight(peakBucket.label, selectedTeamFilter, totalGoals),
    };
  }, [allMatchGoalscorers, selectedTeamFilter]);

  const dangerousPlayers = useMemo(() => {
    const recentRounds5 = buildRecentRoundsFromMatches(allMatchGoalscorers, 5);
    const recentRounds3 = recentRounds5.slice(-3);

    return {
      home: buildDangerousPlayersForTeam(allMatchGoalscorers, latestGoalscorers, selectedHomeTeam, recentRounds5, recentRounds3),
      away: buildDangerousPlayersForTeam(allMatchGoalscorers, latestGoalscorers, selectedAwayTeam, recentRounds5, recentRounds3),
    };
  }, [allMatchGoalscorers, latestGoalscorers, selectedHomeTeam, selectedAwayTeam]);

  const showOnlyOpponentDangerousPlayers =
    selectedTeamFilter !== "Összes csapat" && !!nextOpponentTeam && selectedAwayTeam === nextOpponentTeam;

  return (
    <>
      {selectedTeamFilter === "Összes csapat" ? (
        <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
          Liga statisztika
        </h2>
      ) : null}

      <div style={{ display: "grid", gap: "16px" }}>

        {/* ── Goal timing ── */}
        <div style={sectionCardStyle}>
          <div style={sectionTitleStyle}>
            {selectedTeamFilter === "Összes csapat"
              ? "⚽ Gól-időzítés statisztika"
              : `⚽ Gól-időzítés statisztika - ${selectedTeamFilter}`}
          </div>
          <div style={sectionSubTitleStyle}>
            {selectedTeamFilter === "Összes csapat"
              ? "Az összes rögzített gól időzítése a meccspercek alapján."
              : "A csapat góljainak eloszlása időszakokra bontva."}
          </div>

          {goalTimingStats.totalGoals > 0 ? (
            <>
              <div
                style={{
                  marginTop: "12px",
                  marginBottom: "14px",
                  padding: isMobile ? "10px" : "12px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  color: "#1e3a8a",
                  fontSize: isMobile ? "13px" : "14px",
                  fontWeight: 700,
                }}
              >
                {goalTimingStats.insight}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {goalTimingStats.buckets.map((bucket) => (
                  <div
                    key={bucket.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "58px 1fr 34px" : "80px 1fr 56px",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 700 }}>{bucket.label}</div>
                    <div
                      style={{
                        backgroundColor: "#e5e7eb",
                        height: isMobile ? "16px" : "18px",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(bucket.value / goalTimingStats.maxValue) * 100}%`,
                          minWidth: bucket.value > 0 ? "8px" : "0px",
                          height: "100%",
                          background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 800, textAlign: "right", color: "#9a3412" }}>
                      {bucket.value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: "12px" }}>
              <EmptyBox text="Nincs elég perc alapú góladat a gól-időzítés statisztikához." />
            </div>
          )}
        </div>

        {selectedTeamFilter === "Összes csapat" ? (
          <div style={sectionCardStyle}>
            <div style={sectionTitleStyle}>Góltrend fordulónként</div>
            <div style={sectionSubTitleStyle}>Fordulónkénti összgól</div>

            <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
              {roundGoalsStats.rows
                .filter((row) => row.totalGoals > 0)
                .length > 0 ? (
                roundGoalsStats.rows
                  .filter((row) => row.totalGoals > 0)
                  .map((row) => (
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
              ))
              ) : (
                <EmptyBox text="Nincsenek gólt tartalmazó fordulók" />
              )}
            </div>
          </div>
        ) : null}

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
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: "12px" }}>
                <MetricCard label="Hazai várható gól" value={poissonPrediction.homeLambda} />
                <MetricCard label="Vendég várható gól" value={poissonPrediction.awayLambda} />
                <MetricCard label="Hazai győzelem" value={`${poissonPrediction.homeWin}%`} valueColor="#166534" />
                <MetricCard label="Döntetlen" value={`${poissonPrediction.draw}%`} />
                <MetricCard label="Vendég győzelem" value={`${poissonPrediction.awayWin}%`} valueColor="#1d4ed8" />
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

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: isMobile ? "12px" : "14px",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
                  Veszélyes játékosok
                </div>
                <div style={{ fontSize: isMobile ? "12px" : "13px", color: "#6b7280", marginBottom: "12px" }}>
                  A szezontermés, a friss gólforma és a csapat góljain belüli részesedés alapján.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: showOnlyOpponentDangerousPlayers || isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                  {showOnlyOpponentDangerousPlayers ? null : (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px", color: "#111827" }}>{selectedHomeTeam}</div>
                      {dangerousPlayers.home.length > 0 ? (
                        <div style={{ display: "grid", gap: "8px" }}>
                          {dangerousPlayers.home.map((player) => (
                            <DangerousPlayerCard key={`${player.team}-${player.player}`} player={player} isMobile={isMobile} />
                          ))}
                        </div>
                      ) : (
                        <EmptyBox text="A csapatnál jelenleg nincs veszélyesnek minősülő játékos." />
                      )}
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px", color: "#111827" }}>{selectedAwayTeam}</div>
                    {dangerousPlayers.away.length > 0 ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        {dangerousPlayers.away.map((player) => (
                          <DangerousPlayerCard key={`${player.team}-${player.player}`} player={player} isMobile={isMobile} />
                        ))}
                      </div>
                    ) : (
                      <EmptyBox text="A csapatnál jelenleg nincs veszélyesnek minősülő játékos." />
                    )}
                  </div>
                </div>
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
            {championshipMonteCarlo.simulationCount} szezonfutás alapján becsült bajnoki, top 3, top 6 és utolsó hely valószínűségek.
          </div>

          {isMobile ? (
            <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
              {sortedMonteCarloRows.map((row) => {
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
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "950px", backgroundColor: "#ffffff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th
                      style={{ ...thStyle, textAlign: "left", cursor: "pointer", userSelect: "none" }}
                      onClick={() => onMcHeaderClick("team")}
                      title="Rendezés"
                    >
                      {sortLabel("team", "Csapat")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("currentPoints")} title="Rendezés">
                      {sortLabel("currentPoints", "Jelenlegi pont")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("simulatedAvgPoints")} title="Rendezés">
                      {sortLabel("simulatedAvgPoints", "Várható pont")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("titlePct")} title="Rendezés">
                      {sortLabel("titlePct", "Bajnoki esély")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("top3Pct")} title="Rendezés">
                      {sortLabel("top3Pct", "Top 3")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("top6Pct")} title="Rendezés">
                      {sortLabel("top6Pct", "Top 6")}
                    </th>
                    <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onMcHeaderClick("lastPct")} title="Rendezés">
                      {sortLabel("lastPct", "Utolsó hely")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonteCarloRows.map((row) => {
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
                        <td style={tdStyle}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 52px", gap: "8px", alignItems: "center" }}>
                            <div style={{ backgroundColor: "#e5e7eb", height: "14px", borderRadius: "999px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${(row.titlePct / championshipMonteCarlo.maxTitlePct) * 100}%`,
                                  height: "100%",
                                  backgroundColor: "#2563eb",
                                  borderRadius: "999px",
                                }}
                              />
                            </div>
                            <div style={{ fontWeight: "bold" }}>{row.titlePct}%</div>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#166534" }}>{row.top3Pct}%</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#1d4ed8" }}>{row.top6Pct}%</td>
                        <td style={{ ...tdStyle, fontWeight: "bold", color: "#991b1b" }}>{row.lastPct}%</td>
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

function getGoalTimingBucketIndex(minute: number): number {
  const safeMinute = Math.min(Math.max(Math.floor(minute), 0), 90);
  if (safeMinute <= 15) return 0;
  if (safeMinute <= 30) return 1;
  if (safeMinute <= 45) return 2;
  if (safeMinute <= 60) return 3;
  if (safeMinute <= 75) return 4;
  return 5;
}

function buildGoalTimingInsight(peakLabel: string, selectedTeamFilter: string, totalGoals: number): string {
  if (selectedTeamFilter === "Összes csapat") {
    return `A legtöbb rögzített gól a ${peakLabel}. perc közötti sávban született (${totalGoals} összgól alapján).`;
  }

  if (peakLabel === "76–90") {
    return `A csapat a meccsek végén a legerősebb támadásban.`;
  }
  if (peakLabel === "0–15" || peakLabel === "16–30") {
    return `A csapat inkább korai gólokra épít.`;
  }
  if (peakLabel === "31–45" || peakLabel === "46–60") {
    return `A csapat a meccs középső szakaszában a legveszélyesebb.`;
  }
  return "A csapat a második félidő második felében termeli a legtöbb gólt.";
}

function buildRecentRoundsFromMatches(allMatchGoalscorers: MatchGoalscorer[], count: number): number[] {
  const rounds = Array.from(new Set(allMatchGoalscorers.map((match) => match.round))).sort((a, b) => a - b);
  return rounds.slice(-count);
}

function buildDangerousPlayersForTeam(
  allMatchGoalscorers: MatchGoalscorer[],
  latestGoalscorers: GoalscorerRow[],
  team: string,
  recentRounds5: number[],
  recentRounds3: number[]
): DangerousPlayerRow[] {
  const byPlayer = new Map<
    string,
    {
      player: string;
      team: string;
      seasonGoals: number;
      recentGoals5: number;
      recentGoals3: number;
      goalsByRecentRound: number[];
    }
  >();

  let teamSeasonGoals = 0;

  for (const match of allMatchGoalscorers) {
    const scorerGroups = [
      ...(match.home === team ? [{ scorers: match.home_scorers }] : []),
      ...(match.away === team ? [{ scorers: match.away_scorers }] : []),
    ];

    for (const group of scorerGroups) {
      for (const scorer of group.scorers) {
        teamSeasonGoals += scorer.goals;

        const existing = byPlayer.get(scorer.player) ?? {
          player: scorer.player,
          team,
          seasonGoals: 0,
          recentGoals5: 0,
          recentGoals3: 0,
          goalsByRecentRound: Array.from({ length: recentRounds5.length }, () => 0),
        };

        existing.seasonGoals += scorer.goals;

        const recentIndex = recentRounds5.indexOf(match.round);
        if (recentIndex >= 0) {
          existing.recentGoals5 += scorer.goals;
          existing.goalsByRecentRound[recentIndex] += scorer.goals;
        }

        if (recentRounds3.includes(match.round)) {
          existing.recentGoals3 += scorer.goals;
        }

        byPlayer.set(scorer.player, existing);
      }
    }
  }

  const primaryPlayers = Array.from(byPlayer.values())
    .map((player) => {
      const teamGoalShare = teamSeasonGoals > 0 ? player.seasonGoals / teamSeasonGoals : 0;
      const trend = describeDangerTrend(player.goalsByRecentRound);
      const dangerScore = player.recentGoals5 * 3 + player.recentGoals3 * 2 + player.seasonGoals + teamGoalShare * 10;

      return {
        ...player,
        teamGoalShare,
        trendLabel: trend.label,
        trendColor: trend.color,
        dangerScore,
        badgeLabel: buildDangerBadgeLabel(player.recentGoals5, player.seasonGoals, teamGoalShare, trend.label),
      };
    })
    .filter((player) => player.seasonGoals > 0)
    .sort(
      (a, b) =>
        b.dangerScore - a.dangerScore ||
        b.recentGoals5 - a.recentGoals5 ||
        b.seasonGoals - a.seasonGoals ||
        a.player.localeCompare(b.player, "hu")
    )
    .slice(0, 3);

  if (primaryPlayers.length > 0) {
    return primaryPlayers;
  }

  const fallbackRows = latestGoalscorers
    .filter((row) => row.team === team)
    .map((row) => {
      const seasonGoals = Number(row.goals) || 0;
      return {
        player: row.player,
        team,
        seasonGoals,
        recentGoals5: 0,
        recentGoals3: 0,
        teamGoalShare: 0,
        trendLabel: "stabil",
        trendColor: "#6b7280",
        goalsByRecentRound: Array.from({ length: recentRounds5.length }, () => 0),
        dangerScore: seasonGoals,
        badgeLabel: seasonGoals >= 5 ? "stabil befejező" : "veszélyes",
      };
    })
    .filter((player) => player.seasonGoals > 0)
    .sort(
      (a, b) =>
        b.seasonGoals - a.seasonGoals ||
        a.player.localeCompare(b.player, "hu")
    )
    .slice(0, 3);

  const fallbackTotalGoals = fallbackRows.reduce((sum, player) => sum + player.seasonGoals, 0);

  return fallbackRows.map((player) => ({
    ...player,
    teamGoalShare: fallbackTotalGoals > 0 ? player.seasonGoals / fallbackTotalGoals : 0,
    badgeLabel: buildDangerBadgeLabel(player.recentGoals5, player.seasonGoals, fallbackTotalGoals > 0 ? player.seasonGoals / fallbackTotalGoals : 0, player.trendLabel),
  }));
}

function describeDangerTrend(goalsByRound: number[]) {
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
    return { label: "csökkenő teljesítmény", color: "#dc2626" };
  }
  if (last === first) {
    return { label: "stabil", color: "#6b7280" };
  }
  if (last > first) {
    return { label: "javuló", color: "#16a34a" };
  }
  return { label: "csökkenő teljesítmény", color: "#dc2626" };
}

function buildDangerBadgeLabel(recentGoals5: number, seasonGoals: number, teamGoalShare: number, trendLabel: string): string {
  if (teamGoalShare >= 0.3) return "gólfelelős";
  if (recentGoals5 >= 3) return "formában";
  if (trendLabel === "berobbant" || trendLabel === "emelkedő") return "figyelni kell rá";
  if (seasonGoals >= 5) return "stabil befejező";
  return "veszélyes";
}

function DangerousPlayerCard({ player, isMobile }: { player: DangerousPlayerRow; isMobile: boolean }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        backgroundColor: "#f8fafc",
        padding: isMobile ? "10px" : "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 800, color: "#111827" }}>{player.player}</div>
          <div style={{ fontSize: "12px", color: player.trendColor, fontWeight: 700, marginTop: "2px" }}>{player.trendLabel}</div>
        </div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#9a3412",
            backgroundColor: "#ffedd5",
            border: "1px solid #fdba74",
            borderRadius: "999px",
            padding: "4px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {player.badgeLabel}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "10px" }}>
        <MiniStat label="Szezon gól" value={player.seasonGoals} strong valueColor="#111827" />
        <MiniStat label="Utolsó 5" value={player.recentGoals5} valueColor="#166534" />
        <MiniStat label="Gólrész" value={`${Math.round(player.teamGoalShare * 100)}%`} valueColor="#1d4ed8" />
      </div>

      <div style={{ marginTop: "10px" }}>
        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>Friss forma</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", flexWrap: "wrap" }}>
          {player.goalsByRecentRound.map((goals, index) => (
            <div
              key={`${player.player}-${index}`}
              title={`${index + 1}. minta: ${goals} gól`}
              style={{
                width: isMobile ? "12px" : "14px",
                height: `${Math.max(8, goals * 12 + 8)}px`,
                borderRadius: "999px",
                backgroundColor: index === player.goalsByRecentRound.length - 1 ? "#ea580c" : "#fdba74",
              }}
            />
          ))}
          <div style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>
            {player.goalsByRecentRound.join(" - ")}
          </div>
        </div>
      </div>
    </div>
  );
}
