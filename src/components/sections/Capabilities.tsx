import { SplitReveal } from "../ui/Reveal";

const CAPS = [
  {
    n: "01",
    title: "Frontend Engineering",
    tags: "React · TypeScript · Next.js · Tailwind · shadcn/ui",
  },
  {
    n: "02",
    title: "AI Engineering",
    tags: "Python · LangChain · LangGraph · RAG · OpenAI · Pinecone",
  },
  {
    n: "03",
    title: "Platform & Delivery",
    tags: "AWS · Docker · FastAPI · Vercel · CI/CD",
  },
  {
    n: "04",
    title: "Testing & Quality",
    tags: "Jest · Vitest · Cypress · Playwright",
  },
];

export default function Capabilities() {
  return (
    <section id="stack" className="relative px-[var(--gutter)] py-[14vh] md:py-[18vh]">
      {/* asymmetric header — offset into the grid */}
      <div className="grid grid-cols-12 gap-y-8">
        <p className="label col-span-12 md:col-span-3">
          <span className="text-[var(--color-acid)]">[03]</span>
          <br />
          Stack
        </p>
        <div className="col-span-12 md:col-span-8 md:col-start-4">
          <SplitReveal
            as="h2"
            text="The stack I reach for, front to back"
            className="text-h2 font-display leading-[0.95]"
          />
          <p className="mt-8 max-w-[46ch] text-lead font-light text-[var(--color-bone-dim)] md:ml-auto md:text-right">
            Four layers, one goal — turning model output and data into interfaces that feel{" "}
            <span className="font-serif italic text-[var(--color-bone)]">effortless</span>.
          </p>
        </div>
      </div>

      {/* interactive capability rows */}
      <ul className="mt-16 border-t edge md:mt-24">
        {CAPS.map((c) => (
          <li key={c.n} className="group border-b edge">
            <button
              data-cursor="hover"
              className="relative flex w-full items-center justify-between gap-6 overflow-hidden py-7 text-left md:py-9"
            >
              {/* accent sweep on hover */}
              <span className="absolute inset-0 -z-0 origin-left scale-x-0 bg-[var(--color-acid)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

              <span className="relative z-10 flex items-baseline gap-5 md:gap-10">
                <span className="font-mono text-label text-[var(--color-ash)] transition-colors duration-500 group-hover:text-[var(--color-void)]">
                  {c.n}
                </span>
                <span className="text-h3 font-display leading-none text-[var(--color-bone)] transition-colors duration-500 group-hover:text-[var(--color-void)]">
                  {c.title}
                </span>
              </span>

              <span className="relative z-10 hidden font-mono text-label uppercase tracking-[0.16em] text-[var(--color-bone-dim)] transition-colors duration-500 group-hover:text-[var(--color-void)] md:inline">
                {c.tags}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
