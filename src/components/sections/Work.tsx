import { useRef } from "react";
import { useGSAP } from "../../lib/useGSAP";
import { gsap } from "../../lib/smoothScroll";
import { useCoarsePointer } from "../../lib/hooks";

type Project = {
  index: string;
  title: string;
  category: string;
  stack: string;
  blurb: string;
  year: string;
  tint: string;
  surface: string;
};

const PROJECTS: Project[] = [
  {
    index: "01",
    title: "DEVLENS",
    category: "AI GitHub Repo Analyser",
    stack: "React · TypeScript · Claude API",
    blurb:
      "Analyses public repositories and auto-generates codebase summaries, stack breakdowns, code-quality reports and README drafts.",
    year: "2026",
    tint: "#ff5a1f",
    surface:
      "radial-gradient(120% 90% at 20% 15%, #2a1206 0%, #0f0a06 55%), linear-gradient(135deg, #1a1108, #0a0908)",
  },
  {
    index: "02",
    title: "RAG CV",
    category: "Voice RAG Assistant",
    stack: "Python · FastAPI · LangGraph · Pinecone",
    blurb:
      "Production RAG pipeline that ingests resume data into Pinecone and answers recruiter questions out loud — voice queries in, traced and cited responses back.",
    year: "2026",
    tint: "#7cf0ff",
    surface:
      "radial-gradient(110% 80% at 80% 10%, #0a2630 0%, #060d10 60%), linear-gradient(135deg, #0b1418, #0a0908)",
  },
  {
    index: "03",
    title: "STUDY AI",
    category: "AI Study Companion",
    stack: "Next.js · OpenAI · Gemini Vision",
    blurb:
      "Context-aware assistant that lets users upload documents and query them in natural language, with multimodal PDF analysis.",
    year: "2026",
    tint: "#c4a6ff",
    surface:
      "radial-gradient(120% 90% at 70% 30%, #1c1430 0%, #0c0a14 60%), linear-gradient(135deg, #14101e, #0a0908)",
  },
  {
    index: "04",
    title: "LIVE BOARD",
    category: "Real-Time Collaboration",
    stack: "React · WebSockets · Supabase",
    blurb:
      "Collaborative workspace with live cursors, threaded comments and Markdown autosave — Google Docs-style interactions.",
    year: "2026",
    tint: "#5fd39a",
    surface:
      "radial-gradient(120% 90% at 30% 80%, #0a2616 0%, #060f0a 60%), linear-gradient(135deg, #0b1812, #0a0908)",
  },
];

export default function Work() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();

  useGSAP(() => {
    if (coarse) return; // mobile gets a native vertical/scroll-snap list
    const trackEl = track.current!;
    const getScroll = () => trackEl.scrollWidth - window.innerWidth;

    const tween = gsap.to(trackEl, {
      x: () => -getScroll(),
      ease: "none",
      scrollTrigger: {
        trigger: section.current,
        start: "top top",
        end: () => `+=${getScroll()}`,
        pin: true,
        scrub: 1, // inertia / smoothing on the horizontal track
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    // progress bar
    const bar = section.current!.querySelector("[data-work-bar]") as HTMLElement;
    gsap.to(bar, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: section.current,
        start: "top top",
        end: () => `+=${getScroll()}`,
        scrub: true,
      },
    });

    return () => {
      tween.kill();
    };
  }, [coarse]);

  return (
    <section id="work" ref={section} className="relative overflow-hidden bg-[var(--color-ink)]">
      {/* header — in flow on mobile, overlays the pinned track on desktop */}
      <div className="pointer-events-none z-20 flex items-start justify-between px-[var(--gutter)] pt-28 pb-2 md:absolute md:inset-x-0 md:top-0 md:pb-0 md:pt-28">
        <p className="label">
          <span className="text-[var(--color-acid)]">[02]</span>
          <br />
          Selected work
        </p>
        <p className="label hidden text-right md:block">
          Drag · Scroll
          <br />
          {PROJECTS.length} projects
        </p>
      </div>

      {/* horizontal track */}
      <div
        ref={track}
        className="flex h-[100svh] items-center gap-[6vw] px-[var(--gutter)] will-change-transform max-md:h-auto max-md:flex-col max-md:gap-16 max-md:pb-24 max-md:pt-4"
        style={{ width: "max-content" }}
      >
        {/* intro plate */}
        <div className="flex h-[70vh] w-[60vw] shrink-0 flex-col justify-end max-md:h-auto max-md:w-full">
          <h2 className="text-h2 font-display leading-[0.9]">
            Things I&rsquo;ve
            <br />
            <span className="font-serif font-normal italic text-[var(--color-acid)]">shipped</span>.
          </h2>
          <p className="mt-6 max-w-[34ch] text-body text-[var(--color-bone-dim)]">
            Selected builds across AI, frontend and real-time products — most recently exploring agents and RAG.
          </p>
        </div>

        {PROJECTS.map((p) => (
          <Card key={p.index} project={p} />
        ))}

        {/* end plate */}
        <div className="flex h-[70vh] w-[42vw] shrink-0 flex-col justify-center max-md:h-auto max-md:w-full">
          <p className="label mb-4">More on request</p>
          <a
            href="#contact"
            data-cursor="view"
            data-cursor-label="Say hi"
            className="text-h3 font-display leading-none transition-colors hover:text-[var(--color-acid)]"
          >
            Let&rsquo;s<br />talk →
          </a>
        </div>
      </div>

      {/* scrub progress */}
      <div className="absolute inset-x-[var(--gutter)] bottom-8 z-20 hidden h-px bg-[var(--color-bone)]/15 md:block">
        <div data-work-bar className="h-full w-full origin-left scale-x-0 bg-[var(--color-acid)]" />
      </div>
    </section>
  );
}

function Card({ project }: { project: Project }) {
  return (
    <article
      data-cursor="view"
      data-cursor-label="View"
      className="group relative h-[70vh] w-[clamp(320px,46vw,640px)] shrink-0 overflow-hidden rounded-[2px] max-md:h-[62vh] max-md:w-full"
      style={{ background: project.surface }}
    >
      {/* accent edge that grows on hover */}
      <span
        className="absolute left-0 top-0 z-10 h-1 w-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full"
        style={{ background: project.tint }}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-10">
        <div className="flex items-start justify-between font-mono text-label uppercase tracking-[0.16em] text-[var(--color-bone-dim)]">
          <span style={{ color: project.tint }}>{project.index}</span>
          <span>{project.year}</span>
        </div>

        <div data-card-meta>
          <p className="label mb-3">{project.category}</p>
          <h3 className="font-display text-[clamp(1.6rem,4.2vw,3.75rem)] leading-[0.95] [overflow-wrap:break-word] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1">
            {project.title}
          </h3>
          <p className="mt-4 max-w-[40ch] text-body leading-snug text-[var(--color-bone-dim)] opacity-100 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:opacity-0 md:group-hover:opacity-100">
            {project.blurb}
          </p>
          <p className="mt-4 font-mono text-micro uppercase tracking-[0.16em]" style={{ color: project.tint }}>
            {project.stack}
          </p>
        </div>
      </div>

      {/* hover wash */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(80% 60% at 50% 100%, ${project.tint}14, transparent 70%)`,
        }}
      />
    </article>
  );
}
