"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getByPath } from "@/lib/content/paths";

// Which published content doc to overlay. Defaults to the live "ferguson-pitch".
// A preview deployment can point this at a sentinel id with no row (via
// NEXT_PUBLIC_FL_CONTENT_ID) so the overlay no-ops and the fresh code renders
// verbatim — without touching the shared live content doc.
const PUBLISHED_ID = process.env.NEXT_PUBLIC_FL_CONTENT_ID || "ferguson-pitch";

/**
 * Live content applier (public view).
 *
 * On mount — when NOT in edit mode — this fetches the published content row and
 * writes each stored value onto its matching [data-edit] / [data-edit-img]
 * node. The marketing copy is plain server-rendered markup (not React state),
 * so a one-time DOM patch after hydration sticks and won't be clobbered by
 * re-renders. Mirrors the old static site's content-apply script. Renders null.
 */
export default function ContentApply() {
  useEffect(() => {
    // In edit mode the EditorOverlay owns content loading — skip entirely.
    if (new URLSearchParams(window.location.search).has("edit")) return;

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("homeready_site_content")
          .select("content")
          .eq("id", PUBLISHED_ID)
          .maybeSingle();

        if (cancelled || error || !data?.content) return;
        applyContent(data.content as Record<string, unknown>);
      } catch {
        // Fail silent — public visitors keep the default baked-in copy.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/** Patch every editable node from the stored content document. */
export function applyContent(content: Record<string, unknown>) {
  document.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
    const value = getByPath(content, el.getAttribute("data-edit") || "");
    if (typeof value === "string") el.textContent = value;
  });

  document
    .querySelectorAll<HTMLImageElement | HTMLVideoElement>("[data-edit-img]")
    .forEach((el) => {
      const value = getByPath(content, el.getAttribute("data-edit-img") || "");
      if (typeof value === "string" && value) {
        el.setAttribute("src", value);
        if (el.tagName === "VIDEO" && typeof (el as HTMLVideoElement).load === "function") {
          (el as HTMLVideoElement).load();
        }
      }
    });
}
