"use client";

import React from "react";
import Image from "next/image";
import { Match } from "./types";
import { getLogo, formatDateParts, getStatusStyle } from "./constants";

export function MatchCard({ match, isMobile }: { match: Match; isMobile: boolean }) {
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
        <TeamSide
          name={match.home}
          logo={homeLogo}
          isMobile={isMobile}
        />

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
                <div style={{ fontSize: isMobile ? "16px" : "18px", lineHeight: 1.1, marginTop: "2px" }}>
                  {dateParts.time}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Away team */}
        <TeamSide
          name={match.away}
          logo={awayLogo}
          isMobile={isMobile}
        />
      </div>

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

// ── Internal helper ───────────────────────────────────────────────────────────
function TeamSide({
  name,
  logo,
  isMobile,
}: {
  name: string;
  logo: string | null;
  isMobile: boolean;
}) {
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
