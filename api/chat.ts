// Vercel Edge Function — RAG-over-CV assistant powered by Google Gemini.
// The CV is small enough that context-stuffing beats a vector DB: the whole
// profile is the grounding context, and the model is told to answer only from
// it. Streams plain text back to the client.

export const config = { runtime: "edge" };

// Tried in order; first one with a working free tier on the key is used.
const MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

// --- Andrew's grounding profile (the "knowledge base") -----------------------
const PROFILE = `
ANDREW AGHOGHOVWIA — Senior Frontend & AI Engineer
Location: Carshalton, London, United Kingdom. Status: open to senior frontend and agentic-AI roles.
Contact: email androyt1@gmail.com · phone +44 7821 460751 · LinkedIn linkedin.com/in/andrew-aghoghovwia.

SUMMARY
Senior engineer with 8+ years shipping production web products across React/TypeScript frontend
engineering and Python-based AI systems. Builds polished interfaces, FastAPI services, RAG workflows,
LangGraph agents, and LLM-powered product experiences that are fast, accessible, and ready to ship.

EXPERIENCE
1) Frontend & AI Engineer — Contract / R&D (Remote), 2023–Present.
   - Production RAG pipelines with Python, OpenAI APIs, Gemini Vision, Pinecone and Weaviate for
     context-aware AI responses.
   - Agentic workflows with LangGraph: self-grading RAG, multi-hop retrieval, human-in-the-loop
     agents, and conversational RAG with memory.
   - User-facing AI in Next.js and React — turning model output into clear UIs with loading states,
     citations and error handling.
   - LangSmith tracing + evaluation with RAGAS and openevals (faithfulness, context relevance,
     answer correctness).
   - Scalable dashboards and modular UI libraries with Next.js App Router, edge/serverless functions,
     shadcn/ui and Storybook; sub-100ms response targets.
2) Senior Frontend Developer — HSBC, Leeds, UK, 2022–2023.
   - Onboarding and ETL-tracking interfaces in React, TypeScript and the internal Masala Design System.
   - Improved performance ~40% via code splitting, lazy loading and component-level memoization.
   - Refined AWS CodePipeline and Jenkins flows with DevOps, cutting deployment time ~30%.
   - Mentored junior developers; raised code quality and accessibility.
3) Lead Frontend Developer — E-commerce (Contract), 2021–2022.
   - Delivered 10+ high-performance e-commerce platforms with Next.js, TypeScript, Tailwind and Shopify APIs.
   - Custom admin dashboards with D3.js and Chart.js; GTM, GA4 and Pixel; automated SEO audits.
4) Full Stack Web Developer — Kobu Innovative Solutions, Warri, Nigeria, 2016–2020.
   - Led a frontend rewrite from legacy code to React and Vue (~30% better load/UX).
   - WebSockets for real-time chat, live notifications and dynamic updates.
   - Full-stack e-commerce with Stripe, PayPal and mobile payment gateways.

SKILLS
Frontend: React, TypeScript, Next.js (App Router), Vue.js, Tailwind CSS, SCSS, shadcn/ui, Radix UI,
Material UI, Storybook, Redux Toolkit, Zustand, TanStack Query.
AI: Python, LangChain, LangGraph, LangSmith, RAG pipelines, agentic workflows, multi-hop RAG,
human-in-the-loop, OpenAI API, Gemini Vision, Pinecone, Weaviate, FAISS, RAGAS, openevals.
Platform: AWS (Lambda, S3, CodePipeline), Docker, Jenkins, GitHub Actions, Vercel, Railway, FastAPI,
Node.js, REST APIs, WebSockets.
Testing: Jest, Vitest, Cypress, Playwright.

FEATURED PROJECTS
- DevLens — AI GitHub repo analyser (React, TypeScript, Claude API): auto-generates codebase
  summaries, stack breakdowns, code-quality reports and README drafts.
- RAG CV Assistant (Voice) — (Python, FastAPI, LangChain, LangGraph, Pinecone, LangSmith): ingests
  resume data and answers recruiter questions with traced, cited responses. (This very chat is a
  lightweight version of that project.)
- AI Study Companion — (Next.js, OpenAI, RAG, Gemini Vision): upload documents and query them in
  natural language, including multimodal PDF analysis.
- Real-Time Collaboration Board — (React, WebSockets, Supabase, TypeScript): live cursors, threaded
  comments and Markdown autosave.

EDUCATION & CERTIFICATIONS
B.Sc. Library & Information Science, Delta State University, Nigeria.
Code Warrior White Belt (React Security) — XSS and SQL-injection prevention.
`;

const SYSTEM = `You are the AI assistant on Andrew Aghoghovwia's portfolio website. You answer questions
from recruiters and hiring managers about Andrew, grounded ONLY in the PROFILE below.

Rules:
- Answer ONLY from the PROFILE. Never invent facts, employers, dates, or skills.
- If something isn't in the PROFILE, say you don't have that detail and suggest emailing
  androyt1@gmail.com or connecting on LinkedIn.
- Be concise and natural — 1 to 4 short sentences. Answers may be read aloud, so avoid markdown,
  bullet symbols, links and code blocks; write plain conversational sentences.
- Refer to him as "Andrew". Be warm, professional and confident, not salesy.
- For availability/hiring questions, note he's open to senior frontend and agentic-AI roles and
  point to email or LinkedIn to take it further.

PROFILE:
${PROFILE}`;

type Msg = { role: "user" | "assistant"; content: string };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return new Response(
      "The assistant isn't configured yet. Please reach Andrew at androyt1@gmail.com.",
      { status: 503 },
    );
  }

  let messages: Msg[];
  try {
    const body = (await req.json()) as { messages?: Msg[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // guards (abuse / cost control — Gemini free tier also hard-caps usage)
  messages = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));

  if (messages.length === 0) return new Response("No message", { status: 400 });

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 400, temperature: 0.4, topP: 0.9 },
  };

  let upstream: Response | null = null;
  let lastErr = "";
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok && r.body) {
      upstream = r;
      break;
    }
    lastErr = `${model} -> ${r.status} ${(await r.text().catch(() => "")).slice(0, 100)}`;
  }

  if (!upstream || !upstream.body) {
    void lastErr;
    return new Response(
      "The assistant is briefly unavailable. Please try again in a moment, or email androyt1@gmail.com.",
      { status: 502 },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let buffer = "";
      (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const text: string =
                  json?.candidates?.[0]?.content?.parts
                    ?.map((p: { text?: string }) => p.text ?? "")
                    .join("") ?? "";
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                /* ignore partial json */
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      })();
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
