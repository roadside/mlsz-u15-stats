export type Match = {
  round: number;
  date: string;
  home: string;
  away: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  venue: string;
  source_url: string;
  match_url?: string | null;
};

export type MatchGoalscorer = {
  round: number;
  home: string;
  away: string;
  home_scorers: { player: string; goals: number; minutes?: number[] }[];
  away_scorers: { player: string; goals: number; minutes?: number[] }[];
};

export type TableRow = {
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

export type RoundTable = {
  round: number;
  table: TableRow[];
};

export type GoalscorerRow = {
  round: number;
  pos: string;
  player: string;
  team: string;
  goals: string;
  source_url: string;
};

export type RoundGoalscorers = {
  round: number;
  goalscorers: GoalscorerRow[];
};

export type TeamStrengthRow = {
  team: string;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  attackIndex: number;
  defenseIndex: number;
};

export type ChampionshipChanceRow = {
  team: string;
  currentPoints: number;
  simulatedAvgPoints: number;
  titlePct: number;
  top3Pct: number;
  top6Pct: number;
  lastPct: number;
};

export type PoissonOutcome = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
};

export type CardPlayer = {
  player: string;
  team?: string;
  minute: number;
};

export type CardMatch = {
  round: number;
  home: string;
  away: string;
  date: string;
  match_url?: string;
  yellow_cards: CardPlayer[];
  red_cards: CardPlayer[];
};
