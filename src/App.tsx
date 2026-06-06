import { useEffect, useState } from "react";
import { initSmoothScroll, ScrollTrigger } from "./lib/smoothScroll";
import Cursor from "./components/Cursor";
import Grain from "./components/Grain";
import Preloader from "./components/Preloader";
import Nav from "./components/Nav";
import Hero from "./components/hero/Hero";
import Manifesto from "./components/sections/Manifesto";
import Work from "./components/sections/Work";
import Capabilities from "./components/sections/Capabilities";
import About from "./components/sections/About";
import Marquee from "./components/sections/Marquee";
import Footer from "./components/sections/Footer";
import Assistant from "./components/Assistant";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const teardown = initSmoothScroll();
    // one coordinated refresh once async fonts have loaded (fluid type can
    // shift trigger positions); individual sections no longer self-refresh.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  // refresh after the preloader releases (layout becomes scrollable)
  useEffect(() => {
    if (ready) {
      const id = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(id);
    }
  }, [ready]);

  return (
    <>
      <Grain />
      <Cursor />
      <Preloader onDone={() => setReady(true)} />
      <Nav />
      <main id="top">
        <Hero />
        <Manifesto />
        <Work />
        <Capabilities />
        <About />
        <Marquee />
        <Footer />
      </main>
      <Assistant />
    </>
  );
}
