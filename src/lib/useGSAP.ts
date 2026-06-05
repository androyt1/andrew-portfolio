import { useEffect, type DependencyList } from "react";
import { gsap, ScrollTrigger } from "./smoothScroll";

/**
 * Minimal GSAP-in-React hook. Runs `setup` inside a gsap.context so every tween
 * / ScrollTrigger created within is reverted automatically on unmount or when
 * deps change. Mirrors @gsap/react's useGSAP without the extra dependency.
 */
export function useGSAP(setup: () => void, deps: DependencyList = []) {
  useEffect(() => {
    // wait a frame so layout (fonts, fluid type) settles before measuring
    let ctx: ReturnType<typeof gsap.context>;
    const id = requestAnimationFrame(() => {
      ctx = gsap.context(setup);
      ScrollTrigger.refresh();
    });
    return () => {
      cancelAnimationFrame(id);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger };
