export type Experience = {
  role: string;
  company: string;
  /** Company website URL. If absent, the company name is plain text (no link). */
  companyUrl?: string;
  /** Domain, used to derive the company favicon when logoUrl is absent. */
  companyDomain?: string;
  /**
   * Manual logo URL override. Use this when the auto-derived favicon looks bad.
   * Right-click the company logo on LinkedIn → "Copy image URL".
   */
  logoUrl?: string;
  /** Tailwind class for the logo avatar background. Use 'bg-ink-900' for white-on-transparent logos. */
  logoBg?: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
  current?: boolean;
};

export const experience: Experience[] = [
  {
    role: "AI Engineer",
    company: "MedForce AI",
    companyUrl: "https://www.medforce-ai.com/",
    companyDomain: "medforce-ai.com",
    logoUrl:
      "https://images.squarespace-cdn.com/content/v1/67cec3f52544582e2396f8b7/c87ce46b-cde1-4445-aa7e-2a6ed647c5ed/medforce+ai+logo.png?format=1500w",
    location: "London, UK · Remote",
    start: "Jun 2025",
    end: "Present",
    current: true,
    bullets: [
      "AI engineer on a clinical-automation platform deployed in an NHS pilot. Designed the agent architecture and clinical RAG pipeline targeting clinician documentation and decision-support workflows.",
      "Fine-tune domain-specific LLMs (Mistral 8×22B, Llama 3, Command R family) on curated hepatology cases for medical reasoning and structured documentation; build clinical evaluation harnesses covering factuality, citation grounding, and hallucination rate.",
      "Cut inference cost and latency for real-time clinical use through various caching techniques (KV cache, prompt caching, semantic response cache), request batching, and quantization; built monitoring for latency, drift, and hallucination signals.",
    ],
  },
  {
    role: "AI Engineer",
    company: "Digital-Dandelion",
    companyUrl: "https://digital-dandelion.com/",
    companyDomain: "digital-dandelion.com",
    logoUrl: "https://digital-dandelion.com/img/digital-dandelion-logo.svg",
    logoBg: "bg-ink-900",
    location: "London, UK · Remote",
    start: "Feb 2024",
    end: "Jun 2025",
    bullets: [
      "Built a clinical RAG system over EASL liver-disease guidelines using a multi-route retrieval architecture: simple queries served by embedding-based retrieval, complex queries routed to page-indexed advanced RAG. Reached 97% answer accuracy vs. 85% on a state-of-the-art baseline and cut end-to-end latency by 50%.",
      "Trained an EfficientNet image-classification system on GCP scoring 30,000+ dental websites for modernization; lifted accuracy from 89% → 95% via targeted data augmentation and an architecture switch from the prior baseline. Released the dental scraping and extraction datasets on Hugging Face.",
      "Built a multimodal ranking system for JLL evaluating hundreds of commercial real-estate offices via pairwise tournament comparisons across building exterior, interior, workspace, and floor-plan imagery to identify top performers.",
      "Fine-tuned an LLM on hundreds of past winning creative campaigns and creative-director rubrics for Page & Page (Novo Nordisk account); validated outputs on KPIs spanning relevance, creativity, and brand-fit.",
    ],
  },
  {
    role: "Junior ML Engineer",
    company: "Omdena",
    companyUrl: "https://www.omdena.com/",
    companyDomain: "omdena.com",
    logoUrl: "https://www.omdena.com/images/omdena.png",
    location: "New York, USA · Remote",
    start: "Jul 2023",
    end: "Sep 2023",
    bullets: [
      "Coordinated a 10–20-person distributed team across multiple timezones building scraping infrastructure that assembled a 46,000-article Nepali news corpus, the working dataset for the program's media-representation research.",
      "Built Nepali-language NLP models capturing local idioms to classify how women and marginalized groups are represented in Nepali news media.",
      "Designed a media-diversity scoring model with explicit progress metrics surfaced to research stakeholders.",
    ],
  },
];
