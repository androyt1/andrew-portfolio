# Andrew Aghoghovwia — Portfolio

**Live:** [andrew-aghoghovwia.vercel.app](https://andrew-aghoghovwia.vercel.app)

An Awwwards-tier personal portfolio for **Andrew Aghoghovwia**, Senior Frontend & AI Engineer. Themed around *gravity / weight / pull* ("interfaces with gravity"). Dark, cinematic, scroll-driven, built for 60fps.

**Sections:** Hero (WebGL) → Manifesto → Work (DevLens · RAG CV · AI Study Companion · LiveBoard) → Stack (Frontend · AI · Platform · Testing) → About (portrait + experience timeline + stat counters) → Marquee → Contact.

## Signature moments

- **WebGL hero** — a high-detail icosahedron displaced by custom GLSL simplex noise, warping and pulling toward the cursor like it has its own gravity, wrapped in a fresnel rim glow and an additive particle field. Lazy-loaded and skipped under `prefers-reduced-motion` / touch.
- **Horizontal featured-work** — a pinned section that translates a card track sideways with scrub inertia (Lenis + GSAP ScrollTrigger), with a live progress bar.
- **Choreographed preloader** — counter races 0→100 while the wordmark assembles, then the panel lifts to reveal a settled hero.
- **Custom magnetic cursor** — a difference-blended dot + trailing ring that expands and labels itself over interactive elements; buttons/links have a magnetic pull.
- **Scroll-reveal typography** — masked word-by-word headline reveals and a manifesto that brightens word-by-word on scroll.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 (`@theme` tokens, fluid `clamp()` type scale) |
| 3D | three.js + @react-three/fiber 9 (raw GLSL, no drei) |
| Animation | GSAP 3 + ScrollTrigger |
| Smooth scroll | Lenis (driven by GSAP's ticker so both share one rAF) |

## Design system

- **Palette:** warm near-black `#0a0908`, bone `#ece8df`, electric-lime accent `#ccff00` (deliberately not the cliché space blue/purple).
- **Type:** Syne (display) · Manrope (body) · Instrument Serif (italic accents) · Space Mono (labels) — serif/sans/mono tension.
- **Fluid scale:** every size is a `clamp()` token in `src/index.css` (`--text-micro` → `--text-mega`).
- **Custom easing only:** expo / quart cubic-beziers — no `ease`/`linear`.

## Performance

- Three.js, GSAP and fiber are split into separate chunks; the WebGL scene is a lazy `import()` (only ~88 kB gzip JS on first paint).
- Animations stick to `transform` / `opacity`; DPR is capped; geometry detail and particle count drop under reduced motion.
- Fonts preconnected + preloaded; grain is a pure-CSS SVG turbulence overlay.
- Full support for `prefers-reduced-motion` (native scroll, static hero glow, paused grain) and coarse pointers (native cursor, vertical work list).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle → dist/
npm run preview    # serve the build
```

## Structure

```
src/
  components/
    hero/        Hero, GravScene (R3F canvas), blobShaders (GLSL)
    sections/    Manifesto, Work, Capabilities, Approach, Marquee, Footer
    ui/          Magnetic, Reveal / SplitReveal
    Cursor, Grain, Preloader, Nav
  lib/
    smoothScroll Lenis + ScrollTrigger bootstrap
    useGSAP      context-scoped GSAP-in-React hook
    hooks        pointer / reduced-motion / coarse-pointer helpers
  index.css      design tokens, fluid type, grain, cursor states
```
