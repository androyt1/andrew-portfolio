import { useEffect, type DependencyList } from "react";
import { gsap, ScrollTrigger } from "./smoothScroll";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Minimal GSAP-in-React hook. Runs `setup` inside a gsap.context so every tween
 * / ScrollTrigger created within is reverted automatically on unmount.
 *
 * - Waits one frame so layout (fluid type, async fonts) settles before any
 *   ScrollTrigger measures — positions are then refreshed centrally in App,
 *   so we deliberately do NOT call ScrollTrigger.refresh() here (avoids a
 *   refresh-per-section storm on load).
 * - Honours prefers-reduced-motion: motion is skipped entirely and the optional
 *   `reducedFallback` runs instead to set the final, static state.
 */
export function useGSAP(
  setup: () => void,
  deps: DependencyList = [],
  reducedFallback?: () => void,
) {
  useEffect(() => {
    if (reducedMotion()) {
      reducedFallback?.();
      return;
    }
    let ctx: ReturnType<typeof gsap.context>;
    const id = requestAnimationFrame(() => {
      ctx = gsap.context(setup);
    });
    return () => {
      cancelAnimationFrame(id);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger };
