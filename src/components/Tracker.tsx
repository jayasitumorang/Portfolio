"use client";

import { useEffect } from "react";

let sent = false; // one beacon per page load, even when React runs effects twice in development

// Sends one anonymous page view to /api/track.
// Visit the site once with ?notrack to stop counting your own visits on that device (?track undoes it).
export function Tracker() {
  useEffect(() => {
    if (sent || location.pathname.startsWith("/stats")) return;
    const q = new URLSearchParams(location.search);
    try {
      if (q.has("notrack")) localStorage.setItem("notrack", "1");
      if (q.has("track")) localStorage.removeItem("notrack");
      if (localStorage.getItem("notrack")) return;
    } catch {}
    sent = true;

    const body = JSON.stringify({
      path: location.pathname,
      referrer: document.referrer || null,
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  }, []);
  return null;
}
