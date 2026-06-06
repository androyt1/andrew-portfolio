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

    let hovering = false;
    let pressed = false;
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Dot and ring track the pointer exactly. The press-shrink is part of the
    // SAME transform (after the centring translate) so it scales around the
    // cursor itself — a separate `scale` property scales around the element's
    // top-left origin, which was yanking the ring sideways on mousedown.
    const render = () => {
      const base = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      dot.style.transform = base;
      ring.style.transform = pressed ? `${base} scale(0.82)` : base;
    };

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      render();
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
    const onDown = () => {
      pressed = true;
      render();
    };
    const onUp = () => {
      pressed = false;
      render();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

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
