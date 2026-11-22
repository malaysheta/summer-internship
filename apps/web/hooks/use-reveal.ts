"use client";

import { useEffect } from "react";

/**
 * Fades up every `[data-reveal]` element under `root` as it enters the viewport.
 * Elements stay visible if JS never runs: only this hook marks them "pending".
 */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? []);
    if (els.length === 0 || !("IntersectionObserver" in window)) return;
    els.forEach((el) => (el.dataset.reveal = "pending"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.reveal = "shown";
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}
