"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { planetUIConfig } from "@/config/planet-ui";
import { zodiacUIConfig } from "@/config/zodiac-ui";

// Extract a planet symbol if the heading text matches a planet name
function getPlanetSymbol(text: string): { symbol: string; color: string } | null {
  const lower = text.toLowerCase();
  for (const [key, cfg] of Object.entries(planetUIConfig)) {
    if (lower.includes(key)) {
      return { symbol: cfg.rulerSymbol, color: cfg.themeColor };
    }
  }
  return null;
}

// Extract a sign icon component if the heading text mentions a sign
function getSignInfo(text: string): { signId: string } | null {
  const lower = text.toLowerCase();
  for (const key of Object.keys(zodiacUIConfig)) {
    if (lower.includes(key)) {
      return { signId: key };
    }
  }
  return null;
}

function HeadingDecorator({ children }: { children: React.ReactNode }) {
  const textContent = typeof children === "string" ? children : "";
  const planet = getPlanetSymbol(textContent);
  const sign = getSignInfo(textContent);
  const signUi = sign ? zodiacUIConfig[sign.signId] : null;
  const SignIcon = signUi?.icon;

  return (
    <span className="flex items-center gap-3">
      {planet && (
        <span
          className="text-2xl shrink-0 opacity-90"
          style={{ color: planet.color, filter: `drop-shadow(0 0 8px ${planet.color}40)` }}
        >
          {planet.symbol}
        </span>
      )}
      {SignIcon && !planet && (
        <SignIcon
          className="size-6 shrink-0 opacity-70"
          style={{ color: "var(--galactic)" }}
        />
      )}
      <span>{children}</span>
    </span>
  );
}

export function BirthChartReportRenderer({ markdown }: { markdown: string }) {
  return (
    <article className="birth-chart-report max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <header className="relative mb-12 overflow-hidden rounded-[2rem] border border-white/10 px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,.35)]"
              style={{
                background: "radial-gradient(circle at top left, rgba(168,85,247,.25), transparent 40%), linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))"
              }}
            >
              {/* Decorative radial star */}
              <div className="absolute top-4 right-6 text-[80px] font-serif text-white/5 select-none pointer-events-none leading-none">✦</div>
              <div className="mb-4 inline-flex items-center gap-2">
                <div className="h-px w-6 bg-galactic/60" />
                <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-galactic/75">Stars.Guide Natal Reading</span>
                <div className="h-px w-6 bg-galactic/60" />
              </div>
              <h1 className="font-serif text-4xl leading-tight text-white md:text-5xl print:text-3xl print:text-black">
                {children}
              </h1>
            </header>
          ),

          h2: ({ children }) => (
            <div className="mt-14 mb-6 print:mt-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[9px] font-mono uppercase tracking-[0.5em] text-white/25 shrink-0">⋆</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <h2 className="mt-5 font-serif text-2xl text-white md:text-3xl print:text-xl print:text-black">
                <HeadingDecorator>{children}</HeadingDecorator>
              </h2>
            </div>
          ),

          h3: ({ children }) => (
            <h3 className="mt-8 group relative pl-5 font-serif text-xl text-galactic/95 print:text-base print:text-black">
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-[2px] rounded-full"
                style={{ background: "linear-gradient(to bottom, transparent, var(--galactic), transparent)" }}
              />
              <HeadingDecorator>{children}</HeadingDecorator>
            </h3>
          ),

          h4: ({ children }) => (
            <h4 className="mt-6 text-sm font-mono uppercase tracking-[0.25em] text-white/50 print:text-black/60">
              {children}
            </h4>
          ),

          p: ({ children }) => (
            <p className="my-5 leading-8 text-white/78 print:leading-7 print:text-black/80 text-[15px]">
              {children}
            </p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-white/95 print:text-black">{children}</strong>
          ),

          em: ({ children }) => (
            <em className="text-white/85 not-italic font-serif print:text-black/80">{children}</em>
          ),

          blockquote: ({ children }) => (
            <blockquote
              className="my-8 relative rounded-2xl border border-galactic/20 px-7 py-6 font-serif text-lg leading-8 text-white/88 shadow-[0_0_48px_rgba(168,85,247,.08)] overflow-hidden print:border-black/20 print:bg-transparent print:text-base print:text-black"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,.12), rgba(255,255,255,.03))"
              }}
            >
              <span className="absolute top-3 left-4 text-4xl text-galactic/20 font-serif leading-none select-none">❝</span>
              <div className="relative z-10 pl-4">{children}</div>
            </blockquote>
          ),

          ul: ({ children }) => (
            <ul className="my-6 space-y-2.5 print:block">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="my-6 space-y-2.5 pl-6 list-decimal print:text-black/80">{children}</ol>
          ),

          li: ({ children }) => (
            <li className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 leading-7 text-white/78 shadow-[0_4px_16px_rgba(0,0,0,.08)] print:border-0 print:bg-transparent print:p-0 print:pl-1 print:text-black/80 print:shadow-none">
              <span className="mt-[5px] shrink-0 size-1.5 rounded-full bg-galactic/60" />
              <span>{children}</span>
            </li>
          ),

          hr: () => (
            <div className="my-12 flex items-center gap-4 print:my-6">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-white/20 text-xs">✦ ✦ ✦</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>
          ),

          table: ({ children }) => (
            <div className="my-7 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] shadow-[0_8px_32px_rgba(0,0,0,.2)] print:border-black/15 print:bg-transparent">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border-b border-white/10 bg-white/[0.04] px-5 py-3.5 text-left text-[11px] font-mono uppercase tracking-[0.2em] text-white/60 print:border-black/15 print:text-black">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border-b border-white/5 px-5 py-3.5 text-white/72 leading-6 print:border-black/10 print:text-black/75">
              {children}
            </td>
          ),

          code: ({ children }) => (
            <code className="rounded-md bg-white/[0.08] border border-white/10 px-1.5 py-0.5 text-[13px] font-mono text-galactic/90 print:bg-black/5 print:text-black">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
