"use client";

import { useEffect, useMemo, useState } from "react";
import matchesData from "../data/matches.json";
import tablesData from "../data/tables.json";
import goalscorersData from "../data/goalscorers.json";
import matchGoalscorersData from "../data/match_goalscorers.json";
import cardsData from "../data/cards.json";

import { Match, RoundTable, RoundGoalscorers, MatchGoalscorer, CardMatch } from "../components/types";
import {
  getClosestRound,
  parseHungarianDate,
  round2,
  buildPoissonMatrix,
  samplePoissonGoalsTruncated,
  tabButtonStyle,
  subTabButtonStyle,
  selectStyle,
} from "../components/constants";

import { MatchCard } from "../components/MatchCard";
import { TableView } from "../components/TableView";
import { GoalscorersView } from "../components/GoalscorersView";
import { StatsView } from "../components/StatsView";
import { CardsView } from "../components/CardsView";
import { TeamProfile } from "../components/TeamProfile";
import { EmptyBox } from "../components/ui";
import InAppNotifications from "../components/InAppNotifications";

// ── Data ──────────────────────────────────────────────────────────────────────
const allMatches = matchesData as Match[];
const allTables = tablesData as RoundTable[];
const allGoalscorers = goalscorersData as RoundGoalscorers[];
const allMatchGoalscorers = matchGoalscorersData as MatchGoalscorer[];
const allCards = cardsData as CardMatch[];
const rounds = Array.from({ length: 22 }, (_, i) => i + 1);
const allTeams = Array.from(new Set(allMatches.flatMap((m) => [m.home, m.away]))).sort((a, b) =>
  a.localeCompare(b, "hu")
);
const matchTimestamps = new Map<string, number>(
  allMatches.map((m) => {
    const ts = parseHungarianDate(m.date)?.getTime() ?? 0;
    return [`${m.round}|${m.home}|${m.away}|${m.date}`, ts];
  })
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedRound, setSelectedRound] = useState<number>(getClosestRound(allMatches));
  const [view, setView] = useState<"matches" | "table" | "goalscorers" | "stats" | "cards">("matches");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<string>(() => allTeams[0] ?? "");
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<string>(() => allTeams[1] ?? allTeams[0] ?? "");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("Összes csapat");
  const [matchScope, setMatchScope] = useState<"round" | "season">("round");

	useEffect(() => {
	  const update = () => setIsMobile(window.innerWidth <= 1024);
	  update();
	  window.addEventListener("resize", update);
	  return () => window.removeEventListener("resize", update);
	}, []);

  // ── Team options ──
  const teamOptions = allTeams;

  const effectiveSelectedTeamFilter = useMemo(() => {
    if (selectedTeamFilter === "Összes csapat") return selectedTeamFilter;
    return teamOptions.includes(selectedTeamFilter) ? selectedTeamFilter : "Összes csapat";
  }, [selectedTeamFilter, teamOptions]);

  const effectiveMatchScope = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return "round";
    return matchScope;
  }, [effectiveSelectedTeamFilter, matchScope]);

  const matchGoalscorersByKey = useMemo(() => {
    const map = new Map<string, MatchGoalscorer>();
    for (const g of allMatchGoalscorers) {
      map.set(`${g.round}|${g.home}|${g.away}`, g);
    }
    return map;
  }, []);

  const cardsByKey = useMemo(() => {
    const map = new Map<string, CardMatch>();
    for (const c of allCards) {
      map.set(`${c.round}|${c.home}|${c.away}`, c);
    }
    return map;
  }, []);

  const tablesByRound = useMemo(() => new Map(allTables.map((t) => [t.round, t] as const)), []);
  const goalscorersByRound = useMemo(() => new Map(allGoalscorers.map((g) => [g.round, g] as const)), []);

  const latestRound = useMemo(() => {
    const maxTableRound = allTables.reduce((m, t) => Math.max(m, t.round), 0);
    const maxGoalsRound = allGoalscorers.reduce((m, g) => Math.max(m, g.round), 0);
    return Math.max(maxTableRound, maxGoalsRound, 1);
  }, []);

  const latestGoalscorersRound = useMemo(
    () => allGoalscorers.reduce((maxRound, row) => Math.max(maxRound, row.round), 0),
    []
  );

  const latestTable = useMemo(() => tablesByRound.get(latestRound) ?? null, [tablesByRound, latestRound]);
  const latestGoalscorers = useMemo(
    () => goalscorersByRound.get(latestGoalscorersRound) ?? null,
    [goalscorersByRound, latestGoalscorersRound]
  );

  // ── Matches ──
  const filteredMatches = useMemo(() => {
    const roundMatches = allMatches.filter((m) => m.round === selectedRound);
    if (effectiveSelectedTeamFilter === "Összes csapat") return roundMatches;
    return roundMatches.filter((m) => m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter);
  }, [selectedRound, effectiveSelectedTeamFilter]);

  const seasonTeamMatches = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return [];
    return allMatches
      .filter((m) => m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter)
      .slice()
      .sort((a, b) => {
        const aTs = matchTimestamps.get(`${a.round}|${a.home}|${a.away}|${a.date}`) ?? 0;
        const bTs = matchTimestamps.get(`${b.round}|${b.home}|${b.away}|${b.date}`) ?? 0;
        if (aTs !== bTs) return aTs - bTs;
        return a.round - b.round;
      });
  }, [effectiveSelectedTeamFilter]);

  const visibleMatches = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return filteredMatches;
    return effectiveMatchScope === "season" ? seasonTeamMatches : filteredMatches;
  }, [effectiveSelectedTeamFilter, effectiveMatchScope, filteredMatches, seasonTeamMatches]);

  // ── Table & goalscorers ──
  const selectedTable = useMemo(() => tablesByRound.get(selectedRound), [tablesByRound, selectedRound]);

  const selectedGoalscorersRound = useMemo(() => {
    const availableRounds = allGoalscorers
      .map((g) => g.round)
      .filter((round) => round <= selectedRound)
      .sort((a, b) => b - a);

    return availableRounds[0] ?? null;
  }, [selectedRound]);

  const selectedGoalscorers = useMemo(
    () => (selectedGoalscorersRound ? goalscorersByRound.get(selectedGoalscorersRound) ?? null : null),
    [goalscorersByRound, selectedGoalscorersRound]
  );

  const filteredGoalscorers = useMemo(() => {
    if (!selectedGoalscorers) return null;
    if (effectiveSelectedTeamFilter === "Összes csapat") return selectedGoalscorers.goalscorers;
    return selectedGoalscorers.goalscorers.filter((g) => g.team === effectiveSelectedTeamFilter);
  }, [selectedGoalscorers, effectiveSelectedTeamFilter]);

  // ── Team profile ──
  const selectedTeamProfile = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const tableRow = selectedTable?.table.find((row) => row.team === effectiveSelectedTeamFilter);
    const teamMatches = allMatches.filter((m) => m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter);
    const playedTeamMatches = teamMatches.filter(
      (m) => typeof m.home_goals === "number" && typeof m.away_goals === "number"
    );
    return {
      team: effectiveSelectedTeamFilter,
      position: tableRow?.pos ?? null,
      points: tableRow?.points ?? null,
      goalDifference: tableRow?.gd ?? null,
      playedMatches: playedTeamMatches.length,
      form: tableRow?.form ?? [],
    };
  }, [effectiveSelectedTeamFilter, selectedTable]);

  const teamMiniStats = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const played = allMatches.filter(
      (m) =>
        (m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter) &&
        m.status === "Lejátszva" &&
        typeof m.home_goals === "number" &&
        typeof m.away_goals === "number"
    );
    if (played.length === 0) return { pointsPerMatch: 0, goalsForPerMatch: 0, goalsAgainstPerMatch: 0, winRate: 0 };
    let points = 0, goalsFor = 0, goalsAgainst = 0, wins = 0;
    for (const m of played) {
      const isHome = m.home === effectiveSelectedTeamFilter;
      const gf = isHome ? m.home_goals ?? 0 : m.away_goals ?? 0;
      const ga = isHome ? m.away_goals ?? 0 : m.home_goals ?? 0;
      goalsFor += gf; goalsAgainst += ga;
      if (gf > ga) { wins++; points += 3; } else if (gf === ga) { points++; }
    }
    return {
      pointsPerMatch: round2(points / played.length),
      goalsForPerMatch: round2(goalsFor / played.length),
      goalsAgainstPerMatch: round2(goalsAgainst / played.length),
      winRate: round2((wins / played.length) * 100),
    };
  }, [effectiveSelectedTeamFilter]);

  const teamFormTrend = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const recentPlayed = allMatches
      .filter(
        (m) =>
          (m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter) &&
          m.status === "Lejátszva" &&
          typeof m.home_goals === "number" &&
          typeof m.away_goals === "number"
      )
      .slice()
      .sort((a, b) => {
        const aTs = matchTimestamps.get(`${a.round}|${a.home}|${a.away}|${a.date}`) ?? 0;
        const bTs = matchTimestamps.get(`${b.round}|${b.home}|${b.away}|${b.date}`) ?? 0;
        if (aTs !== bTs) return aTs - bTs;
        return a.round - b.round;
      })
      .slice(-5);
    const rows = recentPlayed.map((m) => {
      const isHome = m.home === effectiveSelectedTeamFilter;
      const gf = isHome ? m.home_goals ?? 0 : m.away_goals ?? 0;
      const ga = isHome ? m.away_goals ?? 0 : m.home_goals ?? 0;
      let result: "GY" | "D" | "V" = "D", points = 1;
      if (gf > ga) { result = "GY"; points = 3; } else if (gf < ga) { result = "V"; points = 0; }
      return { round: m.round, opponent: isHome ? m.away : m.home, isHome, result, points, goalsFor: gf, goalsAgainst: ga };
    });
    return { rows, totalPoints: rows.reduce((s, r) => s + r.points, 0) };
  }, [effectiveSelectedTeamFilter]);

  const teamTableMovement = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const latestPlayedRound = allMatches
      .filter((match) => match.status === "Lejátszva")
      .reduce((maxRound, match) => Math.max(maxRound, match.round), 0);
    const rows = allTables
      .slice()
      .sort((a, b) => a.round - b.round)
      .filter((rt) => rt.round <= latestPlayedRound)
      .map((rt) => {
        const row = rt.table.find((r) => r.team === effectiveSelectedTeamFilter);
        if (!row) return null;
        return { round: rt.round, position: Number(row.pos), points: Number(row.points), goalDifference: Number(row.gd), form: row.form ?? [] };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length === 0) return null;
    const first = rows[0], last = rows[rows.length - 1];
    return {
      rows,
      firstPosition: first.position,
      currentPosition: last.position,
      bestPosition: rows.reduce((best, r) => Math.min(best, r.position), rows[0].position),
      movement: first.position - last.position,
    };
  }, [allMatches, effectiveSelectedTeamFilter]);

  const teamPrevNextMatches = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const teamMatches = allMatches
      .filter((m) => m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter)
      .slice()
      .sort((a, b) => {
        const aTs = matchTimestamps.get(`${a.round}|${a.home}|${a.away}|${a.date}`) ?? 0;
        const bTs = matchTimestamps.get(`${b.round}|${b.home}|${b.away}|${b.date}`) ?? 0;
        if (aTs !== bTs) return aTs - bTs;
        return a.round - b.round;
      });
    const played = teamMatches.filter((m) => m.status === "Lejátszva");
    const upcoming = teamMatches.filter((m) => m.status !== "Lejátszva");
    return { previous: played.length > 0 ? played[played.length - 1] : null, next: upcoming.length > 0 ? upcoming[0] : null };
  }, [effectiveSelectedTeamFilter]);

  const nextOpponentStats = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat" || !teamPrevNextMatches?.next) return null;
    const nextMatch = teamPrevNextMatches.next;
    const opponent = nextMatch.home === effectiveSelectedTeamFilter ? nextMatch.away : nextMatch.home;
    const opponentTableRow = latestTable?.table.find((row) => row.team === opponent);
    const headToHeadMatches = allMatches
      .filter(
        (m) =>
          ((m.home === effectiveSelectedTeamFilter && m.away === opponent) ||
            (m.home === opponent && m.away === effectiveSelectedTeamFilter)) &&
          m.status === "Lejátszva" &&
          typeof m.home_goals === "number" &&
          typeof m.away_goals === "number"
      )
      .slice()
      .sort((a, b) => {
        const aTs = matchTimestamps.get(`${a.round}|${a.home}|${a.away}|${a.date}`) ?? 0;
        const bTs = matchTimestamps.get(`${b.round}|${b.home}|${b.away}|${b.date}`) ?? 0;
        if (aTs !== bTs) return aTs - bTs;
        return a.round - b.round;
      });
    return {
      team: opponent,
      position: opponentTableRow?.pos ?? "-",
      points: opponentTableRow?.points ?? "-",
      goalDifference: opponentTableRow?.gd ?? "-",
      played: opponentTableRow?.played ?? "-",
      form: opponentTableRow?.form ?? [],
      lastHeadToHead: headToHeadMatches.length > 0 ? headToHeadMatches[headToHeadMatches.length - 1] : null,
    };
  }, [effectiveSelectedTeamFilter, teamPrevNextMatches, latestTable]);

  useEffect(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return;

    setSelectedHomeTeam(effectiveSelectedTeamFilter);

    if (nextOpponentStats?.team && nextOpponentStats.team !== effectiveSelectedTeamFilter) {
      setSelectedAwayTeam(nextOpponentStats.team);
    }
  }, [effectiveSelectedTeamFilter, nextOpponentStats, setSelectedHomeTeam, setSelectedAwayTeam]);

  const teamHomeAwayStats = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return null;
    const played = allMatches.filter(
      (m) =>
        (m.home === effectiveSelectedTeamFilter || m.away === effectiveSelectedTeamFilter) &&
        m.status === "Lejátszva" &&
        typeof m.home_goals === "number" &&
        typeof m.away_goals === "number"
    );
    const mkBucket = () => ({ matches: 0, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    const home = mkBucket(), away = mkBucket();
    for (const m of played) {
      const isHome = m.home === effectiveSelectedTeamFilter;
      const bucket = isHome ? home : away;
      const gf = isHome ? m.home_goals ?? 0 : m.away_goals ?? 0;
      const ga = isHome ? m.away_goals ?? 0 : m.home_goals ?? 0;
      bucket.matches++; bucket.goalsFor += gf; bucket.goalsAgainst += ga;
      if (gf > ga) { bucket.won++; bucket.points += 3; } else if (gf === ga) { bucket.draw++; bucket.points++; } else { bucket.lost++; }
    }
    const addDerived = (b: typeof home) => ({
      ...b,
      goalDifference: b.goalsFor - b.goalsAgainst,
      goalsForPerMatch: b.matches > 0 ? round2(b.goalsFor / b.matches) : 0,
      goalsAgainstPerMatch: b.matches > 0 ? round2(b.goalsAgainst / b.matches) : 0,
      pointsPerMatch: b.matches > 0 ? round2(b.points / b.matches) : 0,
    });
    return { home: addDerived(home), away: addDerived(away) };
  }, [effectiveSelectedTeamFilter]);

  const teamTopScorers = useMemo(() => {
    if (effectiveSelectedTeamFilter === "Összes csapat") return [];
    if (!latestGoalscorers) return [];
    return latestGoalscorers.goalscorers
      .filter((g) => g.team === effectiveSelectedTeamFilter)
      .map((g) => ({ player: g.player, team: g.team, goals: Number(g.goals) || 0 }))
      .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player, "hu"))
      .slice(0, 5);
  }, [effectiveSelectedTeamFilter, latestGoalscorers]);

  // ── Stats ──
  const playedMatches = useMemo(() =>
    allMatches.filter((m) => m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null), []);

  const teamStrengthStats = useMemo(() => {
    const teamMap = new Map<string, { matches: number; goalsFor: number; goalsAgainst: number }>();
    let totalGoals = 0;
    for (const m of playedMatches) {
      const hg = m.home_goals ?? 0, ag = m.away_goals ?? 0;
      totalGoals += hg + ag;
      const hs = teamMap.get(m.home) ?? { matches: 0, goalsFor: 0, goalsAgainst: 0 };
      hs.matches++; hs.goalsFor += hg; hs.goalsAgainst += ag; teamMap.set(m.home, hs);
      const as_ = teamMap.get(m.away) ?? { matches: 0, goalsFor: 0, goalsAgainst: 0 };
      as_.matches++; as_.goalsFor += ag; as_.goalsAgainst += hg; teamMap.set(m.away, as_);
    }
    const avg = playedMatches.length > 0 ? totalGoals / (playedMatches.length * 2) : 0;
    const rows = Array.from(teamMap.entries()).map(([team, s]) => {
      const gfpm = s.matches > 0 ? s.goalsFor / s.matches : 0;
      const gapm = s.matches > 0 ? s.goalsAgainst / s.matches : 0;
      return {
        team,
        matches: s.matches,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalsForPerMatch: round2(gfpm),
        goalsAgainstPerMatch: round2(gapm),
        attackIndex: round2(avg > 0 ? gfpm / avg : 0),
        defenseIndex: round2(gapm > 0 ? avg / gapm : 2),
      };
    }).sort((a, b) => b.attackIndex - a.attackIndex);
    const byTeam = new Map(rows.map((r) => [r.team, r]));
    return { rows, byTeam, leagueAvgGoalsPerTeamPerMatch: round2(avg) };
  }, [playedMatches]);

  const roundGoalsStats = useMemo(() => {
    const rows = rounds.map((round) => {
      const rm = allMatches.filter((m) => m.round === round && m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null);
      const total = rm.reduce((s, m) => s + (m.home_goals ?? 0) + (m.away_goals ?? 0), 0);
      return { round, totalGoals: total, avgGoals: round2(rm.length > 0 ? total / rm.length : 0) };
    });
    return { rows, maxGoals: Math.max(...rows.map((r) => r.totalGoals), 1) };
  }, []);

  const topScoringTeamsStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of allMatches) {
      if (m.status !== "Lejátszva" || m.home_goals === null || m.away_goals === null) continue;
      map.set(m.home, (map.get(m.home) ?? 0) + m.home_goals);
      map.set(m.away, (map.get(m.away) ?? 0) + m.away_goals);
    }
    const rows = Array.from(map.entries()).map(([team, goals]) => ({ team, goals })).sort((a, b) => b.goals - a.goals);
    return { rows, maxGoals: Math.max(...rows.map((r) => r.goals), 1) };
  }, []);

  const visibleTeamStrengthRows = useMemo(() =>
    effectiveSelectedTeamFilter === "Összes csapat"
      ? teamStrengthStats.rows
      : teamStrengthStats.rows.filter((r) => r.team === effectiveSelectedTeamFilter),
    [teamStrengthStats, effectiveSelectedTeamFilter]);

  const visibleTopScoringTeamsRows = useMemo(() =>
    effectiveSelectedTeamFilter === "Összes csapat"
      ? topScoringTeamsStats.rows
      : topScoringTeamsStats.rows.filter((r) => r.team === effectiveSelectedTeamFilter),
    [topScoringTeamsStats, effectiveSelectedTeamFilter]);

  const selectedTeamStrength = useMemo(
    () => teamStrengthStats.rows.find((row) => row.team === effectiveSelectedTeamFilter) ?? null,
    [teamStrengthStats, effectiveSelectedTeamFilter]
  );

  const selectedHomeStats = useMemo(() => teamStrengthStats.rows.find((t) => t.team === selectedHomeTeam) ?? null, [teamStrengthStats, selectedHomeTeam]);
  const selectedAwayStats = useMemo(() => teamStrengthStats.rows.find((t) => t.team === selectedAwayTeam) ?? null, [teamStrengthStats, selectedAwayTeam]);

  const poissonPrediction = useMemo(() => {
    if (!selectedHomeStats || !selectedAwayStats) return null;
    const base = teamStrengthStats.leagueAvgGoalsPerTeamPerMatch;
    const homeLambda = selectedAwayStats.defenseIndex > 0 ? round2((base * selectedHomeStats.attackIndex) / selectedAwayStats.defenseIndex) : 0;
    const awayLambda = selectedHomeStats.defenseIndex > 0 ? round2((base * selectedAwayStats.attackIndex) / selectedHomeStats.defenseIndex) : 0;
    const matrix = buildPoissonMatrix(homeLambda, awayLambda, 5);
    const top3 = matrix.slice(0, 3).map((r) => ({ ...r, probabilityPercent: round2(r.probability * 100) }));
    const homeWin = round2(matrix.filter((m) => m.homeGoals > m.awayGoals).reduce((s, m) => s + m.probability, 0) * 100);
    const draw = round2(matrix.filter((m) => m.homeGoals === m.awayGoals).reduce((s, m) => s + m.probability, 0) * 100);
    const awayWin = round2(matrix.filter((m) => m.homeGoals < m.awayGoals).reduce((s, m) => s + m.probability, 0) * 100);
    return { homeLambda, awayLambda, top3, homeWin, draw, awayWin };
  }, [selectedHomeStats, selectedAwayStats, teamStrengthStats]);

  const championshipMonteCarlo = useMemo(() => {
    const playedOnly = allMatches.filter((m) => m.status === "Lejátszva" && m.home_goals !== null && m.away_goals !== null);
    const upcoming = allMatches.filter((m) => m.status !== "Lejátszva" && m.home_goals === null && m.away_goals === null);
    const curPoints = new Map<string, number>(), curGD = new Map<string, number>(), curGF = new Map<string, number>();
    for (const t of teamOptions) { curPoints.set(t, 0); curGD.set(t, 0); curGF.set(t, 0); }
    for (const m of playedOnly) {
      const hg = m.home_goals ?? 0, ag = m.away_goals ?? 0;
      curGF.set(m.home, (curGF.get(m.home) ?? 0) + hg);
      curGF.set(m.away, (curGF.get(m.away) ?? 0) + ag);
      curGD.set(m.home, (curGD.get(m.home) ?? 0) + (hg - ag));
      curGD.set(m.away, (curGD.get(m.away) ?? 0) + (ag - hg));
      if (hg > ag) curPoints.set(m.home, (curPoints.get(m.home) ?? 0) + 3);
      else if (hg < ag) curPoints.set(m.away, (curPoints.get(m.away) ?? 0) + 3);
      else { curPoints.set(m.home, (curPoints.get(m.home) ?? 0) + 1); curPoints.set(m.away, (curPoints.get(m.away) ?? 0) + 1); }
    }
    const SIM = 3000;
    const titleC = new Map<string, number>(), top3C = new Map<string, number>(), top6C = new Map<string, number>(), lastC = new Map<string, number>(), ptSums = new Map<string, number>();
    for (const t of teamOptions) { titleC.set(t, 0); top3C.set(t, 0); top6C.set(t, 0); lastC.set(t, 0); ptSums.set(t, 0); }
    for (let i = 0; i < SIM; i++) {
      const sp = new Map(curPoints), sgd = new Map(curGD), sgf = new Map(curGF);
      for (const m of upcoming) {
        const hs = teamStrengthStats.byTeam.get(m.home);
        const as_ = teamStrengthStats.byTeam.get(m.away);
        if (!hs || !as_) continue;
        const base = teamStrengthStats.leagueAvgGoalsPerTeamPerMatch;
        const hl = as_.defenseIndex > 0 ? (base * hs.attackIndex) / as_.defenseIndex : 0.01;
        const al = hs.defenseIndex > 0 ? (base * as_.attackIndex) / hs.defenseIndex : 0.01;
        const homeGoals = samplePoissonGoalsTruncated(hl, 5);
        const awayGoals = samplePoissonGoalsTruncated(al, 5);
        sgf.set(m.home, (sgf.get(m.home) ?? 0) + homeGoals);
        sgf.set(m.away, (sgf.get(m.away) ?? 0) + awayGoals);
        sgd.set(m.home, (sgd.get(m.home) ?? 0) + (homeGoals - awayGoals));
        sgd.set(m.away, (sgd.get(m.away) ?? 0) + (awayGoals - homeGoals));
        if (homeGoals > awayGoals) sp.set(m.home, (sp.get(m.home) ?? 0) + 3);
        else if (homeGoals < awayGoals) sp.set(m.away, (sp.get(m.away) ?? 0) + 3);
        else { sp.set(m.home, (sp.get(m.home) ?? 0) + 1); sp.set(m.away, (sp.get(m.away) ?? 0) + 1); }
      }
      const ranking = teamOptions
        .map((t) => ({ team: t, points: sp.get(t) ?? 0, goalDiff: sgd.get(t) ?? 0, goalsFor: sgf.get(t) ?? 0 }))
        .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team, "hu"));
      ranking.forEach((r, idx) => {
        ptSums.set(r.team, (ptSums.get(r.team) ?? 0) + r.points);
        if (idx === 0) titleC.set(r.team, (titleC.get(r.team) ?? 0) + 1);
        if (idx < 3) top3C.set(r.team, (top3C.get(r.team) ?? 0) + 1);
        if (idx < 6) top6C.set(r.team, (top6C.get(r.team) ?? 0) + 1);
        if (idx === ranking.length - 1) lastC.set(r.team, (lastC.get(r.team) ?? 0) + 1);
      });
    }
    const rows = teamOptions.map((t) => ({
      team: t,
      currentPoints: curPoints.get(t) ?? 0,
      simulatedAvgPoints: round2((ptSums.get(t) ?? 0) / SIM),
      titlePct: round2(((titleC.get(t) ?? 0) / SIM) * 100),
      top3Pct: round2(((top3C.get(t) ?? 0) / SIM) * 100),
      top6Pct: round2(((top6C.get(t) ?? 0) / SIM) * 100),
      lastPct: round2(((lastC.get(t) ?? 0) / SIM) * 100),
    })).sort((a, b) => b.titlePct - a.titlePct);
    return { rows, simulationCount: SIM, maxTitlePct: Math.max(...rows.map((r) => r.titlePct), 1) };
  }, [teamOptions, teamStrengthStats]);

  const visibleMonteCarloRows = useMemo(() =>
    effectiveSelectedTeamFilter === "Összes csapat"
      ? championshipMonteCarlo.rows
      : championshipMonteCarlo.rows.filter((r) => r.team === effectiveSelectedTeamFilter),
    [championshipMonteCarlo, effectiveSelectedTeamFilter]);

  const handleViewChange = (nextView: "matches" | "table" | "goalscorers" | "stats" | "cards") => {
    setView(nextView);
    setSelectedTeamFilter("Összes csapat");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        padding: isMobile ? "12px" : "24px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        color: "#111827",
        maxWidth: "1440px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: isMobile ? "22px" : "30px", lineHeight: 1.2, marginBottom: "8px" }}>
        MLSZ Országos U15 Kiemelt
      </h1>

      <InAppNotifications />

      {/* ── Controls ── */}
      <div style={{ marginBottom: "18px" }}>
        {/* Tab buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          {(["matches", "table", "goalscorers", "cards", "stats"] as const).map((v) => (
            <button key={v} onClick={() => handleViewChange(v)} style={tabButtonStyle(view === v)}>
              {v === "matches" ? "Meccsek" : v === "table" ? "Tabella" : v === "goalscorers" ? "Góllövők" : v === "stats" ? "Statisztika" : "Lapok"}
            </button>
          ))}
        </div>

        {view === "stats" ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "420px", gap: "10px", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: isMobile ? "15px" : "16px", fontWeight: "bold", marginBottom: "8px" }}>
                Csapat kiválasztása
              </div>
              <select value={effectiveSelectedTeamFilter} onChange={(e) => setSelectedTeamFilter(e.target.value)} style={selectStyle}>
                <option value="Összes csapat">Összes csapat</option>
                {teamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ) : null}

        {/* Round selector */}
        <div style={{ fontSize: isMobile ? "15px" : "16px", fontWeight: "bold", marginBottom: "10px" }}>
          Forduló kiválasztása
        </div>

        {isMobile ? (
          /* ── Mobile: prev/next + forduló jelző ── */
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSelectedRound((r) => Math.max(1, r - 1))}
              disabled={selectedRound === 1}
              style={{
                width: "40px", height: "40px", borderRadius: "10px",
                border: "1px solid #d1d5db", backgroundColor: "#ffffff",
                fontSize: "18px", fontWeight: "bold", cursor: selectedRound === 1 ? "default" : "pointer",
                color: selectedRound === 1 ? "#d1d5db" : "#111827",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ‹
            </button>

            {/* Visible pill row — only 5 rounds centered around active */}
            <div style={{ display: "flex", gap: "6px", flex: 1, justifyContent: "center" }}>
              {rounds
                .filter((r) => {
                  const start = Math.max(1, Math.min(selectedRound - 2, rounds.length - 4));
                  return r >= start && r < start + 5;
                })
                .map((round) => (
                  <button
                    key={round}
                    onClick={() => setSelectedRound(round)}
                    style={{
                      minWidth: "40px", height: "40px",
                      padding: "0 6px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      backgroundColor: selectedRound === round ? "#2563eb" : "#ffffff",
                      color: selectedRound === round ? "#ffffff" : "#111827",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {round}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setSelectedRound((r) => Math.min(rounds.length, r + 1))}
              disabled={selectedRound === rounds.length}
              style={{
                width: "40px", height: "40px", borderRadius: "10px",
                border: "1px solid #d1d5db", backgroundColor: "#ffffff",
                fontSize: "18px", fontWeight: "bold", cursor: selectedRound === rounds.length ? "default" : "pointer",
                color: selectedRound === rounds.length ? "#d1d5db" : "#111827",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ›
            </button>
          </div>
        ) : (
          /* ── Desktop: scrollable pill row ── */
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "8px" }}>
            {rounds.map((round) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                style={{
                  minWidth: "48px", padding: "10px 12px",
                  borderRadius: "10px", border: "1px solid #d1d5db",
                  backgroundColor: selectedRound === round ? "#2563eb" : "#ffffff",
                  color: selectedRound === round ? "#ffffff" : "#111827",
                  fontWeight: "bold", cursor: "pointer",
                }}
              >
                {round}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Team profile sections ── */}
      <TeamProfile
        isMobile={isMobile}
        selectedTeamFilter={effectiveSelectedTeamFilter}
        selectedTeamProfile={selectedTeamProfile}
        teamMiniStats={teamMiniStats}
        selectedTeamStrength={selectedTeamStrength}
        teamFormTrend={teamFormTrend}
        teamTableMovement={teamTableMovement}
        nextOpponentStats={nextOpponentStats}
        teamHomeAwayStats={teamHomeAwayStats}
        teamTopScorers={teamTopScorers}
        showNextOpponent={!(view === "stats" && effectiveSelectedTeamFilter !== "Összes csapat")}
        showPostMovementSections={!(view === "stats" && effectiveSelectedTeamFilter !== "Összes csapat")}
        showTopScorers={!(view === "stats" && effectiveSelectedTeamFilter !== "Összes csapat")}
      />

      {/* ── Main view ── */}
      {view === "matches" ? (
        <>
          <h2 style={{ fontSize: isMobile ? "20px" : "22px", marginBottom: "14px" }}>
            {effectiveSelectedTeamFilter === "Összes csapat"
              ? `${selectedRound}. forduló meccsei`
              : effectiveMatchScope === "season"
              ? `${effectiveSelectedTeamFilter} – összes forduló`
              : `${selectedRound}. forduló – ${effectiveSelectedTeamFilter} meccsei`}
          </h2>
          {visibleMatches.length === 0 ? (
            <EmptyBox text="Nincs megjeleníthető meccs." />
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {visibleMatches.map((m, i) => {
                const scorers = matchGoalscorersByKey.get(`${m.round}|${m.home}|${m.away}`);
                const cards = cardsByKey.get(`${m.round}|${m.home}|${m.away}`);
                return (
                  <MatchCard
                    key={i}
                    match={m}
                    isMobile={isMobile}
                    goalscorers={scorers}
                    cards={cards}
                    compactScorers={effectiveSelectedTeamFilter === "Összes csapat" && effectiveMatchScope === "round"}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : view === "table" ? (
        <TableView
          selectedTable={selectedTable}
          selectedRound={selectedRound}
          selectedTeamFilter={effectiveSelectedTeamFilter}
          isMobile={isMobile}
        />
      ) : view === "goalscorers" ? (
        <GoalscorersView
          filteredGoalscorers={filteredGoalscorers}
          allMatchGoalscorers={allMatchGoalscorers}
          selectedRound={selectedRound}
          goalscorersRoundLabel={selectedGoalscorersRound ?? selectedRound}
          selectedTeamFilter={effectiveSelectedTeamFilter}
          isMobile={isMobile}
        />
      ) : view === "cards" ? (
        <CardsView
          cardsData={allCards}
          selectedRound={selectedRound}
          selectedTeamFilter={effectiveSelectedTeamFilter}
          isMobile={isMobile}
        />
      ) : (
        <StatsView
          isMobile={isMobile}
          selectedTeamFilter={effectiveSelectedTeamFilter}
          nextOpponentTeam={nextOpponentStats?.team ?? null}
          nextOpponentStats={nextOpponentStats}
          allMatchGoalscorers={allMatchGoalscorers}
          latestGoalscorers={latestGoalscorers?.goalscorers ?? []}
          teamTopScorers={teamTopScorers}
          roundGoalsStats={roundGoalsStats}
          visibleTeamStrengthRows={visibleTeamStrengthRows}
          teamOptions={teamOptions}
          selectedHomeTeam={selectedHomeTeam}
          selectedAwayTeam={selectedAwayTeam}
          setSelectedHomeTeam={setSelectedHomeTeam}
          setSelectedAwayTeam={setSelectedAwayTeam}
          poissonPrediction={poissonPrediction}
          selectedHomeStats={selectedHomeStats}
          selectedAwayStats={selectedAwayStats}
          visibleMonteCarloRows={visibleMonteCarloRows}
          championshipMonteCarlo={championshipMonteCarlo}
          visibleTopScoringTeamsRows={visibleTopScoringTeamsRows}
          topScoringTeamsStats={topScoringTeamsStats}
        />
      )}
    </main>
  );
}
