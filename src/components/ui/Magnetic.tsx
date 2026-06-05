import { useEffect, useRef, type ReactNode } from "react";
import { useCoarsePointer } from "../../lib/hooks";

type Props = {
  children: ReactNode;
  /** fraction of cursor-offset applied as translation (0–1) */
  strength?: number;
  className?: string;
};

/**
 * Magnetic wrapper — the child is pulled toward the cursor while the pointer is
 * within its hit-area, then springs back on leave. rAF lerp, no library.
 */
export default function Magnetic({ children, strength = 0.4, className }: Props) {
  const coarse = useCoarsePointer();
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (coarse) return;
    const el = ref.current!;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      target.current.x = (e.clientX - cx) * strength;
      target.current.y = (e.clientY - cy) * strength;
    };
    const onEnter = () => window.addEventListener("pointermove", onMove);
    const onLeave = () => {
      window.removeEventListener("pointermove", onMove);
      target.current.x = 0;
      target.current.y = 0;
    };

    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      el.style.transform = `translate3d(${pos.current.x.toFixed(2)}px, ${pos.current.y.toFixed(2)}px, 0)`;
      frame.current = requestAnimationFrame(loop);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    frame.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame.current);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onMove);
    };
  }, [coarse, strength]);

  if (coarse) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
