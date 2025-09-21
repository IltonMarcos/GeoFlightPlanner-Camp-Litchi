"use client";

import { useEffect } from "react";

export default function Pwa() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {
        // no-op: registration may fail in dev or unsupported environments
      });
    }
  }, []);
  return null;
}

