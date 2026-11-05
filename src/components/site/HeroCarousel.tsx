"use client";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/img/hero-banner.jpg", alt: "A joyful Jamaican family moving into their new home" },
  { src: "/img/hero-keys-handover.jpg", alt: "Agent handing keys to a young woman outside her new Jamaican property" },
  { src: "/img/hero-family-swings.jpg", alt: "Jamaican family enjoying the backyard of their new home" },
  { src: "/img/hero-gardening.jpg", alt: "Woman tending her garden at her Jamaica home" },
  { src: "/img/hero-construction.jpg", alt: "Couple viewing their future home under construction in Jamaica" },
  { src: "/img/woman-laptop-home.jpg", alt: "Woman working from her home in Jamaica" },
  { src: "/img/people-new-home.jpg", alt: "Happy homeowners celebrating moving into their home" },
];

const INTERVAL = 5500;
const TRANSITION = 1200;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const id = setInterval(() => {
      if (!paused) {
        setActive((i) => (i + 1) % SLIDES.length);
      }
    }, INTERVAL);

    return () => clearInterval(id);
  }, [paused]);

  return (
    <>
      {SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          decoding={i === 0 ? "sync" : "async"}
          className="hero-bg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: i === active ? 1 : 0,
            transition: `opacity ${TRANSITION}ms ease-in-out`,
            willChange: "opacity",
          }}
        />
      ))}
      <div
        aria-label="Hero image selector"
        style={{
          position: "absolute",
          right: 18,
          bottom: 18,
          display: "flex",
          gap: 8,
          zIndex: 2,
          padding: 8,
          borderRadius: 999,
          background: "rgba(21,19,14,0.38)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              padding: 0,
              background: i === active ? "#F6F2EA" : "rgba(246,242,234,0.45)",
              boxShadow: i === active ? "0 0 0 2px rgba(200,166,92,0.85)" : "none",
              transition: "all 180ms ease",
            }}
          />
        ))}
      </div>
    </>
  );
}
