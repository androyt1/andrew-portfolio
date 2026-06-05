import { useEffect, useRef } from "react";
import { useCoarsePointer } from "../lib/hooks";

/**
 * Custom cursor: a small filled dot + a larger trailing ring.
 * The ring lerps behind the dot for inertia. On elements marked
 * `data-cursor="..."` the ring expands and can show a label.
 */
export default function Cursor() {
  const coarse = useCoarsePointer();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (coarse) return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let raf = 0;
    let hovering = false;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
    };

    const setHover = (active: boolean, text = "", variant = "") => {
      hovering = active;
      ring.dataset.active = active ? "true" : "false";
      ring.dataset.variant = variant;
      label.textContent = text;
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest<HTMLElement>("[data-cursor]");
      if (el) {
        setHover(true, el.dataset.cursorLabel ?? "", el.dataset.cursor ?? "hover");
      }
    };
    const onOut = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest<HTMLElement>("[data-cursor]");
      const next = (e.relatedTarget as HTMLElement)?.closest?.("[data-cursor]");
      if (el && !next) setHover(false);
    };
    const onDown = () => (ring.dataset.down = "true");
    const onUp = () => (ring.dataset.down = "false");

    const loop = () => {
      ringPos.x += (mouse.x - ringPos.x) * 0.16;
      ringPos.y += (mouse.y - ringPos.y) * 0.16;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf = requestAnimationFrame(loop);

    // hide when leaving the window
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      void hovering;
    };
  }, [coarse]);

  if (coarse) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-[var(--color-acid)] mix-blend-difference"
      />
      <div
        ref={ringRef}
        data-active="false"
        className="cursor-ring fixed left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-bone)]/40"
      >
        <span ref={labelRef} className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-void)]" />
      </div>
    </div>
  );
}
