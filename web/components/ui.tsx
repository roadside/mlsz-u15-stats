"use client";

import React from "react";
import Image from "next/image";
import { getLogo } from "./constants";

// ── EmptyBox ──────────────────────────────────────────────────────────────────
export function EmptyBox({ text }: { text: string }) {
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

// ── LogoCircle ────────────────────────────────────────────────────────────────
export function LogoCircle({
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

// ── TeamLogoCircle (looks up logo automatically) ──────────────────────────────
export function TeamLogoCircle({ team, size }: { team: string; size: number }) {
  return <LogoCircle logo={getLogo(team)} team={team} size={size} />;
}

// ── MiniStat ──────────────────────────────────────────────────────────────────
export function MiniStat({
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
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
        {label}
      </div>
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

// ── MetricCard ────────────────────────────────────────────────────────────────
export function MetricCard({
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

// ── TeamInfoCard ──────────────────────────────────────────────────────────────
export function TeamInfoCard({
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
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>
        {team}
      </div>
      <div style={{ fontSize: "13px", color: "#374151" }}>
        Támadó index: <strong>{attackIndex}</strong>
      </div>
      <div style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>
        Védekező index: <strong>{defenseIndex}</strong>
      </div>
    </div>
  );
}

// ── FormBadge ─────────────────────────────────────────────────────────────────
import { getFormBadgeStyle } from "./constants";

export function FormBadge({ form, size = "md" }: { form: string; size?: "sm" | "md" }) {
  const px = size === "sm" ? { minWidth: "30px", height: "26px", fontSize: "12px" } : { minWidth: "38px", height: "34px", fontSize: "15px" };
  return (
    <span
      style={{
        ...getFormBadgeStyle(form),
        ...px,
        padding: "0 8px",
        borderRadius: "8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.05)",
      }}
    >
      {form}
    </span>
  );
}
