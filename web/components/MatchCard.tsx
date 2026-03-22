"use client";

import React from "react";
import Image from "next/image";
import { CardMatch, Match, MatchGoalscorer } from "./types";
import { getLogo, formatDateParts, getStatusStyle } from "./constants";

export function MatchCard({
  match,
  isMobile,
  goalscorers,
  cards,
  compactScorers = false,
}: {
  match: Match;
  isMobile: boolean;
  goalscorers?: MatchGoalscorer;
  cards?: CardMatch;
  compactScorers?: boolean;
}) {
  const homeLogo = getLogo(match.home);
  const awayLogo = getLogo(match.away);
  const dateParts = formatDateParts(match.date);
  const isPlayed = match.status === "Lejátszva";
  const homeScorers = goalscorers?.home_scorers ?? [];
  const awayScorers = goalscorers?.away_scorers ?? [];
  const homeYellowCards = (cards?.yellow_cards ?? []).filter((card) => card.team === match.home);
  const awayYellowCards = (cards?.yellow_cards ?? []).filter((card) => card.team === match.away);
  const homeRedCards = (cards?.red_cards ?? []).filter((card) => card.team === match.home);
  const awayRedCards = (cards?.red_cards ?? []).filter((card) => card.team === match.away);

  const hasScorers =
    isPlayed &&
    goalscorers &&
    (homeScorers.length > 0 || awayScorers.length > 0);
  const hasCards = homeYellowCards.length > 0 || awayYellowCards.length > 0 || homeRedCards.length > 0 || awayRedCards.length > 0;

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
            padding: compactScorers ? (isMobile ? "8px" : "10px") : isMobile ? "10px" : "12px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f8fafc",
            display: "grid",
            gap: compactScorers ? "4px" : "6px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: compactScorers ? (isMobile ? "8px" : "10px") : isMobile ? "10px" : "14px",
              alignItems: "start",
            }}
          >
            <ScorersColumn scorers={homeScorers} isMobile={isMobile} align="left" compact={compactScorers} />
            <ScorersColumn scorers={awayScorers} isMobile={isMobile} align="right" compact={compactScorers} />
          </div>
        </div>
      )}

      {hasCards && (
        <div
          style={{
            marginTop: "10px",
            padding: compactScorers ? (isMobile ? "8px" : "10px") : isMobile ? "10px" : "12px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: compactScorers ? (isMobile ? "8px" : "10px") : isMobile ? "10px" : "14px",
              alignItems: "start",
            }}
          >
            <CardsColumn
              yellowCards={homeYellowCards}
              redCards={homeRedCards}
              isMobile={isMobile}
              compact={compactScorers}
              align="left"
            />
            <CardsColumn
              yellowCards={awayYellowCards}
              redCards={awayRedCards}
              isMobile={isMobile}
              compact={compactScorers}
              align="right"
            />
          </div>
        </div>
      )}

      {/* Date / venue row */}
      <div
        style={{
          marginTop: "8px",
          paddingTop: "4px",
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
          <span>
            <span>{dateParts.full}</span>
            <span style={{ fontWeight: 400, color: "#374151" }}>{` - ${match.venue || "Nincs megadva"}`}</span>
          </span>
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

function formatGoalMinutes(minutes: number[]): string {
  return minutes
    .filter((minute) => minute > 0)
    .map((minute) => `${minute}`)
    .join(", ");
}

function ScorersColumn({
  scorers,
  isMobile,
  align,
  compact,
}: {
  scorers: MatchGoalscorer["home_scorers"];
  isMobile: boolean;
  align: "left" | "right";
  compact: boolean;
}) {
  const isRight = align === "right";

  if (scorers.length === 0) {
    return <div style={{ minHeight: "8px" }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? "4px" : "6px", alignItems: isRight ? "flex-end" : "flex-start" }}>
      {scorers.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: compact ? "4px" : "6px",
            justifyContent: isRight ? "flex-end" : "flex-start",
            width: "100%",
          }}
        >
          {!isRight ? <span style={{ fontSize: compact ? "10px" : isMobile ? "11px" : "12px", lineHeight: 1.4 }}>⚽</span> : null}
          <div style={{ textAlign: isRight ? "right" : "left", minWidth: 0 }}>
            <div style={{ fontSize: compact ? "10px" : isMobile ? "11px" : "12px", color: "#111827", fontWeight: 700, lineHeight: 1.35 }}>
              {formatPlayerName(s.player)}
              {s.goals > 1 ? <span style={{ color: "#6b7280", fontWeight: 700 }}> ×{s.goals}</span> : null}
            </div>
            {s.minutes && s.minutes.length > 0 ? (
              <div style={{ fontSize: compact ? "9px" : isMobile ? "10px" : "11px", color: "#6b7280", lineHeight: 1.25, marginTop: "1px" }}>
                {formatGoalMinutes(s.minutes)}
              </div>
            ) : null}
          </div>
          {isRight ? <span style={{ fontSize: compact ? "10px" : isMobile ? "11px" : "12px", lineHeight: 1.4 }}>⚽</span> : null}
        </div>
      ))}
    </div>
  );
}

function CardsColumn({
  yellowCards,
  redCards,
  isMobile,
  compact,
  align,
}: {
  yellowCards: CardMatch["yellow_cards"];
  redCards: CardMatch["red_cards"];
  isMobile: boolean;
  compact: boolean;
  align: "left" | "right";
}) {
  const isRight = align === "right";
  const items = [
    ...yellowCards.map((card) => ({ ...card, type: "yellow" as const })),
    ...redCards.map((card) => ({ ...card, type: "red" as const })),
  ].sort((a, b) => a.minute - b.minute);

  if (items.length === 0) {
    return <div style={{ minHeight: "8px" }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? "4px" : "6px", alignItems: isRight ? "flex-end" : "flex-start" }}>
      {items.map((card, i) => (
        <div
          key={`${card.type}-${card.player}-${card.minute}-${i}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: compact ? "4px" : "6px",
            justifyContent: isRight ? "flex-end" : "flex-start",
            width: "100%",
          }}
        >
          {!isRight ? <CardBadge type={card.type} compact={compact} /> : null}
          <div style={{ textAlign: isRight ? "right" : "left", minWidth: 0 }}>
            <div style={{ fontSize: compact ? "10px" : isMobile ? "11px" : "12px", color: "#111827", fontWeight: 700, lineHeight: 1.35 }}>
              {formatPlayerName(card.player)}
            </div>
            <div style={{ fontSize: compact ? "9px" : isMobile ? "10px" : "11px", color: "#6b7280", lineHeight: 1.25 }}>
              {card.minute}
            </div>
          </div>
          {isRight ? <CardBadge type={card.type} compact={compact} /> : null}
        </div>
      ))}
    </div>
  );
}

function CardBadge({ type, compact }: { type: "yellow" | "red"; compact: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: compact ? "9px" : "10px",
        height: compact ? "12px" : "14px",
        borderRadius: "2px",
        backgroundColor: type === "yellow" ? "#fbbf24" : "#ef4444",
        border: "1px solid rgba(17, 24, 39, 0.12)",
        flexShrink: 0,
        marginTop: "1px",
      }}
    />
  );
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
