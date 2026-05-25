"use client";

import { useState, useCallback } from "react";
import { ShareType } from "@/lib/sharing";

export function useSharePrompt() {
  const [pendingType, setPendingType] = useState<ShareType | null>(null);

  const triggerPrompt = useCallback((type: ShareType) => {
    setPendingType(type);
  }, []);

  const clearPrompt = useCallback(() => {
    setPendingType(null);
  }, []);

  return {
    pendingType,
    triggerPrompt,
    clearPrompt,
  };
}