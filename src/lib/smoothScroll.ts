import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Animations are scoped to component lifecycles; under React StrictMode the
// double-invoked effects (and self-unmounting preloader) can briefly leave a
// tween pointing at a removed node. That's a benign teardown race, so silence
// the noisy warning rather than let it clutter the console.
gsap.config({ nullTargetWarn: false });

let lenis: Lenis | null = null;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Boot Lenis and wire it into GSAP's ticker so ScrollTrigger and Lenis share a
 * single rAF loop (no double-driving, no jank). Returns a teardown fn.
 */
export function initSmoothScroll(): () => void {
  if (lenis) return () => {};
  if (prefersReduced()) {
    // honour reduced motion: native scroll, ScrollTrigger still works
    return () => {};
  }

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo out
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });

  lenis.on("scroll", ScrollTrigger.update);
  if (import.meta.env.DEV) (window as unknown as { __gravLenis: Lenis }).__gravLenis = lenis;

  const raf = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function getLenis() {
  return lenis;
}

export function scrollTo(target: string | number | HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  } else if (typeof target !== "number") {
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "smooth" });
  }
}

export { gsap, ScrollTrigger };
