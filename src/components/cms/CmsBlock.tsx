"use client";
import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flEditBus, CmsStyles } from "@/components/cms/CmsEditBar";

interface BlockTextProps {
  page: string; block: string; fallback?: string;
  as?: keyof React.JSX.IntrinsicElements; className?: string; style?: React.CSSProperties;
}

interface Block { value: string | null; styles: CmsStyles | null; hidden: boolean; }

export function CmsText({ page, block, fallback = "", as: Tag = "span", className, style }: BlockTextProps) {
  const [data,        setData]       = useState<Block>({ value: null, styles: null, hidden: false });
  const [editMode,    setEditMode]   = useState(false);
  const [selected,    setSelected]   = useState(false);
  const [seedPending, setSeedPending] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    const check = () => setEditMode(!!(window as Window & { __flEditMode?: boolean }).__flEditMode);
    check();
    const t = setInterval(check, 300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.from("fl_site_blocks").select("value, styles, hidden")
      .eq("page_slug", page).eq("block_key", block)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          setData({ value: row.value || fallback, styles: (row as Record<string,unknown>).styles as CmsStyles ?? null, hidden: !!((row as Record<string,unknown>).hidden) });
        } else {
          setData({ value: fallback, styles: null, hidden: false });
          setSeedPending(true);
        }
      });

    const ch = sb.channel(`cms-${page}-${block}-${channelSuffix.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_site_blocks", filter: `page_slug=eq.${page}` }, p => {
        const row = p.new as { block_key: string; value: string; styles: CmsStyles; hidden: boolean };
        if (row.block_key === block) setData({ value: row.value || fallback, styles: row.styles ?? null, hidden: !!row.hidden });
      }).subscribe();

    return () => { void sb.removeChannel(ch); };
  }, [page, block, fallback]);

  useEffect(() => {
    if (!seedPending || !editMode) return;
    const sb = createClient();
    void sb.from("fl_site_blocks").upsert({
      page_slug: page, block_key: block, value: fallback,
      content_type: "text", updated_at: new Date().toISOString(), updated_by: "editor",
    }, { onConflict: "page_slug,block_key" });
    setSeedPending(false);
  }, [seedPending, editMode, page, block, fallback]);

  useEffect(() => {
    return flEditBus.subscribe(p => {
      if (!p) { setSelected(false); return; }
      setSelected(p.page === page && p.block === block);
    });
  }, [page, block]);

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation(); e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect() ?? new DOMRect();
    flEditBus.open({
      page, block, value: data.value ?? fallback,
      styles: data.styles ?? {}, hidden: data.hidden,
      element: wrapRef.current, contentType: "text", rect,
    });
  };

  if (data.hidden && !editMode) return null;

  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(data.styles && Object.keys(data.styles).length > 0 ? data.styles as React.CSSProperties : {}),
    ...(editMode ? { cursor: "pointer" } : {}),
    ...(selected ? { outline: "2px solid #c8a65c", outlineOffset: 2 } : {}),
    ...(data.hidden && editMode ? { opacity: 0.3 } : {}),
  };

  const TagEl = Tag as React.ElementType;
  return (
    <TagEl
      ref={wrapRef as React.Ref<HTMLElement>}
      className={className}
      style={inlineStyle}
      onClick={handleClick}
      {...(editMode ? { "data-cms-editable": "", title: `Click to edit: ${page}.${block}` } : {})}
      {...(selected ? { "data-cms-selected": "" } : {})}
    >
      {data.value || fallback}
    </TagEl>
  );
}

interface BlockImageProps {
  page: string; block: string; fallback?: string;
  alt?: string; className?: string; style?: React.CSSProperties;
  loading?: "lazy" | "eager";
}

export function CmsImage({ page, block, fallback = "", alt = "", className, style, loading }: BlockImageProps) {
  const [data,        setData]       = useState<{ src: string | null; styles: CmsStyles | null; hidden: boolean }>({ src: null, styles: null, hidden: false });
  const [editMode,    setEditMode]   = useState(false);
  const [selected,    setSelected]   = useState(false);
  const [seedPending, setSeedPending] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    const check = () => setEditMode(!!(window as Window & { __flEditMode?: boolean }).__flEditMode);
    check(); const t = setInterval(check, 300); return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.from("fl_site_blocks").select("value, styles, hidden")
      .eq("page_slug", page).eq("block_key", block)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          setData({ src: row.value || fallback, styles: (row as Record<string,unknown>).styles as CmsStyles ?? null, hidden: !!((row as Record<string,unknown>).hidden) });
        } else {
          setData({ src: fallback, styles: null, hidden: false });
          setSeedPending(true);
        }
      });

    const ch = sb.channel(`cms-img-${page}-${block}-${channelSuffix.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_site_blocks", filter: `page_slug=eq.${page}` }, p => {
        const row = p.new as { block_key: string; value: string; styles: CmsStyles; hidden: boolean };
        if (row.block_key === block) setData({ src: row.value || fallback, styles: row.styles ?? null, hidden: !!row.hidden });
      }).subscribe();

    return () => { void sb.removeChannel(ch); };
  }, [page, block, fallback]);

  useEffect(() => {
    if (!seedPending || !editMode) return;
    const sb = createClient();
    void sb.from("fl_site_blocks").upsert({
      page_slug: page, block_key: block, value: fallback,
      content_type: "image", updated_at: new Date().toISOString(), updated_by: "editor",
    }, { onConflict: "page_slug,block_key" });
    setSeedPending(false);
  }, [seedPending, editMode, page, block, fallback]);

  useEffect(() => {
    return flEditBus.subscribe(p => {
      if (!p) { setSelected(false); return; }
      setSelected(p.page === page && p.block === block);
    });
  }, [page, block]);

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation(); e.preventDefault();
    const rect = imgRef.current?.getBoundingClientRect() ?? new DOMRect();
    flEditBus.open({ page, block, value: data.src ?? fallback, styles: data.styles ?? {}, hidden: data.hidden, element: imgRef.current, contentType: "image", rect });
  };

  if (data.hidden && !editMode) return null;
  const url = data.src ?? fallback;
  if (!url) return null;

  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(data.styles && Object.keys(data.styles).length > 0 ? data.styles as React.CSSProperties : {}),
    ...(editMode ? { cursor: "pointer" } : {}),
    ...(selected ? { outline: "2px solid #c8a65c", outlineOffset: 2 } : {}),
    ...(data.hidden && editMode ? { opacity: 0.3 } : {}),
  };

  return (
  // eslint-disable-next-line @next/next/no-img-element
    <img ref={imgRef} src={url} alt={alt} className={className} style={inlineStyle} loading={loading}
      onClick={handleClick}
      {...(editMode ? { "data-cms-editable": "" } : {})}
      {...(selected ? { "data-cms-selected": "" } : {})}
    />
  );
}