"use client";

import { useMemo, useState, useEffect } from "react";
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

const allMatches = matches as Match[];
const allTables = tables as RoundTable[];
const allGoalscorers = goalscorers as RoundGoalscorers[];
const rounds = Array.from({ length: 22 }, (_, i) => i + 1);

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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function poissonProbability(lambda: number, goals: number) {
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function buildPoissonMatrix(
  homeLambda: number,
  awayLambda: number,
  maxGoals = 5
): PoissonOutcome[] {
  const rows: PoissonOutcome[] = [];

  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
      const probability =
        poissonProbability(homeLambda, homeGoals) *
        poissonProbability(awayLambda, awayGoals);

      rows.push({
        homeGoals,
        awayGoals,
        probability,
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

function getClosestRound(matches: Match[]): number {
  const now = new Date();

  let bestRound = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const match of matches) {
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

const teamLogos: Record<string, string> = {
  "DVSC": "/logos/dvsc.png",
  "DVTK": "/logos/dvtk.png",
  "ETO AKADÉMIA": "/logos/eto.png",
  "FERENCVÁROSI TC": "/logos/ferencvaros.png",
  "BUDAPEST HONVÉD FC": "/logos/honved.png",
  "ILLÉS AKADÉMIA": "/logos/illes.png",
  "MTK BUDAPEST": "/logos/mtk.png",
  "PUSKÁS AKADÉMIA": "/logos/puskas.png",
  "VÁRDA LABDARUGÓ AKADÉMIA": "/logos/varda.png",
  "VASAS KUBALA AKADÉMIA": "/logos/vasas.png",
  "VIDEOTON FC FEHÉRVÁR": "/logos/videoton.png",
  "UTE": "/logos/ute.png",
};

function getLogo(teamName: string) {
  return teamLogos[teamName] || null;
}

function formatDateParts(dateValue: string) {
  if (!dateValue) {
    return { shortDate: "-", time: "", full: "Nincs dátum" };
  }

  const trimmed = dateValue.trim();

  const match = trimmed.match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.\s*(\d{1,2}:\d{2})?$/);
  if (match) {
    const month = match[2];
    const day = match[3];
    const time = match[4] || "";
    return {
      shortDate: `${month}-${day}`,
      time,
      full: trimmed,
    };
  }

  const matchWithoutTrailingDot = trimmed.match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{1,2}:\d{2})?$/);
  if (matchWithoutTrailingDot) {
    const month = matchWithoutTrailingDot[2];
    const day = matchWithoutTrailingDot[3];
    const time = matchWithoutTrailingDot[4] || "";
    return {
      shortDate: `${month}-${day}`,
      time,
      full: trimmed,
    };
  }

  return {
    shortDate: trimmed,
    time: "",
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
    return {
      backgroundColor: "#dcfce7",
      color: "#166534"
    }
  }

  if (status === "Kiírva") {
    return {
      backgroundColor: "#dbeafe",
      color: "#1e40af"
    }
  }

  if (status === "Halasztva") {
    return {
      backgroundColor: "#fed7aa",
      color: "#9a3412"
    }
  }

  if (status === "Elmaradt") {
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b"
    }
  }

  return {
    backgroundColor: "#e5e7eb",
    color: "#374151"
  }
}

function MatchCard({ match }: { match: Match }) {
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
        padding: "16px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 1fr",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "13px",
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
              width: "46px",
              height: "46px",
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
                width={38}
                height={38}
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
            borderRadius: "6px",
            padding: "10px 8px",
            textAlign: "center",
            fontWeight: 700,
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.12)",
            minHeight: "68px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {isPlayed ? (
            <div
              style={{
                fontSize: "30px",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {match.home_goals ?? "-"}-{match.away_goals ?? "-"}
            </div>
          ) : (
            <>
              <div style={{ fontSize: "18px", lineHeight: 1.1 }}>
                {dateParts.shortDate}
              </div>
              {dateParts.time ? (
                <div style={{ fontSize: "18px", lineHeight: 1.1, marginTop: "2px" }}>
                  {dateParts.time}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "13px",
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
              width: "46px",
              height: "46px",
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
                width={38}
                height={38}
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
			  justifyContent: "space-between",
			  alignItems: "center",
			  fontSize: "14px",
			  color: "#111827",
			  fontWeight: 600,
			}}
		  >
			<span>{dateParts.full}</span>
			{match.status !== "Lejátszva" && (
			  <span
				style={{
				  ...getStatusStyle(match.status),
				  fontSize: "11px",
				  padding: "3px 8px",
				  borderRadius: "6px",
				  fontWeight: 600
				}}
			  >
				{match.status}
			  </span>
			)}
		  </div>

		  <div style={{ fontSize: "14px", color: "#374151" }}>
			{match.venue || "Nincs megadva"}
		  </div>
		</div>
    </div>
  );
}

export default function Home() {
  const [selectedRound, setSelectedRound] = useState<number>(getClosestRound(allMatches));
  const [view, setView] = useState<"matches" | "table" | "goalscorers" | "stats">("matches");

  const filteredMatches = useMemo(() => {
    return allMatches.filter((m) => m.round === selectedRound);
  }, [selectedRound]);

  const selectedTable = useMemo(() => {
    return allTables.find((t) => t.round === selectedRound);
  }, [selectedRound]);

  const selectedGoalscorers = useMemo(() => {
    return allGoalscorers.find((g) => g.round === selectedRound);
  }, [selectedRound]);

  const playedMatches = useMemo(() => {
    return allMatches.filter(
      (m) =>
        m.status === "Lejátszva" &&
        m.home_goals !== null &&
        m.away_goals !== null
    );
  }, []);

  const teamOptions = useMemo(() => {
    return Array.from(
      new Set(
        playedMatches.flatMap((m) => [m.home, m.away])
      )
    ).sort((a, b) => a.localeCompare(b, "hu"));
  }, [playedMatches]);

  const [selectedHomeTeam, setSelectedHomeTeam] = useState<string>("");
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<string>("");

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

  const teamStrengthStats = useMemo(() => {
    const teamMap = new Map<
      string,
      {
        matches: number;
        goalsFor: number;
        goalsAgainst: number;
      }
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

    return {
      rows: result,
      maxGoals,
    };
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
      .map(([team, goals]) => ({
        team,
        goals,
      }))
      .sort((a, b) => b.goals - a.goals);

    const maxGoals = Math.max(...rows.map((r) => r.goals), 1);

    return {
      rows,
      maxGoals,
    };
  }, []);

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
        ? round2((leagueBase * selectedHomeStats.attackIndex) / selectedAwayStats.defenseIndex)
        : 0;

    const awayLambda =
      selectedHomeStats.defenseIndex > 0
        ? round2((leagueBase * selectedAwayStats.attackIndex) / selectedHomeStats.defenseIndex)
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
      (m) =>
        m.status !== "Lejátszva" &&
        m.home_goals === null &&
        m.away_goals === null
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

    const simulationCount = 5000;

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

        if (!homeStats || !awayStats) {
          continue;
        }

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
          (simGoalDiff.get(match.home) ?? 0) + (sampled.homeGoals - sampled.awayGoals)
        );

        simGoalDiff.set(
          match.away,
          (simGoalDiff.get(match.away) ?? 0) + (sampled.awayGoals - sampled.homeGoals)
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
        simulatedAvgPoints: round2((totalPointsSums.get(team) ?? 0) / simulationCount),
        titlePct: round2(((titleCounts.get(team) ?? 0) / simulationCount) * 100),
        top3Pct: round2(((top3Counts.get(team) ?? 0) / simulationCount) * 100),
        top6Pct: round2(((top6Counts.get(team) ?? 0) / simulationCount) * 100),
        lastPct: round2(((lastCounts.get(team) ?? 0) / simulationCount) * 100),
      }))
      .sort((a, b) => b.titlePct - a.titlePct);

    const maxTitlePct = Math.max(...rows.map((r) => r.titlePct), 1);

    return {
      rows,
      simulationCount,
      maxTitlePct,
    };
  }, [allMatches, teamOptions, teamStrengthStats]);  
  
  
  
  
  return (
    <main
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        color: "#111827",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "30px", marginBottom: "8px" }}>MLSZ Országos U15 Kiemelt</h1>

      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          <button
            onClick={() => setView("matches")}
            style={tabButtonStyle(view === "matches")}
          >
            Meccsek
          </button>

          <button
            onClick={() => setView("table")}
            style={tabButtonStyle(view === "table")}
          >
            Tabella
          </button>

          <button
            onClick={() => setView("goalscorers")}
            style={tabButtonStyle(view === "goalscorers")}
          >
            Góllövők
          </button>

          <button
            onClick={() => setView("stats")}
            style={tabButtonStyle(view === "stats")}
          >
            Statisztika
          </button>
        </div>

        <div
          style={{
            fontSize: "16px",
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
            paddingBottom: "8px",
          }}
        >
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              style={{
                minWidth: "48px",
                padding: "10px 12px",
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

      {view === "matches" ? (
        <>
          <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>
            {selectedRound}. forduló meccsei
          </h2>

          {filteredMatches.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető meccs." />
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredMatches.map((m, i) => (
                <MatchCard key={i} match={m} />
              ))}
            </div>
          )}
        </>
      ) : view === "table" ? (
        <>
          <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>
            {selectedRound}. forduló tabellája
          </h2>

          {!selectedTable || selectedTable.table.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető tabella." />
          ) : (
            <div
              style={{
                overflowX: "auto",
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid #d1d5db",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "950px",
                }}
              >
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
                      <tr key={i} style={{ backgroundColor: i < 3 ? "#f8fafc" : "#ffffff" }}>
                        <td style={tdStyle}>{row.pos}</td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "left",
                            fontWeight: "bold",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                minWidth: "28px",
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
                                  alt={row.team}
                                  width={24}
                                  height={24}
                                  style={{ objectFit: "contain" }}
                                />
                              ) : null}
                            </div>
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
          <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>
            {selectedRound}. forduló góllövőlistája
          </h2>

          {!selectedGoalscorers || selectedGoalscorers.goalscorers.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető góllövőlista." />
          ) : (
            <div
              style={{
                overflowX: "auto",
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid #d1d5db",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "720px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Játékos</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                    <th style={thStyle}>Gól</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGoalscorers.goalscorers.map((row, i) => {
                    const logo = getLogo(row.team);

                    return (
                      <tr key={i}>
                        <td style={tdStyle}>{row.pos}</td>
                        <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                          {row.player}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                minWidth: "28px",
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
                                  alt={row.team}
                                  width={24}
                                  height={24}
                                  style={{ objectFit: "contain" }}
                                />
                              ) : null}
                            </div>
                            <span>{row.team}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: "bold" }}>{row.goals}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
		
		
		
      ) : (
        <>
          <h2 style={{ fontSize: "22px", marginBottom: "14px" }}>
            Liga statisztika
          </h2>

          <div style={{ display: "grid", gap: "16px" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                Góltrend fordulónként
              </div>

              <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                {roundGoalsStats.rows.map((row) => (
                  <div
                    key={row.round}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 70px 70px",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>
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

                    <div style={{ fontSize: "14px", fontWeight: "bold", textAlign: "right" }}>
                      {row.totalGoals} gól
                    </div>

                    <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "right" }}>
                      átlag: {row.avgGoals}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                Csapat támadó / védekező index
              </div>

              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                Támadó index: 1 felett jobb a ligaátlagnál. Védekező index: 1 felett jobb védekezés.
              </div>

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                }}
              >
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
                    {teamStrengthStats.rows
                      .slice()
                      .sort((a, b) => b.attackIndex - a.attackIndex)
                      .map((row) => {
                        const logo = getLogo(row.team);

                        return (
                          <tr key={row.team}>
                            <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    minWidth: "28px",
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
                                      alt={row.team}
                                      width={24}
                                      height={24}
                                      style={{ objectFit: "contain" }}
                                    />
                                  ) : null}
                                </div>
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
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                Poisson meccs-előrejelző
              </div>

              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                A becslés a csapatok támadó és védekező indexéből számolt várható gólértékekre épül.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
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
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                    }}
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
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                    }}
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
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Hazai várható gól</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                        {poissonPrediction.homeLambda}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Vendég várható gól</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                        {poissonPrediction.awayLambda}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Hazai győzelem</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#166534" }}>
                        {poissonPrediction.homeWin}%
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Döntetlen / vendég</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                        {poissonPrediction.draw}% / {poissonPrediction.awayWin}%
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                    }}
                  >
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
                            <td style={{ ...tdStyle, fontWeight: "bold" }}>
                              {row.probabilityPercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>
                        {selectedHomeTeam}
                      </div>
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        Támadó index: <strong>{selectedHomeStats.attackIndex}</strong>
                      </div>
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        Védekező index: <strong>{selectedHomeStats.defenseIndex}</strong>
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>
                        {selectedAwayTeam}
                      </div>
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        Támadó index: <strong>{selectedAwayStats.attackIndex}</strong>
                      </div>
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        Védekező index: <strong>{selectedAwayStats.defenseIndex}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyBox text="Nincs elég adat az előrejelzéshez." />
              )}
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                Bajnoki esélymodell – Monte Carlo
              </div>

              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                {championshipMonteCarlo.simulationCount} szezonfutás alapján becsült bajnoki, top 3, top 6 és kieső zónás valószínűségek.
              </div>

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                }}
              >
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
                    {championshipMonteCarlo.rows.map((row) => {
                      const logo = getLogo(row.team);

                      return (
                        <tr key={row.team}>
                          <td style={{ ...tdStyle, textAlign: "left", fontWeight: "bold" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  minWidth: "28px",
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
                                    alt={row.team}
                                    width={24}
                                    height={24}
                                    style={{ objectFit: "contain" }}
                                  />
                                ) : null}
                              </div>
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
            </div>
			
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "14px",
                  color: "#111827",
                }}
              >
                Legtöbb gólt szerző csapatok
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {topScoringTeamsStats.rows.map((row) => {
                  const logo = getLogo(row.team);

                  return (
                    <div
                      key={row.team}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 120px 40px",
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
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            minWidth: "28px",
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
                              alt={row.team}
                              width={24}
                              height={24}
                              style={{ objectFit: "contain" }}
                            />
                          ) : null}
                        </div>

                        <div
                          style={{
                            fontSize: "14px",
                            color: "#111827",
                            fontWeight: 600,
                            minWidth: 0,
                          }}
                        >
                          {row.team}
                        </div>
                      </div>

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

                      <div
                        style={{
                          fontSize: "14px",
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