"use client";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/img/hero-banner.jpg", alt: "A joyful Jamaican family moving into their new home" },
  { src: "/img/hero-keys-handover.jpg", alt: "Agent handing keys to a young woman outside her new Jamaican property" },
  { src: "/img/hero-family-swings.jpg", alt: "Jamaican family enjoying the backyard of their new home" },
  { src: "/img/hero-gardening.jpg", alt: "Woman tending her garden at her Jamaica home" },
  { src: "/img/hero-construction.jpg", alt: "Couple viewing their future home under construction in Jamaica" },
];

const INTERVAL = 5500;
const TRANSITION = 1200;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Randomize starting slide on mount (avoids SSR hydration mismatch)
    const start = Math.floor(Math.random() * SLIDES.length);
    setActive(start);
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

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
    </>
  );
}
