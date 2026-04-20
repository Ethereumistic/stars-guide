"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook that smooths streaming text by progressively revealing characters
 * at a fixed rate, decoupling visual rendering from network delivery.
 *
 * Instead of rendering the full content as it arrives (which can be choppy
 * when providers send tokens in bursts), this hook maintains a display
 * position that advances toward the target content at a steady pace.
 *
 * @param content - The full content string to display
 * @param isStreaming - Whether streaming is active
 * @param charsPerSecond - Characters to reveal per second (default 40)
 * @returns The smoothed content string for display
 */
export function useSmoothedContent(
  content: string,
  isStreaming: boolean,
  charsPerSecond: number = 40,
): string {
  const [displayContent, setDisplayContent] = useState(content);
  const [displayPosition, setDisplayPosition] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const contentRef = useRef(content);
  const positionRef = useRef(0);

  // Reset position when content shrinks (new message started)
  useEffect(() => {
    contentRef.current = content;
    if (content.length < displayPosition) {
      setDisplayPosition(0);
      positionRef.current = 0;
      setDisplayContent("");
    }
  }, [content, displayPosition]);

  // When streaming ends, snap to full content immediately
  useEffect(() => {
    if (!isStreaming && content) {
      setDisplayContent(content);
      setDisplayPosition(content.length);
      positionRef.current = content.length;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [isStreaming, content]);

  // Animation loop for progressive reveal
  useEffect(() => {
    if (!isStreaming) return;

    const msPerChar = 1000 / charsPerSecond;

    const animate = (timestamp: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = timestamp;
      }

      const elapsed = timestamp - lastTickRef.current;
      if (elapsed >= msPerChar) {
        const charsToAdd = Math.floor(elapsed / msPerChar);
        const newPosition = Math.min(
          positionRef.current + charsToAdd,
          contentRef.current.length,
        );

        if (newPosition > positionRef.current) {
          positionRef.current = newPosition;
          setDisplayPosition(newPosition);
          setDisplayContent(contentRef.current.slice(0, newPosition));
        }

        lastTickRef.current = timestamp - (elapsed % msPerChar);
      }

      // Continue animation if not caught up
      if (positionRef.current < contentRef.current.length) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isStreaming, charsPerSecond]); // Re-run when streaming starts/stops

  // Special case: when not streaming, just return content directly
  if (!isStreaming) {
    return content;
  }

  return displayContent;
}