import { useEffect, useRef, useState } from "react";
import { gsap } from "../lib/smoothScroll";
import { usePrefersReducedMotion } from "../lib/hooks";

/**
 * Entry preloader: a counter races 0 → 100 while the word GRAV assembles,
 * then the panel splits and lifts to reveal the hero. Calls onDone when gone.
 */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = root.current!;

    if (reduced) {
      onDone();
      setGone(true);
      return;
    }

    const counter = { v: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          onDone();
          setGone(true);
        },
      });

      tl.from("[data-pre-char]", {
        yPercent: 110,
        duration: 1,
        ease: "expo.out",
        stagger: 0.07,
      })
        .to(
          counter,
          {
            v: 100,
            duration: 2.1,
            ease: "power2.inOut",
            onUpdate: () => {
              if (countRef.current)
                countRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
            },
          },
          0,
        )
        .to("[data-pre-bar]", { scaleX: 1, duration: 2.1, ease: "power2.inOut" }, 0)
        .to("[data-pre-content]", { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, "+=0.15")
        .to(el, { yPercent: -100, duration: 1.1, ease: "expo.inOut" });
    }, el);

    return () => {
      ctx.revert();
    };
  }, [onDone, reduced]);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[10000] flex flex-col justify-between bg-[var(--color-void)] px-[var(--gutter)] py-8"
    >
      <div data-pre-content className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between pt-4">
          <span className="label">Loading portfolio</span>
          <span className="label">A. Aghoghovwia</span>
        </div>

        <div className="flex items-end justify-between">
          <h2 className="font-display text-display leading-[0.8]" aria-label="Andrew Aghoghovwia">
            {"ANDREW".split("").map((c, i) => (
              <span key={i} className="line-mask align-bottom" style={{ display: "inline-block" }}>
                <span data-pre-char style={{ display: "inline-block" }}>
                  {c}
                </span>
              </span>
            ))}
          </h2>
          <span
            ref={countRef}
            className="font-mono text-lead tabular-nums text-[var(--color-acid)]"
          >
            000
          </span>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-6 h-px w-full origin-left bg-[var(--color-bone)]/15">
        <div data-pre-bar className="h-full w-full origin-left scale-x-0 bg-[var(--color-acid)]" />
      </div>
    </div>
  );
}
