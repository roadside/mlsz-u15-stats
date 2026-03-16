"use client";

import React from "react";
import Image from "next/image";
import { Match, MatchGoalscorer } from "./types";
import { getLogo, formatDateParts, getStatusStyle } from "./constants";

export function MatchCard({
  match,
  isMobile,
  goalscorers,
}: {
  match: Match;
  isMobile: boolean;
  goalscorers?: MatchGoalscorer;
}) {
  const homeLogo = getLogo(match.home);
  const awayLogo = getLogo(match.away);
  const dateParts = formatDateParts(match.date);
  const isPlayed = match.status === "Lejátszva";

  const hasScorers =
    isPlayed &&
    goalscorers &&
    (goalscorers.home_scorers.length > 0 || goalscorers.away_scorers.length > 0);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "16px",
        padding: isMobile ? "12px" : "16px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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
        {/* Home team */}
        <TeamSide name={match.home} logo={homeLogo} isMobile={isMobile} />

        {/* Score / date box */}
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
            <div style={{ fontSize: isMobile ? "24px" : "30px", lineHeight: 1, whiteSpace: "nowrap" }}>
              {match.home_goals ?? "-"}-{match.away_goals ?? "-"}
            </div>
          ) : (
            <>
              <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1 }}>
                {dateParts.shortDate}
              </div>
              {dateParts.time ? (
                <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1, marginTop: "2px" }}>
                  {dateParts.time}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Away team */}
        <TeamSide name={match.away} logo={awayLogo} isMobile={isMobile} />
      </div>

      {/* Goalscorers row */}
      {hasScorers && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "1px solid #f3f4f6",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {/* Home scorers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {goalscorers!.home_scorers.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px" }}>⚽</span>
                <span style={{ fontSize: isMobile ? "11px" : "12px", color: "#374151", fontWeight: 600 }}>
                  {formatPlayerName(s.player)}
                  {s.goals > 1 ? <span style={{ color: "#6b7280" }}> ×{s.goals}</span> : null}
                </span>
              </div>
            ))}
          </div>

          {/* Away scorers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end" }}>
            {goalscorers!.away_scorers.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: isMobile ? "11px" : "12px", color: "#374151", fontWeight: 600, textAlign: "right" }}>
                  {formatPlayerName(s.player)}
                  {s.goals > 1 ? <span style={{ color: "#6b7280" }}> ×{s.goals}</span> : null}
                </span>
                <span style={{ fontSize: "11px" }}>⚽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date / venue row */}
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "KISS PÉTER ÁDÁM" → "Kiss P. Á." */
function formatPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  // Magyar névsor: VEZETÉKNÉV KERESZTNÉV (esetleg második keresztnév)
  const last = capitalize(parts[0]);
  const initials = parts
    .slice(1)
    .map((p) => capitalize(p[0]) + ".")
    .join(" ");
  return initials ? `${last} ${initials}` : last;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Internal helper ───────────────────────────────────────────────────────────
function TeamSide({ name, logo, isMobile }: { name: string; logo: string | null; isMobile: boolean }) {
  return (
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
        {name}
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
        {logo ? (
          <Image
            src={logo}
            alt={name}
            width={isMobile ? 30 : 38}
            height={isMobile ? 30 : 38}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span style={{ fontSize: "12px", color: "#6b7280" }}>N/A</span>
        )}
      </div>
    </div>
  );
}
