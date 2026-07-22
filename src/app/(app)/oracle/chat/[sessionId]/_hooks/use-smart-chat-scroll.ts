"use client";

import * as React from "react";

const BOTTOM_THRESHOLD_PX = 120;

export function distanceFromBottom(element: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function useSmartChatScroll(contentVersion: string) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const pinnedRef = React.useRef(true);
  const initializedRef = React.useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? "instant" : behavior, block: "end" });
    pinnedRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onScroll = () => {
      const pinned = distanceFromBottom(viewport) <= BOTTOM_THRESHOLD_PX;
      pinnedRef.current = pinned;
      if (pinned) setShowJumpToLatest(false);
    };
    onScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom("auto");
      else setShowJumpToLatest(true);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  React.useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      scrollToBottom("auto");
      return;
    }
    if (pinnedRef.current) scrollToBottom("smooth");
    else setShowJumpToLatest(true);
  }, [contentVersion, scrollToBottom]);

  return {
    viewportRef,
    contentRef,
    bottomRef,
    showJumpToLatest,
    jumpToLatest: () => scrollToBottom("smooth"),
  };
}
