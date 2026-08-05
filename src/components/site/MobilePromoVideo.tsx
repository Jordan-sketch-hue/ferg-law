"use client";
import { useEffect, useRef } from "react";

export default function MobilePromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const tryPlay = () => { if (v.paused) v.play().catch(() => {}); };

    // Immediate attempt + retry when data is ready
    tryPlay();
    v.addEventListener("canplay", tryPlay);

    // Retry on scroll-into-view (no disconnect — keep retrying if still paused)
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) tryPlay(); },
      { threshold: 0.1 }
    );
    obs.observe(v);

    return () => {
      obs.disconnect();
      v.removeEventListener("canplay", tryPlay);
    };
  }, []);

  return (
    <video
      ref={ref}
      src="/img/ferguson-promo.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
