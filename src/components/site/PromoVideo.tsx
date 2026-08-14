"use client";
import { useEffect, useRef } from "react";

export default function PromoVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    const tryPlay = () => { vid.play().catch(() => {}); };

    vid.addEventListener("canplay", tryPlay, { once: true });
    tryPlay();

    // iOS Safari blocks autoplay until after any user touch — the scroll to
    // reach this video IS a touch, so this fires naturally without extra taps.
    const onTouch = () => {
      tryPlay();
      document.removeEventListener("touchstart", onTouch);
    };
    document.addEventListener("touchstart", onTouch, { passive: true });

    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) tryPlay(); },
      { threshold: 0 },
    );
    io.observe(vid);

    return () => {
      io.disconnect();
      vid.removeEventListener("canplay", tryPlay);
      document.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
    />
  );
}
