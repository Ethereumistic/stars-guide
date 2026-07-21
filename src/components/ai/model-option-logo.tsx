"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelOptionLogoProps {
  src?: string;
  fallback?: React.ReactNode;
  className?: string;
  imageClassName?: string;
}

export function ModelOptionLogo({
  src,
  fallback,
  className,
  imageClassName,
}: ModelOptionLogoProps) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => setFailed(false), [src]);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-white/40",
        className,
      )}
      aria-hidden="true"
    >
      {fallback ?? <Sparkles className="size-1/2" />}
      {src && !failed && (
        // Admin-defined CDN hosts cannot be enumerated in next/image remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn("absolute inset-0 size-full bg-[#17151f] object-contain p-1", imageClassName)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
