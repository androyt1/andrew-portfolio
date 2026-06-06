import { useRef } from "react";
import { useGSAP } from "../../lib/useGSAP";
import { gsap, ScrollTrigger } from "../../lib/smoothScroll";

/**
 * Velocity-aware marquee: base auto-scroll, and scroll direction/speed nudges
 * it via ScrollTrigger's onUpdate (faster page scroll = faster drift + skew).
 */
export default function Marquee() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = track.current!;
    const half = el.scrollWidth / 2;
    const wrap = gsap.utils.wrap(-half, 0);
    let x = 0;
    let dir = -1;
    let onScreen = true;

    const tick = gsap.ticker.add(() => {
      if (!onScreen) return; // don't churn transforms while off-screen
      x += 0.6 * dir;
      gsap.set(el, { x: wrap(x) });
    });

    // pause the loop unless the marquee is actually in view
    const vis = ScrollTrigger.create({
      trigger: section.current,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (onScreen = self.isActive),
    });

    const st = gsap.to({}, {
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          dir = self.direction === 1 ? -1 : 1;
          const skew = gsap.utils.clamp(-12, 12, self.getVelocity() / -180);
          gsap.to(el, { skewX: skew, duration: 0.4, ease: "power3.out", overwrite: true });
        },
      },
    });

    return () => {
      gsap.ticker.remove(tick);
      vis.kill();
      st.scrollTrigger?.kill();
    };
  }, []);

  const WORDS = ["REACT", "TYPESCRIPT", "NEXT.JS", "PYTHON", "LANGGRAPH", "RAG", "FASTAPI"];

  return (
    <section
      ref={section}
      className="relative overflow-hidden border-y edge bg-[var(--color-void)] py-10 md:py-14"
    >
      <div ref={track} className="flex w-max items-center will-change-transform">
        {[...Array(2)].map((_, dup) => (
          <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
            {WORDS.map((w, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className="px-8 font-display text-h2 font-bold uppercase leading-none text-[var(--color-bone)]">
                  {w}
                </span>
                <span className="text-h3 text-[var(--color-acid)]">✺</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
