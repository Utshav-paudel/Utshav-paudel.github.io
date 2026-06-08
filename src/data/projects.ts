export type Project = {
  name: string;
  tagline: string;
  stack: string[];
  highlights: string[];
  /** Primary external link (e.g. a model/demo). Labeled by destination. */
  url?: string;
  /** Source-code repository (e.g. GitHub). Shown as a separate "GitHub" link. */
  repo?: string;
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
    tagline:
      "AI medical consultation platform for Nepali patients. Voice-driven patient interviews powered by a custom MedGemma-Nepali multimodal model.",
    stack: ["MedGemma 4B", "Gemma-3", "Voice AI", "FastAPI"],
    highlights: [
      "Fine-tuned MedGemma (4B, Gemma-3 family) for Nepali-language clinical image-text reasoning; released fp16, 16-bit, and 4-bit variants on Hugging Face.",
      "Real-time voice patient interviews → preliminary diagnostic reports + appointment booking, end-to-end in Nepali.",
      "FastAPI backend handling AI inference and health-record flow.",
    ],
    url: "https://huggingface.co/Utshav/medgemma-nepali-fp16",
    repo: "https://github.com/Utshav-paudel/Merodaktar",
    domain: "Healthcare",
    domainAccent: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    glyph: "✚",
    glyphAccent: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  },
  {
    name: "Llama-3-70B Extractor",
    tagline:
      "Fine-tuned Llama-3-70B-Instruct for structured information extraction from web content.",
    stack: ["Llama 3 70B", "Information Extraction"],
    highlights: [
      "Trained alongside two open Hugging Face datasets (Dental_website_scraping, Dentalweb_extraction) used as the source corpus.",
      "Released full-weights, adapter, and 4-bit variants for different inference budgets.",
    ],
    url: "https://huggingface.co/Utshav/LLama3-70b-Instruct-finetuned-extractions",
    domain: "LLMs",
    domainAccent: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    glyph: "⌘",
    glyphAccent: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  },
];
