"use client";
import { useEffect, useRef } from "react";

export default function MobilePromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          v.play().catch(() => {});
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src="/img/ferguson-promo.mp4"
      poster="/img/ferguson-promo-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
