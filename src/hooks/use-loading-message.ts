import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  { threshold: 0, message: "Consulting the stars..." },
  { threshold: 3000, message: "Reading the chart..." },
  { threshold: 8000, message: "The stars are taking their time..." },
  {
    threshold: 15000,
    message:
      "This is taking longer than usual — the Oracle is working on a deep reading.",
  },
] as const;

/**
 * Returns a time-based loading message that evolves as streaming continues.
 * 0-3s: "Consulting the stars..."
 * 3-8s: "Reading the chart..."
 * 8-15s: "The stars are taking their time..."
 * 15s+: "This is taking longer than usual..."
 */
export function useLoadingMessage(isStreaming: boolean): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setElapsed(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!isStreaming) return "";

  // Walk backward to find the highest threshold we've passed
  let message: string = LOADING_MESSAGES[0].message;
  for (const entry of LOADING_MESSAGES) {
    if (elapsed >= entry.threshold) {
      message = entry.message;
    }
  }

  return message;
}