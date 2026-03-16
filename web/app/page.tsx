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

type ViewMode = "dashboard" | "matches" | "table" | "goalscorers" | "stats";

const allMatches = matches as Match[];
const allTables = tables as RoundTable[];
const allGoalscorers = goalscorers as RoundGoalscorers[];
const rounds = Array.from(new Set(allMatches.map((m) => m.round))).sort((a, b) => a - b);
const ALL_TEAMS = "Összes csapat";

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
  let bestRound = rounds[0] ?? 1;
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

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/,/g, ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div style={emptyBoxStyle}>
      {text}
    </div>
  );
}

function LogoCircle({
  logo,
  team,
  size = 30,
}: {
  logo: string | null;
  team: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {logo ? (
        <Image src={logo} alt={team} width={size - 6} height={size - 6} style={{ objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 10, color: "#6b7280" }}>N/A</span>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "8px 6px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{value}</div>
      {sub ? <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
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
    <div style={{ ...panelStyle, padding: isMobile ? "12px" : "16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 76px 1fr" : "1fr 92px 1fr",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
        }}
      >
        <TeamBadge team={match.home} />

        <div
          style={{
            backgroundColor: "#cf1626",
            color: "#ffffff",
            borderRadius: "10px",
            padding: isMobile ? "8px 6px" : "10px 8px",
            textAlign: "center",
            fontWeight: 700,
            minHeight: isMobile ? "60px" : "72px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {isPlayed ? (
            <div style={{ fontSize: isMobile ? "24px" : "30px", lineHeight: 1 }}>
              {match.home_goals ?? "-"}-{match.away_goals ?? "-"}
            </div>
          ) : (
            <>
              <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1 }}>
                {dateParts.shortDate}
              </div>
              {dateParts.time ? (
                <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1, marginTop: 2 }}>
                  {dateParts.time}
                </div>
              ) : null}
            </>
          )}
        </div>

        <TeamBadge team={match.away} />
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #e5e7eb",
          display: "grid",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: isMobile ? 12 : 14,
            color: "#111827",
            fontWeight: 600,
          }}
        >
          <span>{dateParts.full}</span>
          {match.status !== "Lejátszva" ? (
            <span style={{ ...getStatusStyle(match.status), fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
              {match.status}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color: "#374151" }}>{match.venue || "Nincs megadva"}</div>
      </div>
    </div>
  );
}

function TeamBadge({ team }: { team: string }) {
  const logo = getLogo(team);

  return (
    <div style={{ textAlign: "center", minWidth: 0 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.2,
          marginBottom: 10,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {team}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LogoCircle logo={logo} team={team} size={44} />
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedRound, setSelectedRound] = useState<number>(getClosestRound(allMatches));
  const [view, setView] = useState<ViewMode>("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const teamOptions = useMemo(() => {
    return Array.from(new Set(allMatches.flatMap((m) => [m.home, m.away]))).sort((a, b) =>
      a.localeCompare(b, "hu")
    );
  }, []);

  const filteredMatches = useMemo(() => {
    return allMatches.filter((m) => {
      const roundOk = m.round === selectedRound;
      const teamOk = selectedTeam === ALL_TEAMS || m.home === selectedTeam || m.away === selectedTeam;
      return roundOk && teamOk;
    });
  }, [selectedRound, selectedTeam]);

  const selectedTable = useMemo(() => {
    return allTables.find((t) => t.round === selectedRound);
  }, [selectedRound]);

  const filteredTableRows = useMemo(() => {
    if (!selectedTable) return [];
    if (selectedTeam === ALL_TEAMS) return selectedTable.table;
    return selectedTable.table.filter((row) => row.team === selectedTeam);
  }, [selectedTable, selectedTeam]);

  const selectedGoalscorers = useMemo(() => {
    return allGoalscorers.find((g) => g.round === selectedRound);
  }, [selectedRound]);

  const filteredGoalscorers = useMemo(() => {
    const rows = selectedGoalscorers?.goalscorers ?? [];
    if (selectedTeam === ALL_TEAMS) return rows;
    return rows.filter((row) => row.team === selectedTeam);
  }, [selectedGoalscorers, selectedTeam]);

  const playedMatches = useMemo(() => {
    return allMatches.filter(
      (m) => m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null
    );
  }, []);

  const playedMatchesForTeam = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return playedMatches;
    return playedMatches.filter((m) => m.home === selectedTeam || m.away === selectedTeam);
  }, [playedMatches, selectedTeam]);

  const teamStrengthStats = useMemo(() => {
    const teamMap = new Map<string, { matches: number; goalsFor: number; goalsAgainst: number }>();
    let totalGoals = 0;

    for (const match of playedMatches) {
      const homeGoals = match.home_goals ?? 0;
      const awayGoals = match.away_goals ?? 0;
      totalGoals += homeGoals + awayGoals;

      const homeStats = teamMap.get(match.home) ?? { matches: 0, goalsFor: 0, goalsAgainst: 0 };
      homeStats.matches += 1;
      homeStats.goalsFor += homeGoals;
      homeStats.goalsAgainst += awayGoals;
      teamMap.set(match.home, homeStats);

      const awayStats = teamMap.get(match.away) ?? { matches: 0, goalsFor: 0, goalsAgainst: 0 };
      awayStats.matches += 1;
      awayStats.goalsFor += awayGoals;
      awayStats.goalsAgainst += homeGoals;
      teamMap.set(match.away, awayStats);
    }

    const leagueAvgGoalsPerTeamPerMatch = playedMatches.length > 0 ? totalGoals / (playedMatches.length * 2) : 0;

    const rows: TeamStrengthRow[] = Array.from(teamMap.entries())
      .map(([team, stats]) => {
        const goalsForPerMatch = stats.matches > 0 ? stats.goalsFor / stats.matches : 0;
        const goalsAgainstPerMatch = stats.matches > 0 ? stats.goalsAgainst / stats.matches : 0;
        const attackIndex = leagueAvgGoalsPerTeamPerMatch > 0 ? goalsForPerMatch / leagueAvgGoalsPerTeamPerMatch : 0;
        const defenseIndex = goalsAgainstPerMatch > 0 ? leagueAvgGoalsPerTeamPerMatch / goalsAgainstPerMatch : 2;

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
          m.away_goals !== null &&
          (selectedTeam === ALL_TEAMS || m.home === selectedTeam || m.away === selectedTeam)
      );

      const totalGoals = roundMatches.reduce((sum, m) => sum + (m.home_goals ?? 0) + (m.away_goals ?? 0), 0);

      return {
        round,
        totalGoals,
      };
    });

    return {
      rows: result,
      maxGoals: Math.max(...result.map((r) => r.totalGoals), 1),
    };
  }, [selectedTeam]);

  const topScoringTeamsStats = useMemo(() => {
    const teamGoalsMap = new Map<string, number>();

    for (const match of playedMatches) {
      teamGoalsMap.set(match.home, (teamGoalsMap.get(match.home) ?? 0) + (match.home_goals ?? 0));
      teamGoalsMap.set(match.away, (teamGoalsMap.get(match.away) ?? 0) + (match.away_goals ?? 0));
    }

    const rows = Array.from(teamGoalsMap.entries())
      .map(([team, goals]) => ({ team, goals }))
      .sort((a, b) => b.goals - a.goals);

    return {
      rows: selectedTeam === ALL_TEAMS ? rows : rows.filter((row) => row.team === selectedTeam),
      maxGoals: Math.max(...rows.map((r) => r.goals), 1),
    };
  }, [playedMatches, selectedTeam]);

  const standingsSnapshot = useMemo(() => {
    if (!selectedTable) return null;

    const sorted = [...selectedTable.table].sort((a, b) => toNumber(b.points) - toNumber(a.points));
    const topFour = sorted.slice(0, 4);
    const selectedRow = selectedTeam === ALL_TEAMS ? null : sorted.find((row) => row.team === selectedTeam) ?? null;

    return { topFour, selectedRow, leaderPoints: toNumber(sorted[0]?.points) };
  }, [selectedTable, selectedTeam]);

  const dashboardStats = useMemo(() => {
    const completedCount = playedMatches.length;
    const totalGoals = playedMatches.reduce(
      (sum, m) => sum + (m.home_goals ?? 0) + (m.away_goals ?? 0),
      0
    );
    const goalsPerMatch = completedCount > 0 ? round2(totalGoals / completedCount) : 0;

    const selectedRoundMatches = allMatches.filter((m) => m.round === selectedRound);
    const selectedRoundPlayed = selectedRoundMatches.filter(
      (m) => m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null
    );

    const selectedRoundGoals = selectedRoundPlayed.reduce(
      (sum, m) => sum + (m.home_goals ?? 0) + (m.away_goals ?? 0),
      0
    );

    const highestScoringMatch = [...playedMatchesForTeam]
      .sort(
        (a, b) =>
          (b.home_goals ?? 0) + (b.away_goals ?? 0) - ((a.home_goals ?? 0) + (a.away_goals ?? 0))
      )[0];

    const biggestWin = [...playedMatchesForTeam]
      .sort(
        (a, b) =>
          Math.abs((b.home_goals ?? 0) - (b.away_goals ?? 0)) -
          Math.abs((a.home_goals ?? 0) - (a.away_goals ?? 0))
      )[0];

    const drawCount = playedMatchesForTeam.filter((m) => (m.home_goals ?? 0) === (m.away_goals ?? 0)).length;

    return {
      completedCount,
      totalGoals,
      goalsPerMatch,
      selectedRoundGoals,
      selectedRoundPlayedCount: selectedRoundPlayed.length,
      highestScoringMatch,
      biggestWin,
      drawCount,
    };
  }, [playedMatches, playedMatchesForTeam, selectedRound]);

  const teamDashboard = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return null;

    const teamTableRow = selectedTable?.table.find((row) => row.team === selectedTeam) ?? null;
    const teamStrength = teamStrengthStats.rows.find((row) => row.team === selectedTeam) ?? null;
    const teamMatches = allMatches.filter((m) => m.home === selectedTeam || m.away === selectedTeam);
    const completedTeamMatches = teamMatches.filter(
      (m) => m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null
    );

    const latestMatch = [...completedTeamMatches].sort((a, b) => {
      const dA = parseHungarianDate(a.date)?.getTime() ?? 0;
      const dB = parseHungarianDate(b.date)?.getTime() ?? 0;
      return dB - dA;
    })[0] ?? null;

    const upcomingMatch = [...teamMatches]
      .filter((m) => !(m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null))
      .sort((a, b) => {
        const dA = parseHungarianDate(a.date)?.getTime() ?? Number.POSITIVE_INFINITY;
        const dB = parseHungarianDate(b.date)?.getTime() ?? Number.POSITIVE_INFINITY;
        return dA - dB;
      })[0] ?? null;

    const form = teamTableRow?.form?.slice(0, 5) ?? [];

    return {
      teamTableRow,
      teamStrength,
      latestMatch,
      upcomingMatch,
      form,
    };
  }, [selectedTeam, selectedTable, teamStrengthStats]);

  return (
    <main
      style={{
        padding: isMobile ? "12px" : "20px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        color: "#111827",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, lineHeight: 1.15, marginBottom: 8 }}>
          MLSZ Országos U15 Kiemelt
        </h1>
        <div style={{ fontSize: isMobile ? 14 : 16, color: "#4b5563" }}>
          Dashboard + csapatfókusz nézet. A csapatválasztó az összes fő modult szűri.
        </div>
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <SelectField label="Nézet">
            <select value={view} onChange={(e) => setView(e.target.value as ViewMode)} style={selectStyle}>
              <option value="dashboard">Dashboard</option>
              <option value="matches">Meccsek</option>
              <option value="table">Tabella</option>
              <option value="goalscorers">Góllövők</option>
              <option value="stats">Statisztika</option>
            </select>
          </SelectField>

          <SelectField label="Forduló">
            <select value={selectedRound} onChange={(e) => setSelectedRound(Number(e.target.value))} style={selectStyle}>
              {rounds.map((round) => (
                <option key={round} value={round}>
                  {round}. forduló
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="Csapat">
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={selectStyle}>
              <option value={ALL_TEAMS}>{ALL_TEAMS}</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </SelectField>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["dashboard", "Dashboard"],
          ["matches", "Meccsek"],
          ["table", "Tabella"],
          ["goalscorers", "Góllövők"],
          ["stats", "Statisztika"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setView(key as ViewMode)} style={tabButtonStyle(view === key)}>
            {label}
          </button>
        ))}
      </div>

      {view === "dashboard" ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <KpiCard label="Aktuális forduló" value={selectedRound} sub="Kiválasztott forduló" />
            <KpiCard label="Lejátszott meccsek" value={dashboardStats.completedCount} sub={selectedTeam === ALL_TEAMS ? "Liga összesen" : selectedTeam} />
            <KpiCard label="Összes gól" value={dashboardStats.totalGoals} sub={selectedTeam === ALL_TEAMS ? "Liga összesen" : `${selectedTeam} meccsei`} />
            <KpiCard label="Gól / meccs" value={dashboardStats.goalsPerMatch} sub="Átlag" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div style={panelStyle}>
              <SectionTitle title={selectedTeam === ALL_TEAMS ? "Fordulóösszefoglaló" : `${selectedTeam} fókusz`} />

              {selectedTeam === ALL_TEAMS ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <MiniStat label="Forduló góljai" value={dashboardStats.selectedRoundGoals} />
                    <MiniStat label="Lejátszott meccsek" value={dashboardStats.selectedRoundPlayedCount} />
                  </div>
                  <DashboardMatchLine label="Legtöbb gólos meccs" match={dashboardStats.highestScoringMatch} />
                  <DashboardMatchLine label="Legnagyobb különbségű győzelem" match={dashboardStats.biggestWin} />
                  <MiniStat label="Döntetlenek száma" value={dashboardStats.drawCount} />
                </div>
              ) : teamDashboard ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    <MiniStat label="Helyezés" value={teamDashboard.teamTableRow?.pos ?? "-"} />
                    <MiniStat label="Pont" value={teamDashboard.teamTableRow?.points ?? "-"} />
                    <MiniStat label="GK" value={teamDashboard.teamTableRow?.gd ?? "-"} />
                    <MiniStat label="M" value={teamDashboard.teamTableRow?.played ?? "-"} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Utolsó 5 forma</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {teamDashboard.form.length === 0 ? (
                        <span style={{ fontSize: 14, color: "#6b7280" }}>Nincs formaadat.</span>
                      ) : (
                        teamDashboard.form.map((item, index) => (
                          <span
                            key={`${item}-${index}`}
                            style={{
                              ...getFormBadgeStyle(item),
                              minWidth: 28,
                              height: 28,
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <DashboardMatchLine label="Legutóbbi meccs" match={teamDashboard.latestMatch} />
                  <DashboardMatchLine label="Következő meccs" match={teamDashboard.upcomingMatch} />
                </div>
              ) : (
                <EmptyBox text="Ehhez a csapathoz nincs elég adat." />
              )}
            </div>

            <div style={panelStyle}>
              <SectionTitle title="Tabella pillanatkép" />
              {!standingsSnapshot ? (
                <EmptyBox text="Nincs tabellaadat." />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {standingsSnapshot.topFour.map((row) => (
                    <StandingMiniRow key={row.team} row={row} highlight={row.team === selectedTeam} />
                  ))}
                  {selectedTeam !== ALL_TEAMS && standingsSnapshot.selectedRow ? (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 12,
                        borderTop: "1px solid #e5e7eb",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Kiválasztott csapat</div>
                      <StandingMiniRow row={standingsSnapshot.selectedRow} highlight />
                      <div style={{ fontSize: 13, color: "#4b5563" }}>
                        Hátrány az elsőhöz: {Math.max(0, standingsSnapshot.leaderPoints - toNumber(standingsSnapshot.selectedRow.points))} pont
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={panelStyle}>
              <SectionTitle title={selectedTeam === ALL_TEAMS ? "Góltrend fordulónként" : `${selectedTeam} góltrendje fordulónként`} />
              <div style={{ display: "grid", gap: 10 }}>
                {roundGoalsStats.rows.map((row) => (
                  <BarRow
                    key={row.round}
                    label={`${row.round}. ford.`}
                    value={`${row.totalGoals} gól`}
                    widthPct={(row.totalGoals / roundGoalsStats.maxGoals) * 100}
                  />
                ))}
              </div>
            </div>

            <div style={panelStyle}>
              <SectionTitle title={selectedTeam === ALL_TEAMS ? "Legtöbb gólt szerző csapatok" : `${selectedTeam} támadó mutatója`} />
              <div style={{ display: "grid", gap: 10 }}>
                {(selectedTeam === ALL_TEAMS ? topScoringTeamsStats.rows.slice(0, 8) : topScoringTeamsStats.rows).map((row) => (
                  <BarRow
                    key={row.team}
                    label={row.team}
                    value={`${row.goals} gól`}
                    widthPct={(row.goals / topScoringTeamsStats.maxGoals) * 100}
                    logo={getLogo(row.team)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {view === "matches" ? (
        <section>
          <h2 style={sectionHeadingStyle}>
            {selectedTeam === ALL_TEAMS ? `${selectedRound}. forduló meccsei` : `${selectedTeam} – ${selectedRound}. forduló`}
          </h2>
          {filteredMatches.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető meccs ehhez a szűréshez." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {filteredMatches.map((match, index) => (
                <MatchCard key={`${match.home}-${match.away}-${index}`} match={match} isMobile={isMobile} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {view === "table" ? (
        <section>
          <h2 style={sectionHeadingStyle}>{selectedRound}. forduló tabellája</h2>
          {!selectedTable || selectedTable.table.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető tabella." />
          ) : isMobile ? (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredTableRows.map((row) => (
                <StandingMobileCard key={row.team} row={row} highlight={row.team === selectedTeam} />
              ))}
            </div>
          ) : (
            <div style={{ ...panelStyle, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860, backgroundColor: "#ffffff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                    <th style={thStyle}>H</th>
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
                  {filteredTableRows.map((row) => (
                    <tr key={row.team} style={row.team === selectedTeam ? highlightedRowStyle : undefined}>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 22, fontWeight: 700 }}>{row.pos}</span>
                          <LogoCircle logo={getLogo(row.team)} team={row.team} size={28} />
                          <span style={{ fontWeight: 700 }}>{row.team}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{row.pos}</td>
                      <td style={tdStyle}>{row.played}</td>
                      <td style={tdStyle}>{row.won}</td>
                      <td style={tdStyle}>{row.draw}</td>
                      <td style={tdStyle}>{row.lost}</td>
                      <td style={tdStyle}>{row.gf}</td>
                      <td style={tdStyle}>{row.ga}</td>
                      <td style={tdStyle}>{row.gd}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{row.points}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          {(row.form ?? []).slice(0, 5).map((item, index) => (
                            <span
                              key={`${row.team}-${index}`}
                              style={{
                                ...getFormBadgeStyle(item),
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {view === "goalscorers" ? (
        <section>
          <h2 style={sectionHeadingStyle}>{selectedRound}. forduló góllövőlista</h2>
          {filteredGoalscorers.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető góllövő ehhez a szűréshez." />
          ) : isMobile ? (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredGoalscorers.map((row) => (
                <div key={`${row.player}-${row.team}`} style={panelStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 800, textAlign: "center" }}>{row.pos}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{row.player}</div>
                      <div style={{ fontSize: 13, color: "#4b5563", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <LogoCircle logo={getLogo(row.team)} team={row.team} size={22} />
                        {row.team}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{row.goals}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...panelStyle, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={thStyle}>H</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Játékos</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Csapat</th>
                    <th style={thStyle}>Gól</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGoalscorers.map((row) => (
                    <tr key={`${row.player}-${row.team}`}>
                      <td style={tdStyle}>{row.pos}</td>
                      <td style={{ ...tdStyle, textAlign: "left", fontWeight: 700 }}>{row.player}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <LogoCircle logo={getLogo(row.team)} team={row.team} size={24} />
                          {row.team}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{row.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {view === "stats" ? (
        <section>
          <h2 style={sectionHeadingStyle}>Statisztika</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={panelStyle}>
              <SectionTitle title={selectedTeam === ALL_TEAMS ? "Góltrend fordulónként" : `${selectedTeam} góltrendje fordulónként`} />
              <div style={{ display: "grid", gap: 10 }}>
                {roundGoalsStats.rows.map((row) => (
                  <BarRow
                    key={row.round}
                    label={`${row.round}. ford.`}
                    value={`${row.totalGoals} gól`}
                    widthPct={(row.totalGoals / roundGoalsStats.maxGoals) * 100}
                  />
                ))}
              </div>
            </div>

            <div style={panelStyle}>
              <SectionTitle title="Legtöbb gólt szerző csapatok" />
              <div style={{ display: "grid", gap: 10 }}>
                {(selectedTeam === ALL_TEAMS ? topScoringTeamsStats.rows : topScoringTeamsStats.rows).map((row) => (
                  <BarRow
                    key={row.team}
                    label={row.team}
                    value={`${row.goals} gól`}
                    widthPct={(row.goals / topScoringTeamsStats.maxGoals) * 100}
                    logo={getLogo(row.team)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <SectionTitle title="Csapat támadó / védekező index" />
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
              Támadó index: 1 felett jobb a ligaátlagnál. Védekező index: 1 felett jobb védekezés.
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, backgroundColor: "#ffffff" }}>
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
                    .filter((row) => selectedTeam === ALL_TEAMS || row.team === selectedTeam)
                    .map((row) => (
                      <tr key={row.team} style={row.team === selectedTeam ? highlightedRowStyle : undefined}>
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <LogoCircle logo={getLogo(row.team)} team={row.team} size={24} />
                            <span style={{ fontWeight: 700 }}>{row.team}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{row.matches}</td>
                        <td style={tdStyle}>{row.goalsFor}</td>
                        <td style={tdStyle}>{row.goalsAgainst}</td>
                        <td style={tdStyle}>{row.goalsForPerMatch}</td>
                        <td style={tdStyle}>{row.goalsAgainstPerMatch}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{row.attackIndex}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{row.defenseIndex}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#111827" }}>{title}</div>;
}

function DashboardMatchLine({ label, match }: { label: string; match: Match | null | undefined }) {
  return (
    <div style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      {match ? (
        <div style={{ fontWeight: 700, color: "#111827" }}>
          {match.home} {match.home_goals ?? "-"}:{match.away_goals ?? "-"} {match.away}
        </div>
      ) : (
        <div style={{ color: "#6b7280" }}>Nincs adat.</div>
      )}
    </div>
  );
}

function StandingMiniRow({ row, highlight = false }: { row: TableRow; highlight?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: highlight ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        backgroundColor: highlight ? "#eff6ff" : "#ffffff",
      }}
    >
      <div style={{ fontWeight: 800, textAlign: "center" }}>{row.pos}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <LogoCircle logo={getLogo(row.team)} team={row.team} size={24} />
        <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.team}</div>
      </div>
      <div style={{ fontWeight: 800 }}>{row.points} p</div>
    </div>
  );
}

function StandingMobileCard({ row, highlight = false }: { row: TableRow; highlight?: boolean }) {
  return (
    <div style={{ ...panelStyle, backgroundColor: highlight ? "#eff6ff" : "#ffffff", border: highlight ? "1px solid #93c5fd" : panelStyle.border }}>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, textAlign: "center" }}>{row.pos}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoCircle logo={getLogo(row.team)} team={row.team} size={28} />
          <div style={{ fontWeight: 700 }}>{row.team}</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{row.points}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
        <MiniStat label="M" value={row.played} />
        <MiniStat label="GY" value={row.won} />
        <MiniStat label="D" value={row.draw} />
        <MiniStat label="V" value={row.lost} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
        <MiniStat label="LG" value={row.gf} />
        <MiniStat label="KG" value={row.ga} />
        <MiniStat label="GK" value={row.gd} />
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {(row.form ?? []).slice(0, 5).map((item, index) => (
          <span
            key={`${row.team}-${index}`}
            style={{
              ...getFormBadgeStyle(item),
              width: 24,
              height: 24,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  widthPct,
  logo,
}: {
  label: string;
  value: string;
  widthPct: number;
  logo?: string | null;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr auto", gap: 10, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {logo ? <LogoCircle logo={logo} team={label} size={22} /> : null}
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
      </div>
      <div style={{ backgroundColor: "#e5e7eb", height: 16, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, widthPct))}%`, height: "100%", backgroundColor: "#2563eb", borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, textAlign: "right" }}>{value}</div>
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
    fontWeight: 700,
    cursor: "pointer",
  };
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "16px",
  padding: "16px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
};

const emptyBoxStyle: React.CSSProperties = {
  ...panelStyle,
  color: "#4b5563",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: "14px",
  outline: "none",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 22,
  marginBottom: 14,
};

const highlightedRowStyle: React.CSSProperties = {
  backgroundColor: "#eff6ff",
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
