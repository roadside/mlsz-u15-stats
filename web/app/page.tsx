"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import matches from "../data/matches.json";
import tables from "../data/tables.json";
import goalscorers from "../data/goalscorers.json";

type Match = {
  round: number;
  date: string;
  home: string;
  away: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  venue: string;
  source_url: string;
};

type TableRow = {
  pos: string;
  team: string;
  played: string;
  won: string;
  draw: string;
  lost: string;
  gf: string;
  ga: string;
  gd: string;
  points: string;
  form?: string[];
  source_url?: string;
};

type RoundTable = {
  round: number;
  table: TableRow[];
};

type GoalscorerRow = {
  round: number;
  pos: string;
  player: string;
  team: string;
  goals: string;
  source_url: string;
};

type RoundGoalscorers = {
  round: number;
  goalscorers: GoalscorerRow[];
};

type TeamStrengthRow = {
  team: string;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  attackIndex: number;
  defenseIndex: number;
};

type ChampionshipChanceRow = {
  team: string;
  currentPoints: number;
  simulatedAvgPoints: number;
  titlePct: number;
  top3Pct: number;
  top6Pct: number;
  lastPct: number;
};

type PoissonOutcome = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
};

const allMatches = matches as Match[];
const allTables = tables as RoundTable[];
const allGoalscorers = goalscorers as RoundGoalscorers[];
const rounds = Array.from({ length: 22 }, (_, i) => i + 1);

const teamLogos: Record<string, string> = {
  DVSC: "/logos/dvsc.png",
  DVTK: "/logos/dvtk.png",
  "ETO AKADÉMIA": "/logos/eto.png",
  "FERENCVÁROSI TC": "/logos/ferencvaros.png",
  "BUDAPEST HONVÉD FC": "/logos/honved.png",
  "ILLÉS AKADÉMIA": "/logos/illes.png",
  "MTK BUDAPEST": "/logos/mtk.png",
  "PUSKÁS AKADÉMIA": "/logos/puskas.png",
  "VÁRDA LABDARUGÓ AKADÉMIA": "/logos/varda.png",
  "VASAS KUBALA AKADÉMIA": "/logos/vasas.png",
  "VIDEOTON FC FEHÉRVÁR": "/logos/videoton.png",
  UTE: "/logos/ute.png",
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonProbability(lambda: number, goals: number) {
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

function buildPoissonMatrix(
  homeLambda: number,
  awayLambda: number,
  maxGoals = 5
): PoissonOutcome[] {
  const rows: PoissonOutcome[] = [];

  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
      rows.push({
        homeGoals,
        awayGoals,
        probability:
          poissonProbability(homeLambda, homeGoals) *
          poissonProbability(awayLambda, awayGoals),
      });
    }
  }

  return rows.sort((a, b) => b.probability - a.probability);
}

function sampleFromDistribution<T>(
  items: T[],
  getWeight: (item: T) => number
): T {
  const total = items.reduce((sum, item) => sum + getWeight(item), 0);

  if (total <= 0) {
    return items[0];
  }

  const randomValue = Math.random() * total;
  let running = 0;

  for (const item of items) {
    running += getWeight(item);
    if (randomValue <= running) {
      return item;
    }
  }

  return items[items.length - 1];
}

function parseHungarianDate(dateValue: string): Date | null {
  if (!dateValue) return null;

  const match = dateValue
    .trim()
    .match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{1,2}:\d{2})?$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  let hours = 0;
  let minutes = 0;

  if (match[4]) {
    const [h, m] = match[4].split(":");
    hours = Number(h);
    minutes = Number(m);
  }

  return new Date(year, month, day, hours, minutes);
}

function getClosestRound(matchesInput: Match[]): number {
  const now = new Date();

  let bestRound = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const match of matchesInput) {
    const parsedDate = parseHungarianDate(match.date);
    if (!parsedDate) continue;

    const distance = Math.abs(parsedDate.getTime() - now.getTime());

    if (distance < bestDistance) {
      bestDistance = distance;
      bestRound = match.round;
    }
  }

  return bestRound;
}

function getLogo(teamName: string) {
  return teamLogos[teamName] || null;
}

function formatDateParts(dateValue: string) {
  if (!dateValue) {
    return { shortDate: "-", time: "", full: "Nincs dátum" };
  }

  const trimmed = dateValue.trim();
  const match = trimmed.match(
    /^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{1,2}:\d{2})?$/
  );

  if (!match) {
    return {
      shortDate: trimmed,
      time: "",
      full: trimmed,
    };
  }

  return {
    shortDate: `${match[2]}-${match[3]}`,
    time: match[4] || "",
    full: trimmed,
  };
}

function getFormBadgeStyle(form?: string): React.CSSProperties {
  if (!form) {
    return {
      backgroundColor: "#e5e7eb",
      color: "#374151",
    };
  }

  if (form === "GY") {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (form === "V") {
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
  };
}

function getStatusStyle(status: string): React.CSSProperties {
  if (status === "Lejátszva") {
    return { backgroundColor: "#dcfce7", color: "#166534" };
  }

  if (status === "Kiírva") {
    return { backgroundColor: "#dbeafe", color: "#1e40af" };
  }

  if (status === "Halasztva") {
    return { backgroundColor: "#fed7aa", color: "#9a3412" };
  }

  if (status === "Elmaradt") {
    return { backgroundColor: "#fee2e2", color: "#991b1b" };
  }

  return { backgroundColor: "#e5e7eb", color: "#374151" };
}

function MatchCard({
  match,
  isMobile,
}: {
  match: Match;
  isMobile: boolean;
}) {
  const homeLogo = getLogo(match.home);
  const awayLogo = getLogo(match.away);
  const dateParts = formatDateParts(match.date);
  const isPlayed = match.status === "Lejátszva";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "16px",
        padding: isMobile ? "12px" : "16px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 74px 1fr" : "1fr 90px 1fr",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
        }}
      >
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
              marginBottom: "10px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {match.home}
          </div>

          <div
            style={{
              width: isMobile ? "38px" : "46px",
              height: isMobile ? "38px" : "46px",
              margin: "0 auto",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            {homeLogo ? (
              <Image
                src={homeLogo}
                alt={match.home}
                width={isMobile ? 30 : 38}
                height={isMobile ? 30 : 38}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: "12px", color: "#6b7280" }}>N/A</span>
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#cf1626",
            color: "#ffffff",
            borderRadius: "8px",
            padding: isMobile ? "8px 6px" : "10px 8px",
            textAlign: "center",
            fontWeight: 700,
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.12)",
            minHeight: isMobile ? "60px" : "68px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {isPlayed ? (
            <div
              style={{
                fontSize: isMobile ? "24px" : "30px",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {match.home_goals ?? "-"}-{match.away_goals ?? "-"}
            </div>
          ) : (
            <>
              <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1 }}>
                {dateParts.shortDate}
              </div>
              {dateParts.time ? (
                <div
                  style={{
                    fontSize: isMobile ? "16px" : "18px",
                    lineHeight: 1.1,
                    marginTop: "2px",
                  }}
                >
                  {dateParts.time}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
              marginBottom: "10px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {match.away}
          </div>

          <div
            style={{
              width: isMobile ? "38px" : "46px",
              height: isMobile ? "38px" : "46px",
              margin: "0 auto",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            {awayLogo ? (
              <Image
                src={awayLogo}
                alt={match.away}
                width={isMobile ? 30 : 38}
                height={isMobile ? 30 : 38}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: "12px", color: "#6b7280" }}>N/A</span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid #e5e7eb",
          display: "grid",
          gap: "6px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            fontSize: isMobile ? "12px" : "14px",
            color: "#111827",
            fontWeight: 600,
          }}
        >
          <span>{dateParts.full}</span>
          {match.status !== "Lejátszva" ? (
            <span
              style={{
                ...getStatusStyle(match.status),
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {match.status}
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#374151" }}>
          {match.venue || "Nincs megadva"}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedRound, setSelectedRound] = useState<number>(
    getClosestRound(allMatches)
  );
  const [view, setView] = useState<
    "matches" | "table" | "goalscorers" | "stats"
  >("matches");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedHomeTeam, setSelectedHomeTeam] = useState<string>("");
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<string>("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("Összes csapat");

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const filteredMatches = useMemo(() => {
    const roundMatches = allMatches.filter((m) => m.round === selectedRound);

    if (selectedTeamFilter === "Összes csapat") {
      return roundMatches;
    }

    return roundMatches.filter(
      (m) => m.home === selectedTeamFilter || m.away === selectedTeamFilter
    );
  }, [selectedRound, selectedTeamFilter]);

  const selectedTable = useMemo(() => {
    return allTables.find((t) => t.round === selectedRound);
  }, [selectedRound]);

  const selectedGoalscorers = useMemo(() => {
    return allGoalscorers.find((g) => g.round === selectedRound);
  }, [selectedRound]);

  const filteredGoalscorers = useMemo(() => {
    if (!selectedGoalscorers) return null;

    if (selectedTeamFilter === "Összes csapat") {
      return selectedGoalscorers.goalscorers;
    }

    return selectedGoalscorers.goalscorers.filter(
      (g) => g.team === selectedTeamFilter
    );
  }, [selectedGoalscorers, selectedTeamFilter]);


  const selectedTeamProfile = useMemo(() => {
    if (selectedTeamFilter === "Összes csapat") {
      return null;
    }

    const tableRow = selectedTable?.table.find(
      (row) => row.team === selectedTeamFilter
    );

    const teamMatches = allMatches.filter(
      (m) => m.home === selectedTeamFilter || m.away === selectedTeamFilter
    );

    const playedTeamMatches = teamMatches.filter(
      (m) => typeof m.home_goals === "number" && typeof m.away_goals === "number"
    );

    return {
      team: selectedTeamFilter,
      position: tableRow?.pos ?? null,
      points: tableRow?.points ?? null,
      goalDifference: tableRow?.gd ?? null,
      playedMatches: playedTeamMatches.length,
      form: tableRow?.form ?? [],
    };
  }, [selectedTeamFilter, selectedTable]);

  const playedMatches = useMemo(() => {
    return allMatches.filter(
      (m) =>
        m.status === "Lejátszva" &&
        m.home_goals !== null &&
        m.away_goals !== null
    );
  }, []);

  const teamOptions = useMemo(() => {
    return Array.from(new Set(allMatches.flatMap((m) => [m.home, m.away]))).sort(
      (a, b) => a.localeCompare(b, "hu")
    );
  }, []);

  useEffect(() => {
    if (teamOptions.length > 0 && !selectedHomeTeam) {
      setSelectedHomeTeam(teamOptions[0]);
    }

    if (teamOptions.length > 1 && !selectedAwayTeam) {
      setSelectedAwayTeam(teamOptions[1]);
    } else if (teamOptions.length > 0 && !selectedAwayTeam) {
      setSelectedAwayTeam(teamOptions[0]);
    }
  }, [teamOptions, selectedHomeTeam, selectedAwayTeam]);

  useEffect(() => {
    if (
      selectedTeamFilter !== "Összes csapat" &&
      !teamOptions.includes(selectedTeamFilter)
    ) {
      setSelectedTeamFilter("Összes csapat");
    }
  }, [selectedTeamFilter, teamOptions]);

  const teamStrengthStats = useMemo(() => {
    const teamMap = new Map<
      string,
      { matches: number; goalsFor: number; goalsAgainst: number }
    >();

    let totalGoals = 0;

    for (const match of playedMatches) {
      const homeGoals = match.home_goals ?? 0;
      const awayGoals = match.away_goals ?? 0;

      totalGoals += homeGoals + awayGoals;

      const homeStats = teamMap.get(match.home) ?? {
        matches: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };

      homeStats.matches += 1;
      homeStats.goalsFor += homeGoals;
      homeStats.goalsAgainst += awayGoals;
      teamMap.set(match.home, homeStats);

      const awayStats = teamMap.get(match.away) ?? {
        matches: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };

      awayStats.matches += 1;
      awayStats.goalsFor += awayGoals;
      awayStats.goalsAgainst += homeGoals;
      teamMap.set(match.away, awayStats);
    }

    const leagueAvgGoalsPerTeamPerMatch =
      playedMatches.length > 0 ? totalGoals / (playedMatches.length * 2) : 0;

    const rows: TeamStrengthRow[] = Array.from(teamMap.entries())
      .map(([team, stats]) => {
        const goalsForPerMatch =
          stats.matches > 0 ? stats.goalsFor / stats.matches : 0;

        const goalsAgainstPerMatch =
          stats.matches > 0 ? stats.goalsAgainst / stats.matches : 0;

        const attackIndex =
          leagueAvgGoalsPerTeamPerMatch > 0
            ? goalsForPerMatch / leagueAvgGoalsPerTeamPerMatch
            : 0;

        const defenseIndex =
          goalsAgainstPerMatch > 0
            ? leagueAvgGoalsPerTeamPerMatch / goalsAgainstPerMatch
            : 2;

        return {
          team,
          matches: stats.matches,
          goalsFor: stats.goalsFor,
          goalsAgainst: stats.goalsAgainst,
          goalsForPerMatch: round2(goalsForPerMatch),
          goalsAgainstPerMatch: round2(goalsAgainstPerMatch),
          attackIndex: round2(attackIndex),
          defenseIndex: round2(defenseIndex),
        };
      })
      .sort((a, b) => b.attackIndex - a.attackIndex);

    return {
      rows,
      leagueAvgGoalsPerTeamPerMatch: round2(leagueAvgGoalsPerTeamPerMatch),
    };
  }, [playedMatches]);

  const roundGoalsStats = useMemo(() => {
    const result = rounds.map((round) => {
      const roundMatches = allMatches.filter(
        (m) =>
          m.round === round &&
          m.status === "Lejátszva" &&
          m.home_goals !== null &&
          m.away_goals !== null
      );

      const totalGoals = roundMatches.reduce((sum, m) => {
        return sum + (m.home_goals ?? 0) + (m.away_goals ?? 0);
      }, 0);

      const avgGoals =
        roundMatches.length > 0 ? totalGoals / roundMatches.length : 0;

      return {
        round,
        totalGoals,
        avgGoals: round2(avgGoals),
      };
    });

    const maxGoals = Math.max(...result.map((r) => r.totalGoals), 1);

    return { rows: result, maxGoals };
  }, []);

  const topScoringTeamsStats = useMemo(() => {
    const teamGoalsMap = new Map<string, number>();

    for (const match of allMatches) {
      if (
        match.status !== "Lejátszva" ||
        match.home_goals === null ||
        match.away_goals === null
      ) {
        continue;
      }

      teamGoalsMap.set(
        match.home,
        (teamGoalsMap.get(match.home) ?? 0) + match.home_goals
      );

      teamGoalsMap.set(
        match.away,
        (teamGoalsMap.get(match.away) ?? 0) + match.away_goals
      );
    }

    const rows = Array.from(teamGoalsMap.entries())
      .map(([team, goals]) => ({ team, goals }))
      .sort((a, b) => b.goals - a.goals);

    const maxGoals = Math.max(...rows.map((r) => r.goals), 1);

    return { rows, maxGoals };
  }, []);

  const visibleTeamStrengthRows = useMemo(() => {
    if (selectedTeamFilter === "Összes csapat") {
      return teamStrengthStats.rows;
    }

    return teamStrengthStats.rows.filter((row) => row.team === selectedTeamFilter);
  }, [teamStrengthStats, selectedTeamFilter]);

  const visibleTopScoringTeamsRows = useMemo(() => {
    if (selectedTeamFilter === "Összes csapat") {
      return topScoringTeamsStats.rows;
    }

    return topScoringTeamsStats.rows.filter((row) => row.team === selectedTeamFilter);
  }, [topScoringTeamsStats, selectedTeamFilter]);

  const selectedHomeStats = useMemo(() => {
    return teamStrengthStats.rows.find((t) => t.team === selectedHomeTeam) ?? null;
  }, [teamStrengthStats, selectedHomeTeam]);

  const selectedAwayStats = useMemo(() => {
    return teamStrengthStats.rows.find((t) => t.team === selectedAwayTeam) ?? null;
  }, [teamStrengthStats, selectedAwayTeam]);

  const poissonPrediction = useMemo(() => {
    if (!selectedHomeStats || !selectedAwayStats) {
      return null;
    }

    const leagueBase = teamStrengthStats.leagueAvgGoalsPerTeamPerMatch;

    const homeLambda =
      selectedAwayStats.defenseIndex > 0
        ? round2(
            (leagueBase * selectedHomeStats.attackIndex) /
              selectedAwayStats.defenseIndex
          )
        : 0;

    const awayLambda =
      selectedHomeStats.defenseIndex > 0
        ? round2(
            (leagueBase * selectedAwayStats.attackIndex) /
              selectedHomeStats.defenseIndex
          )
        : 0;

    const matrix = buildPoissonMatrix(homeLambda, awayLambda, 5);
    const top3 = matrix.slice(0, 3).map((row) => ({
      ...row,
      probabilityPercent: round2(row.probability * 100),
    }));

    const homeWin =
      matrix
        .filter((m) => m.homeGoals > m.awayGoals)
        .reduce((sum, m) => sum + m.probability, 0) * 100;

    const draw =
      matrix
        .filter((m) => m.homeGoals === m.awayGoals)
        .reduce((sum, m) => sum + m.probability, 0) * 100;

    const awayWin =
      matrix
        .filter((m) => m.homeGoals < m.awayGoals)
        .reduce((sum, m) => sum + m.probability, 0) * 100;

    return {
      homeLambda: round2(homeLambda),
      awayLambda: round2(awayLambda),
      top3,
      homeWin: round2(homeWin),
      draw: round2(draw),
      awayWin: round2(awayWin),
    };
  }, [selectedHomeStats, selectedAwayStats, teamStrengthStats]);

  const championshipMonteCarlo = useMemo(() => {
    const playedMatchesOnly = allMatches.filter(
      (m) =>
        m.status === "Lejátszva" &&
        m.home_goals !== null &&
        m.away_goals !== null
    );

    const upcomingMatches = allMatches.filter(
      (m) => m.status !== "Lejátszva" && m.home_goals === null && m.away_goals === null
    );

    const currentPointsMap = new Map<string, number>();
    const currentGoalDiffMap = new Map<string, number>();
    const currentGoalsForMap = new Map<string, number>();

    for (const team of teamOptions) {
      currentPointsMap.set(team, 0);
      currentGoalDiffMap.set(team, 0);
      currentGoalsForMap.set(team, 0);
    }

    for (const match of playedMatchesOnly) {
      const homeGoals = match.home_goals ?? 0;
      const awayGoals = match.away_goals ?? 0;

      currentGoalsForMap.set(
        match.home,
        (currentGoalsForMap.get(match.home) ?? 0) + homeGoals
      );

      currentGoalsForMap.set(
        match.away,
        (currentGoalsForMap.get(match.away) ?? 0) + awayGoals
      );

      currentGoalDiffMap.set(
        match.home,
        (currentGoalDiffMap.get(match.home) ?? 0) + (homeGoals - awayGoals)
      );

      currentGoalDiffMap.set(
        match.away,
        (currentGoalDiffMap.get(match.away) ?? 0) + (awayGoals - homeGoals)
      );

      if (homeGoals > awayGoals) {
        currentPointsMap.set(
          match.home,
          (currentPointsMap.get(match.home) ?? 0) + 3
        );
      } else if (homeGoals < awayGoals) {
        currentPointsMap.set(
          match.away,
          (currentPointsMap.get(match.away) ?? 0) + 3
        );
      } else {
        currentPointsMap.set(
          match.home,
          (currentPointsMap.get(match.home) ?? 0) + 1
        );
        currentPointsMap.set(
          match.away,
          (currentPointsMap.get(match.away) ?? 0) + 1
        );
      }
    }

    const simulationCount = 3000;
    const titleCounts = new Map<string, number>();
    const top3Counts = new Map<string, number>();
    const top6Counts = new Map<string, number>();
    const lastCounts = new Map<string, number>();
    const totalPointsSums = new Map<string, number>();

    for (const team of teamOptions) {
      titleCounts.set(team, 0);
      top3Counts.set(team, 0);
      top6Counts.set(team, 0);
      lastCounts.set(team, 0);
      totalPointsSums.set(team, 0);
    }

    for (let simulation = 0; simulation < simulationCount; simulation++) {
      const simPoints = new Map(currentPointsMap);
      const simGoalDiff = new Map(currentGoalDiffMap);
      const simGoalsFor = new Map(currentGoalsForMap);

      for (const match of upcomingMatches) {
        const homeStats = teamStrengthStats.rows.find((t) => t.team === match.home);
        const awayStats = teamStrengthStats.rows.find((t) => t.team === match.away);

        if (!homeStats || !awayStats) continue;

        const leagueBase = teamStrengthStats.leagueAvgGoalsPerTeamPerMatch;

        const homeLambda =
          awayStats.defenseIndex > 0
            ? (leagueBase * homeStats.attackIndex) / awayStats.defenseIndex
            : 0.01;

        const awayLambda =
          homeStats.defenseIndex > 0
            ? (leagueBase * awayStats.attackIndex) / homeStats.defenseIndex
            : 0.01;

        const matrix = buildPoissonMatrix(homeLambda, awayLambda, 5);
        const sampled = sampleFromDistribution(matrix, (item) => item.probability);

        simGoalsFor.set(
          match.home,
          (simGoalsFor.get(match.home) ?? 0) + sampled.homeGoals
        );
        simGoalsFor.set(
          match.away,
          (simGoalsFor.get(match.away) ?? 0) + sampled.awayGoals
        );

        simGoalDiff.set(
          match.home,
          (simGoalDiff.get(match.home) ?? 0) +
            (sampled.homeGoals - sampled.awayGoals)
        );
        simGoalDiff.set(
          match.away,
          (simGoalDiff.get(match.away) ?? 0) +
            (sampled.awayGoals - sampled.homeGoals)
        );

        if (sampled.homeGoals > sampled.awayGoals) {
          simPoints.set(match.home, (simPoints.get(match.home) ?? 0) + 3);
        } else if (sampled.homeGoals < sampled.awayGoals) {
          simPoints.set(match.away, (simPoints.get(match.away) ?? 0) + 3);
        } else {
          simPoints.set(match.home, (simPoints.get(match.home) ?? 0) + 1);
          simPoints.set(match.away, (simPoints.get(match.away) ?? 0) + 1);
        }
      }

      const ranking = teamOptions
        .map((team) => ({
          team,
          points: simPoints.get(team) ?? 0,
          goalDiff: simGoalDiff.get(team) ?? 0,
          goalsFor: simGoalsFor.get(team) ?? 0,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          return a.team.localeCompare(b.team, "hu");
        });

      ranking.forEach((row, index) => {
        totalPointsSums.set(
          row.team,
          (totalPointsSums.get(row.team) ?? 0) + row.points
        );

        if (index === 0) {
          titleCounts.set(row.team, (titleCounts.get(row.team) ?? 0) + 1);
        }
        if (index < 3) {
          top3Counts.set(row.team, (top3Counts.get(row.team) ?? 0) + 1);
        }
        if (index < 6) {
          top6Counts.set(row.team, (top6Counts.get(row.team) ?? 0) + 1);
        }
        if (index === ranking.length - 1) {
          lastCounts.set(row.team, (lastCounts.get(row.team) ?? 0) + 1);
        }
      });
    }

    const rows: ChampionshipChanceRow[] = teamOptions
      .map((team) => ({
        team,
        currentPoints: currentPointsMap.get(team) ?? 0,
        simulatedAvgPoints: round2(
          (totalPointsSums.get(team) ?? 0) / simulationCount
        ),
        titlePct: round2(((titleCounts.get(team) ?? 0) / simulationCount) * 100),
        top3Pct: round2(((top3Counts.get(team) ?? 0) / simulationCount) * 100),
        top6Pct: round2(((top6Counts.get(team) ?? 0) / simulationCount) * 100),
        lastPct: round2(((lastCounts.get(team) ?? 0) / simulationCount) * 100),
      }))
      .sort((a, b) => b.titlePct - a.titlePct);

    const maxTitlePct = Math.max(...rows.map((r) => r.titlePct), 1);

    return { rows, simulationCount, maxTitlePct };
  }, [teamOptions, teamStrengthStats]);

  const visibleMonteCarloRows = useMemo(() => {
    if (selectedTeamFilter === "Összes csapat") {
      return championshipMonteCarlo.rows;
    }

    return championshipMonteCarlo.rows.filter(
      (row) => row.team === selectedTeamFilter
    );
  }, [championshipMonteCarlo, selectedTeamFilter]);

  return (
    <main
      style={{
        padding: isMobile ? "12px" : "20px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        color: "#111827",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? "22px" : "30px",
          lineHeight: 1.2,
          marginBottom: "8px",
        }}
      >
        MLSZ Országos U15 Kiemelt
      </h1>

      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => setView("matches")} style={tabButtonStyle(view === "matches")}>
            Meccsek
          </button>
          <button onClick={() => setView("table")} style={tabButtonStyle(view === "table")}>
            Tabella
          </button>
          <button
            onClick={() => setView("goalscorers")}
            style={tabButtonStyle(view === "goalscorers")}
          >
            Góllövők
          </button>
          <button onClick={() => setView("stats")} style={tabButtonStyle(view === "stats")}>
            Statisztika
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "280px",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: isMobile ? "15px" : "16px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              Csapat kiválasztása
            </div>

            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="Összes csapat">Összes csapat</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            fontSize: isMobile ? "15px" : "16px",
            fontWeight: "bold",
            marginBottom: "10px",
          }}
        >
          Forduló kiválasztása
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "8px",
          }}
        >
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              style={{
                minWidth: isMobile ? "40px" : "48px",
                padding: isMobile ? "9px 10px" : "10px 12px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                backgroundColor: selectedRound === round ? "#2563eb" : "#ffffff",
                color: selectedRound === round ? "#ffffff" : "#111827",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {round}
            </button>
          ))}
        </div>
      </div>

      {selectedTeamProfile && (
        <section style={sectionCardStyle}>
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
              <div style={statValueStyle}>
                {selectedTeamProfile.position ?? "-"}
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Pont</div>
              <div style={statValueStyle}>
                {selectedTeamProfile.points ?? "-"}
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Gólkülönbség</div>
              <div style={statValueStyle}>
                {selectedTeamProfile.goalDifference ?? "-"}
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Lejátszott meccsek</div>
              <div style={statValueStyle}>
                {selectedTeamProfile.playedMatches}
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Forma</div>
              {selectedTeamProfile.form?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    alignItems: "center",
                    minHeight: "40px",
                  }}
                >
                  {selectedTeamProfile.form.map((formItem, index) => (
                    <span
                      key={`${selectedTeamProfile.team}-form-${index}`}
                      style={{
                        ...getFormBadgeStyle(formItem),
                        minWidth: isMobile ? "34px" : "38px",
                        height: isMobile ? "32px" : "34px",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? "15px" : "16px",
                        fontWeight: 800,
                        lineHeight: 1,
                        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.05)",
                      }}
                    >
                      {formItem}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={statValueStyle}>-</div>
              )}
            </div>
          </div>
        </section>
      )}

      {view === "matches" ? (
        <>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
            {selectedTeamFilter === "Összes csapat"
              ? `${selectedRound}. forduló meccsei`
              : `${selectedRound}. forduló – ${selectedTeamFilter} meccsei`}
          </h2>

          {filteredMatches.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető meccs." />
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredMatches.map((m, i) => (
                <MatchCard key={i} match={m} isMobile={isMobile} />
              ))}
            </div>
          )}
        </>
      ) : view === "table" ? (
        <>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
            {selectedRound}. forduló tabellája
          </h2>

          {!selectedTable || selectedTable.table.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető tabella." />
          ) : isMobile ? (
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
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#111827",
                          textAlign: "center",
                        }}
                      >
                        {row.pos}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <LogoCircle logo={logo} team={row.team} size={26} />
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#111827",
                            lineHeight: 1.2,
                          }}
                        >
                          {row.team}
                        </div>
                      </div>

                      <div style={{ fontSize: "18px", fontWeight: 800 }}>{row.points}</div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                        marginBottom: "10px",
                      }}
                    >
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
                          <span
                            key={idx}
                            style={{
                              ...getFormBadgeStyle(f),
                              display: "inline-block",
                              minWidth: "30px",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {f}
                          </span>
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
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                justifyContent: "center",
                                flexWrap: "nowrap",
                              }}
                            >
                              {row.form.map((f, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    ...getFormBadgeStyle(f),
                                    display: "inline-block",
                                    minWidth: "32px",
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                    textAlign: "center",
                                  }}
                                >
                                  {f}
                                </span>
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
      ) : view === "goalscorers" ? (
        <>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
            {selectedTeamFilter === "Összes csapat"
              ? `${selectedRound}. forduló góllövői`
              : `${selectedRound}. forduló – ${selectedTeamFilter} góllövői`}
          </h2>

          {!selectedGoalscorers || !filteredGoalscorers || filteredGoalscorers.length === 0 ? (
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
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "16px",
                        textAlign: "center",
                      }}
                    >
                      {row.pos}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.player}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        {row.team}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "20px",
                        color: "#166534",
                      }}
                    >
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
        </>
      ) : (
        <>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
            Liga statisztika
          </h2>

          <div style={{ display: "grid", gap: "16px" }}>
            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Góltrend fordulónként</div>
              <div style={sectionSubTitleStyle}>
                Fordulónkénti összgól
              </div>

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
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          textAlign: "right",
                        }}
                      >
                        {row.totalGoals} gól
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Csapat támadó / védekező index</div>
              <div style={sectionSubTitleStyle}>
                Támadó index: 1 felett jobb a ligaátlagnál. Védekező index: 1 felett jobb
                védekezés.
              </div>

              {isMobile ? (
                <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                  {visibleTeamStrengthRows.map((row) => {
                    const logo = getLogo(row.team);

                    return (
                      <div key={row.team} style={mobileCardStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <LogoCircle logo={logo} team={row.team} size={26} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.team}</div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {row.matches} meccs
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <MiniStat label="LG" value={row.goalsFor} />
                          <MiniStat label="KG" value={row.goalsAgainst} />
                          <MiniStat label="LG / meccs" value={row.goalsForPerMatch} />
                          <MiniStat label="KG / meccs" value={row.goalsAgainstPerMatch} />
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                          }}
                        >
                          <MiniStat
                            label="Támadó index"
                            value={row.attackIndex}
                            valueColor="#166534"
                            strong
                          />
                          <MiniStat
                            label="Védekező index"
                            value={row.defenseIndex}
                            valueColor="#1d4ed8"
                            strong
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={tableWrapStyle}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "900px",
                      backgroundColor: "#ffffff",
                    }}
                  >
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
                            <td style={{ ...tdStyle, fontWeight: "bold", color: "#166534" }}>
                              {row.attackIndex}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: "bold", color: "#1d4ed8" }}>
                              {row.defenseIndex}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Poisson meccs-előrejelző</div>
              <div style={sectionSubTitleStyle}>
                A becslés a csapatok támadó és védekező indexéből számolt várható
                gólértékekre épül.
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
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Hazai csapat
                  </div>
                  <select
                    value={selectedHomeTeam}
                    onChange={(e) => setSelectedHomeTeam(e.target.value)}
                    style={selectStyle}
                  >
                    {teamOptions.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Vendég csapat
                  </div>
                  <select
                    value={selectedAwayTeam}
                    onChange={(e) => setSelectedAwayTeam(e.target.value)}
                    style={selectStyle}
                  >
                    {teamOptions.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {poissonPrediction && selectedHomeStats && selectedAwayStats ? (
                <div style={{ display: "grid", gap: "14px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <MetricCard label="Hazai várható gól" value={poissonPrediction.homeLambda} />
                    <MetricCard label="Vendég várható gól" value={poissonPrediction.awayLambda} />
                    <MetricCard
                      label="Hazai győzelem"
                      value={`${poissonPrediction.homeWin}%`}
                      valueColor="#166534"
                    />
                    <MetricCard
                      label="Döntetlen / vendég"
                      value={`${poissonPrediction.draw}% / ${poissonPrediction.awayWin}%`}
                    />
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
                          <div style={{ fontSize: "13px", color: "#111827" }}>
                            {row.probabilityPercent}%
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={tableWrapStyle}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          minWidth: "600px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#e5e7eb" }}>
                            <th style={thStyle}>#</th>
                            <th style={{ ...thStyle, textAlign: "left" }}>
                              Legvalószínűbb eredmény
                            </th>
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
                              <td style={{ ...tdStyle, fontWeight: "bold" }}>
                                {row.probabilityPercent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <TeamInfoCard
                      team={selectedHomeTeam}
                      attackIndex={selectedHomeStats.attackIndex}
                      defenseIndex={selectedHomeStats.defenseIndex}
                    />
                    <TeamInfoCard
                      team={selectedAwayTeam}
                      attackIndex={selectedAwayStats.attackIndex}
                      defenseIndex={selectedAwayStats.defenseIndex}
                    />
                  </div>
                </div>
              ) : (
                <EmptyBox text="Nincs elég adat az előrejelzéshez." />
              )}
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Bajnoki esélymodell – Monte Carlo</div>
              <div style={sectionSubTitleStyle}>
                {championshipMonteCarlo.simulationCount} szezonfutás alapján becsült
                bajnoki, top 3, top 6 és utolsó hely valószínűségek.
              </div>

              {isMobile ? (
                <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                  {visibleMonteCarloRows.map((row) => {
                    const logo = getLogo(row.team);

                    return (
                      <div key={row.team} style={mobileCardStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <LogoCircle logo={logo} team={row.team} size={26} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700 }}>{row.team}</div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              Jelenlegi pont: {row.currentPoints} • Várható: {row.simulatedAvgPoints}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                          }}
                        >
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
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "950px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#e5e7eb" }}>
                        <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                        <th style={thStyle}>Jelenlegi pont</th>
                        <th style={thStyle}>Várható pont</th>
                        <th style={thStyle}>Bajnoki esély</th>
                        <th style={thStyle}>Top 3</th>
                        <th style={thStyle}>Top 6</th>
                        <th style={thStyle}>Utolsó hely</th>
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
                            <td style={tdStyle}>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 52px",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
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
                                      width: `${
                                        (row.titlePct / championshipMonteCarlo.maxTitlePct) * 100
                                      }%`,
                                      height: "100%",
                                      backgroundColor: "#2563eb",
                                      borderRadius: "999px",
                                    }}
                                  />
                                </div>
                                <div style={{ fontWeight: "bold" }}>{row.titlePct}%</div>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontWeight: "bold", color: "#166534" }}>
                              {row.top3Pct}%
                            </td>
                            <td style={{ ...tdStyle, fontWeight: "bold", color: "#1d4ed8" }}>
                              {row.top6Pct}%
                            </td>
                            <td style={{ ...tdStyle, fontWeight: "bold", color: "#991b1b" }}>
                              {row.lastPct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Legtöbb gólt szerző csapatok</div>

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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          minWidth: 0,
                        }}
                      >
                        <LogoCircle logo={logo} team={row.team} size={24} />
                        <div
                          style={{
                            fontSize: isMobile ? "13px" : "14px",
                            color: "#111827",
                            fontWeight: 600,
                            minWidth: 0,
                          }}
                        >
                          {row.team}
                        </div>
                      </div>

                      {!isMobile ? (
                        <div
                          style={{
                            backgroundColor: "#e5e7eb",
                            height: "18px",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
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

                      <div
                        style={{
                          fontSize: isMobile ? "13px" : "14px",
                          color: "#111827",
                          fontWeight: "bold",
                          textAlign: "right",
                        }}
                      >
                        {row.goals}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      {text}
    </div>
  );
}

function LogoCircle({
  logo,
  team,
  size,
}: {
  logo: string | null;
  team: string;
  size: number;
}) {
  return (
    <div
      style={{
        width: `${size + 4}px`,
        height: `${size + 4}px`,
        minWidth: `${size + 4}px`,
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {logo ? (
        <Image
          src={logo}
          alt={team}
          width={size}
          height={size}
          style={{ objectFit: "contain" }}
        />
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  strong,
  valueColor,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "8px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{label}</div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: strong ? 800 : 700,
          color: valueColor || "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: valueColor || "#111827",
          marginTop: "4px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TeamInfoCard({
  team,
  attackIndex,
  defenseIndex,
}: {
  team: string;
  attackIndex: number;
  defenseIndex: number;
}) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>{team}</div>
      <div style={{ fontSize: "13px", color: "#374151" }}>
        Támadó index: <strong>{attackIndex}</strong>
      </div>
      <div style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>
        Védekező index: <strong>{defenseIndex}</strong>
      </div>
    </div>
  );
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    backgroundColor: active ? "#2563eb" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    fontWeight: "bold",
    cursor: "pointer",
  };
}

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "14px",
  padding: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "8px",
  color: "#111827",
};

const sectionSubTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  marginTop: "12px",
};

const mobileCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
};


const statCardStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "6px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
};

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  borderBottom: "1px solid #d1d5db",
  fontSize: "14px",
  color: "#111827",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
  color: "#111827",
};