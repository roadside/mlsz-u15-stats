import React from "react";
import { Match, PoissonOutcome } from "./types";

// ── Team logos ──────────────────────────────────────────────────────────────
export const teamLogos: Record<string, string> = {
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

export function getLogo(teamName: string): string | null {
  return teamLogos[teamName] || null;
}

// ── Math helpers ─────────────────────────────────────────────────────────────
export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function poissonProbability(lambda: number, goals: number) {
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

export function buildPoissonMatrix(
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

export function sampleFromDistribution<T>(
  items: T[],
  getWeight: (item: T) => number
): T {
  const total = items.reduce((sum, item) => sum + getWeight(item), 0);
  if (total <= 0) return items[0];
  const randomValue = Math.random() * total;
  let running = 0;
  for (const item of items) {
    running += getWeight(item);
    if (randomValue <= running) return item;
  }
  return items[items.length - 1];
}

// ── Date helpers ─────────────────────────────────────────────────────────────
export function parseHungarianDate(dateValue: string): Date | null {
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

export function getClosestRound(matchesInput: Match[]): number {
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

export function formatDateParts(dateValue: string) {
  if (!dateValue) return { shortDate: "-", time: "", full: "Nincs dátum" };
  const trimmed = dateValue.trim();
  const match = trimmed.match(
    /^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{1,2}:\d{2})?$/
  );
  if (!match) return { shortDate: trimmed, time: "", full: trimmed };
  return {
    shortDate: `${match[2]}-${match[3]}`,
    time: match[4] || "",
    full: trimmed,
  };
}

// ── Style helpers ─────────────────────────────────────────────────────────────
export function getFormBadgeStyle(form?: string): React.CSSProperties {
  if (!form) return { backgroundColor: "#e5e7eb", color: "#374151" };
  if (form === "GY") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (form === "V") return { backgroundColor: "#fee2e2", color: "#991b1b" };
  return { backgroundColor: "#e0e7ff", color: "#3730a3" };
}

export function getStatusStyle(status: string): React.CSSProperties {
  if (status === "Lejátszva") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (status === "Kiírva") return { backgroundColor: "#dbeafe", color: "#1e40af" };
  if (status === "Halasztva") return { backgroundColor: "#fed7aa", color: "#9a3412" };
  if (status === "Elmaradt") return { backgroundColor: "#fee2e2", color: "#991b1b" };
  return { backgroundColor: "#e5e7eb", color: "#374151" };
}

export function tabButtonStyle(active: boolean): React.CSSProperties {
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

export function subTabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    backgroundColor: active ? "#eff6ff" : "#ffffff",
    color: active ? "#1d4ed8" : "#374151",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  };
}

// ── Shared style objects ──────────────────────────────────────────────────────
export const sectionCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "14px",
  padding: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "8px",
  color: "#111827",
};

export const sectionSubTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
};

export const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  marginTop: "12px",
};

export const mobileCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
};

export const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
};

export const statCardStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
};

export const statLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "6px",
};

export const statValueStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
};

export const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  borderBottom: "1px solid #d1d5db",
  fontSize: "14px",
  color: "#111827",
};

export const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
  color: "#111827",
};
