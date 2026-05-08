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
      "Leading the build of a clinical-automation platform for an NHS pilot. Generative AI to streamline workflows, targeting 10x doctor efficiency.",
      "Fine-tuning domain-specific LLMs for hepatologists to automate medical reasoning and documentation.",
      "Tightening system design and model pipelines for fast, reliable real-time clinical use.",
    ],
  },
  {
    role: "AI Engineer",
    company: "Digital-Dandelion",
    companyUrl: "https://digital-dandelion.com/",
    companyDomain: "digital-dandelion.com",
    logoUrl: "https://digital-dandelion.com/img/digital-dandelion-logo.svg",
    location: "London, UK · Remote",
    start: "Feb 2024",
    end: "Jun 2025",
    bullets: [
      "Built a scalable image-classification system on GCP scoring 30,000+ dental websites for modernization.",
      "Created an automated ranking system for JLL identifying top-performing real-estate offices from digital signals.",
      "Built an agentic-AI pipeline for Page & Page generating creative campaigns for Novo Nordisk.",
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
      "Led scraping ops to assemble a 46,000-article dataset for NLP analysis.",
      "Built Nepali-language models capturing local idioms, classifying news on women and marginalized groups.",
      "Designed a media-diversity scoring model with clear progress metrics.",
    ],
  },
  {
    role: "Data Science Intern",
    company: "The Sparks Foundation",
    location: "Remote",
    start: "Jun 2023",
    end: "Jul 2023",
    bullets: [
      "Applied supervised-learning algorithms to business-analytics problems.",
    ],
  },
];
