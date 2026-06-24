import { useEffect, useRef, useState } from "react";
import { getLenis } from "../lib/smoothScroll";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's Andrew's experience with RAG and agents?",
  "What's his frontend stack?",
  "Is he available for work?",
  "Tell me about his time at HSBC.",
];

const GREETING =
  "Hi — I'm Andrew's AI assistant, a small RAG model grounded in his CV. Ask me about his experience, stack, projects or availability.";

// Opera and Firefox don't ship the Web Speech Recognition API, so the mic can't
// transcribe there — let the user know rather than leaving a dead button.
const NO_MIC_NOTE =
  "Voice input isn't available in this browser — it needs Chrome, Edge or Safari. You can type your question here instead.";

// minimal Web Speech typings (the DOM lib types aren't always present)
type SREvent = {
  results: { length: number; [i: number]: { 0: { transcript: string }; isFinal: boolean } };
};
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<SR | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // pick the most natural English voice the device offers (defaults are robotic)
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const pick = () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      const en = voices.filter((v) => /^en[-_]?/i.test(v.lang));
      const ranked = [
        /Google UK English Female/i,
        /Google UK English/i,
        /Google US English/i,
        /Natural/i,
        /\bSiri\b/i,
        /Samantha/i,
        /Aria|Jenny|Sonia|Libby|Ava|Emma/i,
        /Online/i,
        /Google/i,
      ];
      let chosen: SpeechSynthesisVoice | undefined;
      for (const re of ranked) {
        chosen = en.find((v) => re.test(v.name));
        if (chosen) break;
      }
      voiceRef.current =
        chosen ?? en.find((v) => /en-GB/i.test(v.lang)) ?? en[0] ?? voices[0] ?? null;
    };
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  // autoscroll to newest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // lock page scroll on mobile while open
  useEffect(() => {
    const lenis = getLenis();
    if (open && window.matchMedia("(max-width: 640px)").matches) {
      lenis?.stop();
      document.body.style.overflow = "hidden";
    } else {
      lenis?.start();
      document.body.style.overflow = "";
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  // iOS Safari only permits speech that was unlocked by a user gesture — call
  // this from the tap that turns Voice on to prime the engine for the session.
  function primeSpeech() {
    if (typeof speechSynthesis === "undefined") return;
    try {
      speechSynthesis.cancel();
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      if (voiceRef.current) warm.voice = voiceRef.current;
      speechSynthesis.speak(warm);
    } catch {
      /* ignore */
    }
  }

  function speak(text: string) {
    if (!voiceOut || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    speechSynthesis.resume(); // iOS sometimes parks the queue
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1;
    u.pitch = 1;
    speechSynthesis.speak(u);
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const fallback = await res.text().catch(() => "");
        const msg =
          fallback ||
          "Sorry — I couldn't reach the assistant. Please email androyt1@gmail.com.";
        setMessages((m) => withLastAssistant(m, msg));
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => withLastAssistant(m, acc));
      }
      if (acc) speak(acc);
    } catch {
      setMessages((m) =>
        withLastAssistant(
          m,
          "Sorry — something went wrong. Please email androyt1@gmail.com.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (!speechSupported) {
      // surface the limitation once, then focus the text input
      setMessages((m) =>
        m[m.length - 1]?.content === NO_MIC_NOTE
          ? m
          : [...m, { role: "assistant", content: NO_MIC_NOTE }],
      );
      inputRef.current?.focus();
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-GB";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const seg = e.results[i];
        const transcript = seg[0].transcript;
        if (seg.isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInput(finalText || interim);
    };
    r.onend = () => {
      setListening(false);
      recogRef.current = null;
      if (finalText.trim()) send(finalText);
    };
    r.onerror = () => {
      setListening(false);
      recogRef.current = null;
    };
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-cursor="hover"
        aria-label={open ? "Close assistant" : "Ask Andrew's AI assistant"}
        className="fixed bottom-5 right-5 z-[9100] flex items-center gap-2.5 rounded-full border border-[var(--color-bone)]/15 bg-[var(--color-coal)]/90 px-4 py-3 font-mono text-label uppercase tracking-[0.14em] text-[var(--color-bone)] backdrop-blur-md transition-colors hover:border-[var(--color-acid)]/60"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-acid)] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-acid)]" />
        </span>
        {open ? "Close" : "Ask my AI"}
      </button>

      {/* panel */}
      <div
        data-open={open}
        className="fixed bottom-0 right-0 z-[9090] flex h-[min(72vh,600px)] w-full origin-bottom-right flex-col overflow-hidden border border-[var(--color-bone)]/12 bg-[var(--color-ink)]/95 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open=false]:pointer-events-none data-[open=false]:translate-y-4 data-[open=false]:opacity-0 sm:bottom-20 sm:right-5 sm:h-[560px] sm:w-[400px] sm:rounded-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-[var(--color-bone)]/10 px-5 py-4">
          <div>
            <p className="font-display text-base font-bold leading-none text-[var(--color-bone)]">
              Andrew&rsquo;s AI<span className="text-[var(--color-acid)]">.</span>
            </p>
            <p className="label mt-1 normal-case tracking-normal">RAG assistant · grounded in his CV</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const turningOn = !voiceOut;
                if (turningOn) primeSpeech();
                else if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
                setVoiceOut(turningOn);
              }}
              data-cursor="hover"
              aria-pressed={voiceOut}
              title={voiceOut ? "Spoken answers on" : "Spoken answers off"}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                voiceOut
                  ? "border-[var(--color-acid)] text-[var(--color-acid)]"
                  : "border-[var(--color-bone)]/25 text-[var(--color-bone-dim)]"
              }`}
            >
              Voice {voiceOut ? "on" : "off"}
            </button>
            <button
              onClick={() => setOpen(false)}
              data-cursor="hover"
              aria-label="Close"
              className="px-2 text-[var(--color-bone-dim)] transition-colors hover:text-[var(--color-bone)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-body leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--color-bone)] text-[var(--color-void)]"
                    : "bg-[var(--color-coal)] text-[var(--color-bone)]"
                }`}
              >
                {m.content || (busy ? "…" : "")}
              </p>
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  data-cursor="hover"
                  className="rounded-full border border-[var(--color-bone)]/15 px-3 py-1.5 text-left text-micro text-[var(--color-bone-dim)] transition-colors hover:border-[var(--color-acid)]/60 hover:text-[var(--color-bone)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[var(--color-bone)]/10 px-3 py-3"
        >
          <button
            type="button"
            onClick={toggleMic}
            data-cursor="hover"
            aria-label={
              !speechSupported
                ? "Voice input unavailable in this browser"
                : listening
                  ? "Stop listening"
                  : "Speak your question"
            }
            title={speechSupported ? undefined : "Voice input needs Chrome, Edge or Safari"}
            className={`shrink-0 rounded-full border p-2.5 transition-colors ${
              listening
                ? "animate-pulse border-[var(--color-acid)] text-[var(--color-acid)]"
                : speechSupported
                  ? "border-[var(--color-bone)]/25 text-[var(--color-bone-dim)] hover:border-[var(--color-acid)]/60 hover:text-[var(--color-bone)]"
                  : "border-[var(--color-bone)]/15 text-[var(--color-ash)] hover:text-[var(--color-bone-dim)]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" />
            </svg>
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Ask about Andrew…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-body text-[var(--color-bone)] placeholder:text-[var(--color-ash)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            data-cursor="hover"
            aria-label="Send"
            className="shrink-0 rounded-full bg-[var(--color-acid)] p-2.5 text-[var(--color-void)] transition-opacity disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}

function withLastAssistant(messages: Msg[], content: string): Msg[] {
  const copy = messages.slice();
  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === "assistant") {
      copy[i] = { ...copy[i], content };
      break;
    }
  }
  return copy;
}
