import { Suspense, lazy, useRef } from "react";
import { usePointer, usePrefersReducedMotion, useCoarsePointer } from "../../lib/hooks";
import { useGSAP } from "../../lib/useGSAP";
import { gsap } from "../../lib/smoothScroll";
import { scrollTo } from "../../lib/smoothScroll";

const GravScene = lazy(() => import("./GravScene"));

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const { target } = usePointer();
  const root = useRef<HTMLElement>(null);

  // entrance choreography (fires after preloader hands off)
  useGSAP(() => {
    const el = root.current!;
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from(el.querySelectorAll("[data-hero-line] > span"), {
      yPercent: 120,
      duration: 1.3,
      ease: "expo.out",
      stagger: 0.09,
    })
      .from(
        el.querySelectorAll("[data-hero-fade]"),
        { autoAlpha: 0, y: 24, duration: 1, ease: "expo.out", stagger: 0.12 },
        "-=0.8",
      )
      .from(
        "[data-hero-canvas]",
        { autoAlpha: 0, scale: 1.08, duration: 1.6, ease: "expo.out" },
        0,
      );

    // parallax drift of the headline on scroll
    gsap.to(el.querySelector("[data-hero-type]"), {
      yPercent: 22,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to("[data-hero-canvas]", {
      yPercent: 14,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
    });
  }, []);

  return (
    <section
      ref={root}
      className="vignette relative flex min-h-[100svh] w-full flex-col overflow-hidden px-[var(--gutter)] pb-10 pt-28 md:pt-32"
    >
      {/* WebGL layer */}
      <div data-hero-canvas className="pointer-events-none absolute inset-0 -z-0">
        {!reduced ? (
          <Suspense fallback={null}>
            <GravScene pointer={target} reduced={reduced} lite={coarse} />
          </Suspense>
        ) : (
          <div className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#35322e,transparent_70%)] blur-2xl" />
        )}
      </div>

      {/* top meta row */}
      <div
        data-hero-fade
        className="relative z-10 flex items-start justify-between"
      >
        <p className="label max-w-[18ch] leading-relaxed">
          Senior Frontend
          <br />
          &amp; AI Engineer
        </p>
        <p className="label hidden text-right md:block">
          Carshalton, UK
          <br />
          <span className="text-[var(--color-acid)]">● Open to work</span>
        </p>
      </div>

      {/* headline — centered over the blob */}
      <div
        data-hero-type
        className="relative z-10 flex flex-1 flex-col items-center justify-center text-center select-none"
      >
        <h1 className="font-display text-mega leading-[0.82]">
          <span data-hero-line className="line-mask">
            <span className="inline-block will-change-transform">ANDREW</span>
          </span>
        </h1>
        <p data-hero-fade className="mt-2 font-serif text-h3 italic leading-none text-[var(--color-acid)]">
          Aghoghovwia
        </p>
        <p
          data-hero-fade
          className="mt-7 max-w-[42ch] text-lead font-light text-[var(--color-bone-dim)]"
        >
          I build interfaces with <span className="font-serif italic text-[var(--color-bone)]">gravity</span>{" "}
          — fast, accessible products, from React frontends to Python AI systems, engineered to ship.
        </p>
        <button
          data-hero-fade
          data-cursor="view"
          data-cursor-label="Scroll"
          onClick={() => scrollTo("#work")}
          className="group mt-9 flex items-center gap-3 text-label uppercase tracking-[0.2em] text-[var(--color-bone-dim)] transition-colors hover:text-[var(--color-acid)]"
        >
          <span className="font-mono">[ View work ]</span>
          <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-1">
            ↓
          </span>
        </button>
      </div>
    </section>
  );
}
