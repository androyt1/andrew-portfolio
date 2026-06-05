import { useRef } from "react";
import { useGSAP } from "../../lib/useGSAP";
import { gsap } from "../../lib/smoothScroll";

const TEXT =
  "Most interfaces fade the moment you scroll past them. I build the opposite — fast, accessible products with real weight, where model output becomes a clear interface and every interaction is engineered to ship.";

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);

  // word-by-word brightening tied to scroll progress
  useGSAP(() => {
    const words = root.current!.querySelectorAll("[data-w]");
    gsap.fromTo(
      words,
      { color: "#3a372f" },
      {
        color: "#ece8df",
        stagger: 0.4,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top 70%",
          end: "bottom 75%",
          scrub: true,
        },
      },
    );
  }, []);

  return (
    <section
      ref={root}
      className="relative grid grid-cols-12 gap-y-10 px-[var(--gutter)] py-[16vh] md:py-[22vh]"
    >
      <div className="col-span-12 md:col-span-3">
        <p className="label sticky top-28">
          <span className="text-[var(--color-acid)]">[01]</span>
          <br />
          Manifesto
        </p>
      </div>

      <h2 className="col-span-12 text-h3 font-display font-semibold leading-[1.08] tracking-[-0.02em] md:col-span-9 md:col-start-4">
        {TEXT.split(" ").map((w, i) => (
          <span key={i} data-w className="inline-block" style={{ color: "#3a372f" }}>
            {w}&nbsp;
          </span>
        ))}
      </h2>
    </section>
  );
}
