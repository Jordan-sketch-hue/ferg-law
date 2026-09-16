"use client";
import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flEditBus } from "@/components/cms/CmsEditBar";

interface BlockTextProps {
  page: string;
  block: string;
  fallback?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export function CmsText({ page, block, fallback = "", as: Tag = "span", className, style }: BlockTextProps) {
  const [value,    setValue]    = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  // Poll for edit mode state (set by CmsEditBar on window)
  useEffect(() => {
    const check = () =>
      setEditMode(!!(window as Window & { __flEditMode?: boolean }).__flEditMode);
    check();
    const t = setInterval(check, 300);
    return () => clearInterval(t);
  }, []);

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

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation(); e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect() ?? new DOMRect();
    flEditBus.open({ page, block, currentValue: value ?? fallback, rect });
  };

  const displayed = value ?? fallback;

  if (!editMode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Tag className={className} style={style}>{displayed}</Tag>;
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag
      ref={wrapRef as any}
      className={className}
      style={{
        ...style,
        cursor: "pointer",
        outline: "1.5px dashed #c8a65c",
        outlineOffset: 2,
        borderRadius: 3,
        display: "inline",
      }}
      onClick={handleClick}
      title={`Click to edit: ${page}.${block}`}
    >
      {displayed}
    </Tag>
  );
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