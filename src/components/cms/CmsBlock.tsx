"use client";
import React from "react";

/**
 * Drop-in replacement for any hardcoded text or image in a page.
 * Reads the live value from fl_site_blocks; falls back to `children` / `fallback`.
 * Subscribe to realtime so edits appear within ~1s with no page reload.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BlockTextProps {
  page: string;
  block: string;
  fallback?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export function CmsText({ page, block, fallback = "", as: Tag = "span", className, style }: BlockTextProps) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from("fl_site_blocks").select("value")
      .eq("page_slug", page).eq("block_key", block)
      .maybeSingle()
      .then(({ data }) => setValue(data?.value ?? fallback));

    const ch = sb.channel(`cms-${page}-${block}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fl_site_blocks",
        filter: `page_slug=eq.${page}`,
      }, p => {
        const row = p.new as { block_key: string; value: string };
        if (row.block_key === block) setValue(row.value ?? fallback);
      }).subscribe();

    return () => { void sb.removeChannel(ch); };
  }, [page, block, fallback]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Tag className={className} style={style}>{value ?? fallback}</Tag>;
}

interface BlockImageProps {
  page: string;
  block: string;
  fallback?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CmsImage({ page, block, fallback = "", alt = "", className, style }: BlockImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from("fl_site_blocks").select("value")
      .eq("page_slug", page).eq("block_key", block)
      .maybeSingle()
      .then(({ data }) => setSrc(data?.value || fallback));

    const ch = sb.channel(`cms-img-${page}-${block}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fl_site_blocks",
        filter: `page_slug=eq.${page}`,
      }, p => {
        const row = p.new as { block_key: string; value: string };
        if (row.block_key === block) setSrc(row.value || fallback);
      }).subscribe();

    return () => { void sb.removeChannel(ch); };
  }, [page, block, fallback]);

  const url = src ?? fallback;
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} style={style} />;
}

