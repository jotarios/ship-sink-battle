"use client";

import { useEffect, useState } from "react";

const KEY = "prompt-heroes-session";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Anonymous identity via localStorage. NOT a security boundary — clearing
 * storage loses your roster and ownership is spoofable. Accepted for a demo.
 */
export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    setSessionId(id);
  }, []);
  return sessionId;
}
