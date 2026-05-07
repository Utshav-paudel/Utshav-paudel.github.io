export type Project = {
  name: string;
  tagline: string;
  stack: string[];
  highlights: string[];
  url?: string;
};

export const projects: Project[] = [
  {
    name: "MeroDaktar",
    tagline: "AI-powered medical consultation platform",
    stack: ["Python", "FastAPI", "GPT-4", "Voice AI"],
    highlights: [
      "Real-time patient interviews → preliminary diagnostic reports + appointment booking.",
      "Browser-based voice interaction for hands-free consultations.",
      "Hardened FastAPI backend for AI requests and health-record handling.",
    ],
  },
  {
    name: "Mistral-7B Private RAG",
    tagline: "Local-first Q&A over private documents — nothing leaves the box",
    stack: ["Mistral-7B", "LangChain", "Quantization"],
    highlights: [
      "Privacy-focused chatbot answering from private corpora without external API calls.",
      "Document processing + retrieval pipeline for grounded answers.",
    ],
    url: "https://github.com/Utshav-paudel/Mistarl7B-Question-Answer-on-your-data",
  },
  {
    name: "YouTube Assistant",
    tagline: "Drop a URL, get summaries and Q&A",
    stack: ["LangChain", "OpenAI", "Python"],
    highlights: [
      "Auto-summarizes YouTube videos and answers questions about content.",
    ],
    url: "https://github.com/Utshav-paudel/YouTube-assistant-langchain",
  },
];
