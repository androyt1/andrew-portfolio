import { createElement, useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "../../lib/useGSAP";
import { gsap } from "../../lib/smoothScroll";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** delay in seconds added to the base reveal */
  delay?: number;
  y?: number;
};

/** Block reveal — slides up + fades as it enters the viewport. */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  y = 40,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = ref.current!;
    gsap.from(el, {
      yPercent: 0,
      y,
      autoAlpha: 0,
      duration: 1.1,
      delay,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  }, []);

  return createElement(Tag, { ref, className }, children);
}

type SplitProps = {
  text: string;
  className?: string;
  /** seconds between each word */
  stagger?: number;
  delay?: number;
  as?: ElementType;
  start?: string;
};

/**
 * Word-by-word masked reveal for headlines. Each word lives inside an
 * overflow-hidden line and slides up from below with a stagger.
 */
export function SplitReveal({
  text,
  className,
  stagger = 0.08,
  delay = 0,
  as: Tag = "h2",
  start = "top 85%",
}: SplitProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(() => {
    const el = ref.current!;
    const inners = el.querySelectorAll<HTMLElement>("[data-word-inner]");
    gsap.set(inners, { yPercent: 115 });
    gsap.to(inners, {
      yPercent: 0,
      duration: 1.2,
      delay,
      ease: "expo.out",
      stagger,
      scrollTrigger: { trigger: el, start },
    });
  }, []);

  return createElement(
    Tag,
    { ref, className },
    <>
      {words.map((w, i) => (
        <span
          key={i}
          className="line-mask align-bottom"
          style={{ display: "inline-block", paddingBottom: "0.14em", marginBottom: "-0.14em" }}
        >
          <span data-word-inner style={{ display: "inline-block", willChange: "transform" }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>,
  );
}
