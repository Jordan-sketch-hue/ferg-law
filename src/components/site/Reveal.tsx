"use client";

import { useEffect } from "react";

/**
 * Replicates the original scroll-reveal: adds `.in` to every `.reveal`
 * element when it enters the viewport. Renders nothing.
 */
export default function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
