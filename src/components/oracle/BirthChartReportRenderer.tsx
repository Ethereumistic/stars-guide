"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BirthChartReportRenderer({ markdown }: { markdown: string }) {
  return (
    <article className="birth-chart-report max-w-none text-white/82">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <header className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.22),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,.28)] print:border-0 print:bg-transparent print:p-0 print:shadow-none">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.34em] text-galactic/75 print:text-black/60">Stars.Guide Natal Reading</div>
              <h1 className="font-serif text-4xl leading-tight text-white md:text-5xl print:text-3xl print:text-black">{children}</h1>
            </header>
          ),
          h2: ({ children }) => (
            <h2 className="group relative mt-12 border-b border-white/10 pb-3 font-serif text-2xl text-white md:text-3xl print:mt-7 print:border-black/15 print:text-xl print:text-black">
              <span className="absolute -left-4 top-2 hidden h-8 w-1 rounded-full bg-galactic/70 md:block print:hidden" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 rounded-2xl border border-galactic/15 bg-galactic/[0.07] px-4 py-3 font-serif text-xl text-galactic/95 shadow-[0_0_36px_rgba(168,85,247,.06)] print:border-black/10 print:bg-transparent print:text-base print:text-black">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-4 leading-8 text-white/80 print:leading-7 print:text-black/80">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white print:text-black">{children}</strong>,
          em: ({ children }) => <em className="text-white/90 print:text-black/80">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-7 rounded-3xl border border-galactic/25 bg-[linear-gradient(135deg,rgba(168,85,247,.14),rgba(255,255,255,.04))] px-6 py-5 font-serif text-xl leading-8 text-white shadow-[0_0_44px_rgba(168,85,247,.10)] print:border-black/20 print:bg-transparent print:text-base print:text-black">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="my-5 grid gap-3 print:block">{children}</ul>,
          ol: ({ children }) => <ol className="my-5 list-decimal space-y-3 pl-6 print:text-black/80">{children}</ol>,
          li: ({ children }) => (
            <li className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 leading-7 text-white/78 shadow-[0_8px_28px_rgba(0,0,0,.10)] print:border-0 print:bg-transparent print:p-0 print:pl-1 print:text-black/80 print:shadow-none">{children}</li>
          ),
          hr: () => <hr className="my-9 border-white/10 print:border-black/15" />,
          table: ({ children }) => <div className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] print:border-black/15 print:bg-transparent"><table className="w-full text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-white/10 px-4 py-3 text-left text-white print:border-black/15 print:text-black">{children}</th>,
          td: ({ children }) => <td className="border-b border-white/5 px-4 py-3 text-white/75 print:border-black/10 print:text-black/75">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
