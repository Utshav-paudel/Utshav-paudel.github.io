export type Skill = {
  name: string;
  /** Devicon path, e.g. 'python/python-original'. Renders as SVG. */
  devicon?: string;
};

export type SkillGroup = {
  category: string;
  items: Skill[];
};

export const skillGroups: SkillGroup[] = [
  {
    category: "Languages",
    items: [
      { name: "Python", devicon: "python/python-original" },
      { name: "TypeScript", devicon: "typescript/typescript-original" },
      { name: "SQL", devicon: "postgresql/postgresql-original" },
      { name: "C++", devicon: "cplusplus/cplusplus-original" },
    ],
  },
  {
    category: "AI & ML",
    items: [
      { name: "PyTorch", devicon: "pytorch/pytorch-original" },
      { name: "TensorFlow", devicon: "tensorflow/tensorflow-original" },
      { name: "Scikit-learn", devicon: "scikitlearn/scikitlearn-original" },
      { name: "Pandas", devicon: "pandas/pandas-original" },
      { name: "NumPy", devicon: "numpy/numpy-original" },
      { name: "LLMs" },
      { name: "RAG" },
      { name: "LangChain" },
      { name: "NLP" },
      { name: "Computer Vision" },
    ],
  },
  {
    category: "Backend & Infra",
    items: [
      { name: "FastAPI", devicon: "fastapi/fastapi-original" },
      { name: "Docker", devicon: "docker/docker-original" },
      { name: "Google Cloud", devicon: "googlecloud/googlecloud-original" },
      { name: "Git", devicon: "git/git-original" },
      { name: "MLOps" },
    ],
  },
];

export const education = {
  school: "Madan Bhandari Memorial College",
  schoolUrl: "https://mbmc.edu.np/",
  schoolDomain: "mbmc.edu.np",
  /** Optional override for the school logo. */
  logoUrl: "https://www.mbmc.edu.np/assets/site/img/mbmc.svg" as string | undefined,
  degree: "B.Sc. Computer Science & IT",
  location: "Kathmandu, Nepal",
  start: "Apr 2022",
  end: "Apr 2026",
};
