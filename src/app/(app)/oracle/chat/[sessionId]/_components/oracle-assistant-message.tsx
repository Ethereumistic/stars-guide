"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 className="mt-6 mb-3 border-b border-white/8 pb-2 text-lg font-semibold tracking-tight text-white/95 md:text-xl">
      {children}
    </h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 className="mt-4 mb-2 text-base font-semibold text-white/85 md:text-lg">{children}</h3>
  ),
  p: ({ children }: React.PropsWithChildren) => (
    <p className="mb-4 text-base leading-relaxed text-white/90 md:text-lg">{children}</p>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: React.PropsWithChildren) => (
    <em className="italic text-galactic/90">{children}</em>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul className="my-3 ml-5 list-outside list-disc space-y-1.5">{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol className="my-3 ml-5 list-outside list-decimal space-y-1.5">{children}</ol>
  ),
  li: ({ children }: React.PropsWithChildren) => (
    <li className="text-base leading-relaxed text-white/90 md:text-lg">{children}</li>
  ),
  hr: () => <hr className="my-6 border-white/8" />,
  table: ({ children }: React.PropsWithChildren) => (
    <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
  ),
  thead: ({ children }: React.PropsWithChildren) => <thead className="border-b border-white/15">{children}</thead>,
  th: ({ children }: React.PropsWithChildren) => <th className="px-3 py-2 text-left font-medium text-white/70">{children}</th>,
  td: ({ children }: React.PropsWithChildren) => <td className="border-b border-white/5 px-3 py-2 text-white/85">{children}</td>,
  blockquote: ({ children }: React.PropsWithChildren) => (
    <blockquote className="my-3 border-l-2 border-galactic/40 pl-4 italic text-white/70">{children}</blockquote>
  ),
  code: ({ children }: React.PropsWithChildren) => (
    <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-sm text-galactic/90">{children}</code>
  ),
};

export const OracleAssistantMessage = React.memo(function OracleAssistantMessage({
  content,
  growing = false,
}: {
  content: string;
  growing?: boolean;
}) {
  const deferredContent = React.useDeferredValue(content);
  const visibleContent = growing ? deferredContent : content;

  return (
    <div className="oracle-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {visibleContent}
      </ReactMarkdown>
      {growing && (
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse rounded-sm bg-galactic/60" aria-hidden="true" />
      )}
    </div>
  );
});

export function FakeStreamingOnboardingMessage({ content }: { content: string }) {
  const [visible, setVisible] = React.useState(0);
  const words = React.useMemo(() => content.split(/(\s+)/), [content]);

  React.useEffect(() => {
    setVisible(0);
    const id = window.setInterval(() => {
      setVisible((current) => {
        if (current >= words.length) {
          window.clearInterval(id);
          return current;
        }
        return current + 2;
      });
    }, 55);
    return () => window.clearInterval(id);
  }, [words]);

  return <OracleAssistantMessage content={words.slice(0, visible).join("")} growing={visible < words.length} />;
}
