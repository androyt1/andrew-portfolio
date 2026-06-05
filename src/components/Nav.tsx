import { useEffect, useRef, useState } from "react";
import Magnetic from "./ui/Magnetic";
import { scrollTo } from "../lib/smoothScroll";

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/London",
        timeZoneName: "short",
        hour12: false,
      }).formatToParts(new Date());
      const clock = parts
        .filter((p) => ["hour", "minute", "second"].includes(p.type))
        .map((p) => p.value)
        .join(":");
      const zone = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
      return `${clock} ${zone}`;
    };
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

export default function Nav() {
  const ref = useRef<HTMLElement>(null);
  const lastY = useRef(0);

  // hide on scroll-down, reveal on scroll-up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const el = ref.current;
      if (el) {
        if (y > lastY.current && y > 200) el.dataset.hidden = "true";
        else el.dataset.hidden = "false";
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={ref}
      data-hidden="false"
      className="fixed inset-x-0 top-0 z-[9000] flex items-center justify-between px-[var(--gutter)] py-5 mix-blend-difference transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] data-[hidden=true]:-translate-y-full"
    >
      <Magnetic strength={0.5}>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
          data-cursor="hover"
          className="font-display text-xl font-extrabold tracking-tight text-[var(--color-bone)]"
        >
          Andrew<span className="text-[var(--color-acid)]">°</span>
        </a>
      </Magnetic>

      <nav className="hidden items-center gap-8 font-mono text-label uppercase tracking-[0.16em] text-[var(--color-bone)] md:flex">
        {[
          ["Work", "#work"],
          ["Stack", "#stack"],
          ["About", "#about"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(href);
            }}
            data-cursor="hover"
            className="group relative"
          >
            {label}
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--color-acid)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-6 font-mono text-label text-[var(--color-bone)]">
        <span className="hidden sm:inline">
          <Clock />
        </span>
        <Magnetic strength={0.5}>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("#contact");
            }}
            data-cursor="hover"
            className="rounded-full border border-[var(--color-bone)]/40 px-4 py-2 uppercase tracking-[0.16em] transition-colors hover:border-[var(--color-acid)]"
          >
            Contact
          </a>
        </Magnetic>
      </div>
    </header>
  );
}
