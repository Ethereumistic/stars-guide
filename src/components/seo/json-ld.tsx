"use client";

/**
 * Renders a JSON-LD <script> tag for structured data.
 *
 * Usage:
 * ```tsx
 * import { JsonLd } from "@/components/seo/json-ld";
 * import { breadcrumbSchema } from "@/lib/seo";
 *
 * <JsonLd data={breadcrumbSchema([...])} />
 * ```
 *
 * Place inside your page layout — the script tag is invisible to users
 * but parsed by search engines.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}