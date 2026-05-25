"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Copy, ThumbsUp, ThumbsDown, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HoroscopeCardActionsProps {
  sign: string;
  date: string;
  content: string;
  /** Whether the card is currently being hovered */
  isHovered: boolean;
}

export function HoroscopeCardActions({
  sign,
  date,
  content,
  isHovered,
}: HoroscopeCardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [optimisticRating, setOptimisticRating] = useState<
    "positive" | "negative" | null
  >(null);

  // Fetch the user's current rating
  const userRating = useQuery(api.horoscopes.ratings.getUserRating, {
    sign,
    date,
  });

  // Mutation for rating
  const rateHoroscope = useMutation(api.horoscopes.ratings.rate);

  // Resolve rating: optimistic > server
  const activeRating = optimisticRating ?? userRating?.rating ?? null;

  // ── Copy ────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Horoscope copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [content]);

  // ── Thumbs Up / Down ─────────────────────────────────────────────
  const handleRate = useCallback(
    async (rating: "positive" | "negative") => {
      if (activeRating === rating) {
        setOptimisticRating(null);
      } else {
        setOptimisticRating(rating);
      }

      try {
        await rateHoroscope({ sign, date, rating });
      } catch {
        setOptimisticRating(null);
        toast.error("Failed to save rating");
      }
    },
    [sign, date, rateHoroscope, activeRating],
  );

  // ── Share ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/horoscopes/${sign.toLowerCase()}/${date}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setShared(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [sign, date]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      handleShare();
      return;
    }
    try {
      await navigator.share({
        title: `${sign} Horoscope ✨`,
        text: `Today's astrological guidance for ${sign}. Discover how the stars are impacting your day.`,
        url: `${window.location.origin}/horoscopes/${sign.toLowerCase()}/${date}`,
      });
    } catch {
      // user cancelled
    }
  }, [sign, date, handleShare]);

  return (
    <TooltipProvider delayDuration={300}>
      {/* Space always reserved; buttons gently fade in on hover.
          Negative bottom margin pulls the bar down so the gap below
          the icons inside the padded card feels tight, not airy. */}
      <div
        className="flex items-center gap-0.5 mt-2 -mb-4 md:-mb-6 transition-opacity duration-300"
        style={{ opacity: isHovered ? 0.8 : 0 }}
      >
        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-[34px] h-[34px] rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors duration-200"
            >
              {copied ? (
                <Check className="w-[18px] h-[18px] text-primary" />
              ) : (
                <Copy className="w-[18px] h-[18px]" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy horoscope</TooltipContent>
        </Tooltip>

        {/* Thumbs Up */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleRate("positive")}
              className={[
                "flex items-center gap-1.5 h-[34px] px-2 rounded-md transition-colors duration-200",
                activeRating === "positive" ? "bg-primary/[0.09] text-primary" : "text-white/30",
              ].join(" ")}
            >
              <ThumbsUp
                className="w-[18px] h-[18px]"
                fill={activeRating === "positive" ? "currentColor" : "none"}
              />

            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeRating === "positive" ? "Remove rating" : "Like this horoscope"}
          </TooltipContent>
        </Tooltip>

        {/* Thumbs Down */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleRate("negative")}
              className={[
                "flex items-center gap-1.5 h-[34px] px-2 rounded-md transition-colors duration-200",
                activeRating === "negative" ? "bg-primary/[0.09] text-primary" : "text-white/30",
              ].join(" ")}
            >
              <ThumbsDown
                className="w-[18px] h-[18px]"
                fill={activeRating === "negative" ? "currentColor" : "none"}
              />

            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeRating === "negative" ? "Remove rating" : "Dislike this horoscope"}
          </TooltipContent>
        </Tooltip>

        {/* Share — opens native share sheet or copies the link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center w-[34px] h-[34px] rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors duration-200"
            >
              {shared ? (
                <Check className="w-[18px] h-[18px] text-primary" />
              ) : (
                <Share2 className="w-[18px] h-[18px]" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {shared ? "Link copied!" : "Share horoscope"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}