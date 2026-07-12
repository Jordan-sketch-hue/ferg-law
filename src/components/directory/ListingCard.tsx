"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import type { Listing } from "@/lib/partners/constants";

export default function ListingCard({
  listing,
  tel,
  email,
}: {
  listing: Listing;
  tel?: string;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);

  const images = (listing.media ?? []).filter((m) => m.type === "image");
  const cover = images[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <article
        className="listing-card"
        role="button"
        tabIndex={0}
        onClick={() => {
          setActiveMedia(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveMedia(0);
            setOpen(true);
          }
        }}
      >
        <div
          className="lmedia"
          style={cover ? { backgroundImage: `url("${cover.url}")` } : undefined}
        />
        <div className="lbody">
          <h4>{listing.title}</h4>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {listing.parish || "—"}
            {listing.bedrooms ? ` · ${listing.bedrooms} bd` : ""}
            {listing.bathrooms ? ` · ${listing.bathrooms} ba` : ""}
          </div>
          {listing.price_jmd ? (
            <div className="price">J${listing.price_jmd.toLocaleString()}</div>
          ) : null}
          {listing.description && (
            <p style={{ fontSize: 13.5, color: "var(--text)", marginTop: 6 }}>
              {listing.description}
            </p>
          )}
        </div>
      </article>

      {open && (
        <div className="listing-modal-overlay" onClick={() => setOpen(false)}>
          <div className="listing-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="listing-modal-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            {images.length > 0 && (
              <div className="listing-modal-media">
                <img src={images[activeMedia].url} alt={listing.title} />
                {images.length > 1 && (
                  <div className="listing-modal-thumbs">
                    {images.map((m, i) => (
                      <button
                        key={m.url + i}
                        className={`lmt${i === activeMedia ? " sel" : ""}`}
                        style={{ backgroundImage: `url("${m.url}")` }}
                        aria-label={`Photo ${i + 1}`}
                        onClick={() => setActiveMedia(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="listing-modal-body">
              <h3>{listing.title}</h3>
              <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                {listing.parish || "—"}
                {listing.bedrooms ? ` · ${listing.bedrooms} bd` : ""}
                {listing.bathrooms ? ` · ${listing.bathrooms} ba` : ""}
                {listing.property_type ? ` · ${listing.property_type}` : ""}
              </div>
              {listing.price_jmd ? (
                <div className="price" style={{ marginTop: 6 }}>
                  J${listing.price_jmd.toLocaleString()}
                </div>
              ) : null}
              {listing.description && (
                <p style={{ marginTop: 12, lineHeight: 1.6, color: "var(--text)" }}>
                  {listing.description}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                {tel && (
                  <a
                    className="btn btn-gold"
                    href={`https://wa.me/${tel}?text=${encodeURIComponent(
                      `Hi, I'm interested in "${listing.title}" listed on Ferguson Law's directory.`,
                    )}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Ask about this listing
                  </a>
                )}
                {email && <a className="btn btn-ghost" href={`mailto:${email}`}>Email</a>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
