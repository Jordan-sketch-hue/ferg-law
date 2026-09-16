"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SiteBlock {
  id: string;
  page_slug: string;
  block_key: string;
  content_type: "text" | "richtext" | "image" | "list" | "url" | "boolean";
  value: string | null;
  label: string | null;
  sort_order: number;
  updated_at: string;
}

/** Fetch all blocks for a page (or all pages if slug omitted). */
export async function getSiteBlocks(pageSlug?: string): Promise<SiteBlock[]> {
  const sb = createClient();
  let q = sb.from("fl_site_blocks").select("*").order("sort_order");
  if (pageSlug) q = q.eq("page_slug", pageSlug);
  const { data } = await q;
  return (data as SiteBlock[]) ?? [];
}

/** React hook — fetches blocks and subscribes to realtime updates. */
export function useSiteContent(pageSlug: string) {
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await getSiteBlocks(pageSlug);
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.block_key] = r.value ?? ""; });
    setBlocks(map);
    setLoading(false);
  }, [pageSlug]);

  useEffect(() => {
    void load();
    const sb = createClient();
    const channel = sb
      .channel(`site-content-${pageSlug}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "fl_site_blocks",
        filter: `page_slug=eq.${pageSlug}`,
      }, payload => {
        const row = payload.new as SiteBlock;
        setBlocks(prev => ({ ...prev, [row.block_key]: row.value ?? "" }));
      })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [pageSlug, load]);

  /** Get a block value, falling back to the provided default. */
  function get(key: string, fallback = ""): string {
    return blocks[key] ?? fallback;
  }

  return { get, blocks, loading };
}
