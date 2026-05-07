export type Project = {
  name: string;
  tagline: string;
  stack: string[];
  highlights: string[];
  url?: string;
  /** Domain (e.g. "Healthcare", "NLP"). Shown as a colored chip. */
  domain?: string;
  domainAccent?: string;
  /** Single emoji/symbol shown in the project's icon tile. */
  glyph?: string;
  /** Tailwind classes for the icon tile. */
  glyphAccent?: string;
};

export const projects: Project[] = [
  {
    name: "MeroDaktar",
    tagline: "AI-powered medical consultation platform with real-time voice interviews and diagnostic reports.",
    stack: ["Python", "FastAPI", "GPT-4", "Voice AI"],
    highlights: [
      "Real-time patient interviews → preliminary diagnostic reports + appointment booking.",
      "Browser-based voice interaction for hands-free consultations.",
      "Hardened FastAPI backend for AI requests and health-record handling.",
    ],
    domain: "Healthcare",
    domainAccent: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    glyph: "✚",
    glyphAccent: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  },
  {
    name: "Mistral-7B Private RAG",
    tagline: "Local-first Q&A over private documents — nothing leaves the box.",
    stack: ["Mistral-7B", "LangChain", "Quantization"],
    highlights: [
      "Privacy-focused chatbot answering from private corpora without external API calls.",
      "Document processing + retrieval pipeline for grounded answers.",
    ],
    url: "https://github.com/Utshav-paudel/Mistarl7B-Question-Answer-on-your-data",
    domain: "LLMs",
    domainAccent: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    glyph: "⌘",
    glyphAccent: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  },
  {
    name: "YouTube Assistant",
    tagline: "Drop a URL, get summaries and Q&A over video content.",
    stack: ["LangChain", "OpenAI", "Python"],
    highlights: [
      "Auto-summarizes YouTube videos and answers questions about content.",
    ],
    url: "https://github.com/Utshav-paudel/YouTube-assistant-langchain",
    domain: "NLP",
    domainAccent: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    glyph: "▶",
    glyphAccent: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
];
