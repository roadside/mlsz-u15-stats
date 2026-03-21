"use client";

import { useCallback, useEffect, useState } from "react";

type Toast = {
  id: string;
  title: string;
  message?: string;
  createdAt: number;
};

type InAppNotifyEventDetail = {
  title: string;
  message?: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function InAppNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, message?: string) => {
      const id = uid();
      const toast: Toast = { id, title, message, createdAt: Date.now() };
      setToasts((prev) => [toast, ...prev].slice(0, 3));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<InAppNotifyEventDetail>;
      const detail = ce.detail;
      if (!detail?.title) return;
      notify(detail.title, detail.message);
    };

    window.addEventListener("inapp-notify", handler as EventListener);
    return () => window.removeEventListener("inapp-notify", handler as EventListener);
  }, [notify]);

  return (
    <>
      {/* Toast stack */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 9999,
          width: "min(360px, calc(100vw - 32px))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => closeToast(t.id)}
            style={{
              pointerEvents: "auto",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{t.title}</div>
            {t.message ? <div style={{ fontSize: 13, color: "#374151" }}>{t.message}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}
