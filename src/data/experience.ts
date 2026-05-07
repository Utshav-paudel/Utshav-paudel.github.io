export type Experience = {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
};

export const experience: Experience[] = [
  {
    role: "AI Engineer",
    company: "MedForce AI",
    location: "London, UK · Remote",
    start: "Jun 2025",
    end: "Present",
    bullets: [
      "Leading the build of a clinical-automation platform for an NHS pilot — generative AI to streamline workflows, targeting 10x doctor efficiency.",
      "Fine-tuning domain-specific LLMs for hepatologists to automate medical reasoning and documentation.",
      "Tightening system design + model pipelines for fast, reliable real-time clinical use.",
    ],
  },
  {
    role: "AI Engineer",
    company: "Digital-Dandelion",
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
    location: "New York, USA · Remote",
    start: "Jul 2023",
    end: "Sep 2023",
    bullets: [
      "Led scraping ops to assemble a 46,000-article dataset for NLP analysis.",
      "Built Nepali-language models capturing local idioms, classifying news on women & marginalized groups.",
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
      "Applied supervised-learning algorithms to business analytics problems.",
    ],
  },
];
