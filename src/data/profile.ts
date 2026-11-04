// Everything the site says about you lives here. Edit this file to update the site.

export const profile = {
  name: "Jaya Pangihutan Situmorang",
  shortName: "Jaya Situmorang",
  initials: "JS",
  role: "Full-Stack & AI Engineer",
  location: "Medan, Indonesia",
  email: "jayasitumorang19@gmail.com",
  github: "jayasitumorang",
  summary:
    "I build web and mobile systems end to end: the screens people use, the services behind them, and the databases and cloud they run on. I've shipped for fintech, logistics, HR and enterprise teams, and lately I build AI agents and self-hosted AI tools that answer from a company's own data.",
  // Server-only. SITE_URL overrides; on Vercel the production address is detected automatically.
  siteUrl:
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
};

// GitHub repositories to leave out of the Projects section (exact repo names).
// Private repositories never appear. Add a description on GitHub to show one on the card.
export const hiddenRepos: string[] = [];

export type Role = {
  company: string;
  title: string;
  start: string; // "YYYY-MM"
  end: string | null; // null = current
  domain: string;
  summary: string;
  stack: string[];
  wins?: string[];
};

export const experience: Role[] = [
  {
    company: "PT. Wilmar Consultancy Services",
    title: "Full-Stack Engineer · TechDev AI",
    start: "2023-04",
    end: null,
    domain: "Enterprise AI",
    summary:
      "Design and build internal AI tools: live computer vision for worker safety, weighbridge checks and fruit bunch counting; an enterprise data agent in Copilot Studio grounded in SQL Server data; and self-hosted LLM tools on a vLLM and Ollama GPU server (RAG assistant, OCR document reader, vision training studio), shipped with Docker and CI pipelines.",
    stack: ["Python", "YOLO", "OpenCV", "Copilot Studio", "vLLM", "Ollama", "RAG", "SQL Server", "Docker", "Azure Pipelines"],
    wins: ["Promoted to a higher grade", "Took AI work from proof of concept to tools teams use"],
  },
  {
    company: "PT. Wilmar Consultancy Services",
    title: "Full-Stack Engineer · TechDev",
    start: "2023-04",
    end: null,
    domain: "Enterprise",
    summary:
      "Maintain and extend enterprise systems from user requirements: the Terminal Warehouse (TWMS) and Packaging Management (PMS) systems on Java Spring and RabbitMQ, and the HR System, e-Recruitment and Face Absence Management on ASP.NET. Built desktop and IoT apps and resolved VAPT security findings.",
    stack: [".NET", "Java Spring", "RabbitMQ", "SQL Server", "Next.js", "Kotlin", "AWS", "Azure DevOps"],
    wins: [
      "Closed Jira tickets ahead of target",
      "Upgraded systems from legacy stacks to new ones",
      "Shipped optimisations and new features quickly",
    ],
  },
  {
    company: "PT. Saba Semesta Perkasa",
    title: "Full-Stack Engineer",
    start: "2022-08",
    end: "2023-04",
    domain: "Logistics",
    summary:
      "Built a web and mobile logistics platform from scratch: real-time tracking, invoicing, master data and role-based access control. Contributed to product planning and kept it performing at production scale.",
    stack: ["Next.js", "React Native", "PostgreSQL", "GraphQL", "Figma"],
    wins: [
      "Delivered a new logistics system for PT Tunas Logistik Perkasa",
      "Tuned for scale, security and performance",
      "Well documented, so the next team can pick it up",
    ],
  },
  {
    company: "PT. Mega Harapan Mulia",
    title: "Full-Stack Engineer",
    start: "2022-01",
    end: "2022-05",
    domain: "EdTech",
    summary:
      "Developed key features for Kelas.com, Kelas.work and Kelas.Center, working with UI/UX and project teams to deliver scalable, user-focused products.",
    stack: ["Laravel", "AWS", "MySQL", "Figma", "Trello"],
    wins: ["Hit weekly development targets", "Refactored legacy code into modular, maintainable parts"],
  },
  {
    company: "PT. Finansial Integrasi Teknologi",
    title: "Full-Stack Engineer (Intern)",
    start: "2021-10",
    end: "2021-12",
    domain: "Fintech",
    summary:
      "Built a B2B loan and assurance transaction dashboard with clear data summaries for faster decisions, and contributed to planning and design.",
    stack: ["React", "Node.js", "PostgreSQL", "TypeScript"],
    wins: ["Hit weekly development targets", "Replaced manual paperwork with paperless flows"],
  },
  {
    company: "Desa Karang Bangun",
    title: "Full-Stack Engineer",
    start: "2020-07",
    end: "2020-10",
    domain: "GovTech",
    summary:
      "Delivered the village website end to end with the local government, from hosting setup and UI design to the platform itself.",
    stack: ["WordPress", "MySQL", "HTML", "CSS"],
  },
];

// AI systems built as internal tools at work. Described by what I built and how,
// with company names, internal systems, data and infrastructure left out on purpose.
export type AIProject = {
  title: string;
  pipeline: string; // shown as a one-line flow
  summary: string;
  did: string[];
  stack: string[];
  latest?: boolean; // featured full-width with a "Latest" badge
  live?: boolean; // runs on live camera feeds; shows a pulsing LIVE tag on the screenshot
  // Anonymised screenshot in public/ai: company names, addresses and file names cropped or blurred.
  image?: { src: string; width: number; height: number; alt: string };
};

// Newest first. The 3D walk shows the first three.
export const aiWork: AIProject[] = [
  {
    title: "Worker safety vision",
    pipeline: "CCTV → detection + pose → rope & helmet rules → live safety status",
    summary:
      "Watches a tanker unloading line in real time and checks that every worker on top of a truck wears a helmet and is clipped to a safety rope.",
    did: [
      "Detects trucks, workers, helmets, ropes and anchor blocks, and uses pose keypoints to tie each rope to the worker wearing it",
      "Rule engine marks every person safe or unsafe and drives a live status panel, for example \"SAFE: all workers roped\"",
      "Sleep timer idles the model between activity to save GPU time",
      "Runs live at about 7 fps per camera, with an online/offline camera monitor",
    ],
    stack: ["Python", "YOLO (Ultralytics)", "Pose estimation", "OpenCV", "IoT"],
    latest: true,
    live: true,
    image: { src: "/ai/safety.jpg", width: 934, height: 561, alt: "Live camera view with boxes on a truck, a worker, a helmet and a safety rope, and a status panel reading SAFE" },
  },
  {
    title: "Weighbridge AI monitor",
    pipeline: "4 cameras → ZeroMQ stream → detection → 6 weighing checks → dashboard",
    summary:
      "Checks every weighing automatically, so a truck is only weighed when the bridge is clear and the truck is stopped fully on the platform.",
    did: [
      "Streams several camera feeds over ZeroMQ into one live panel per weighbridge",
      "Six checks per weighing: crossing clearance, object clear, truck movement, stop position, bridge clear and truck in position",
      "Health bar for CPU, RAM, GPU, temperature and storage, with auto reset and one-click AI restart",
    ],
    stack: ["Python", "ZeroMQ", "Object detection", "OpenCV", "Web dashboard"],
    live: true,
    image: { src: "/ai/weighbridge.jpg", width: 680, height: 480, alt: "Two weighbridge camera panels, each listing six checks that all read True" },
  },
  {
    title: "Fruit bunch counter",
    pipeline: "harvest photos → cloud storage watcher → detection model → count + trend",
    summary:
      "Counts fresh fruit bunches in harvest photos as they arrive in cloud storage, replacing manual tallies with a live total.",
    did: [
      "Storage watcher picks up new photos from Azure Blob Storage and counts bunches automatically",
      "Custom-trained detection model reports a count and confidence for every photo, with count, label and mask views",
      "Daily total, monthly trend and model retraining cycle on one dashboard",
    ],
    stack: ["Python", "YOLO", "Azure Blob Storage", "OpenCV", "Dashboard"],
    image: { src: "/ai/ffb.jpg", width: 1400, height: 507, alt: "Counting dashboard with a large daily total, a live model preview and recent photos with counts" },
  },
  {
    title: "Enterprise data agent",
    pipeline: "question → Copilot agent (GPT-4.1) → SQL Server data → grounded answer",
    summary:
      "An AI agent for analysts, managers and business stakeholders that answers from the company's own systems and databases, so decisions rest on real data instead of guesses.",
    did: [
      "Built the agent in Microsoft Copilot Studio on GPT-4.1, with knowledge, tools and topics wired to internal data",
      "Python and SQL Server layer that gives the agent structured data to analyse",
      "Strict grounding rules: answers come only from internal data, with no outside knowledge or assumptions, and a clear message when data is missing",
      "Analyses the full dataset instead of samples, tuned for accuracy over speed",
      "Replies in the user's language, Indonesian or English",
    ],
    stack: ["Copilot Studio", "GPT-4.1", "Python", "SQL Server", "Prompt engineering"],
    image: { src: "/ai/copilot.jpg", width: 1010, height: 926, alt: "Copilot Studio agent settings with GPT-4.1 selected and grounding instructions" },
  },
  {
    title: "Private document assistant",
    pipeline: "docs → chunks → embeddings → search → local LLM → answer",
    summary:
      "A chatbot that answers questions from an organisation's own manuals and policies, running entirely on self-hosted models so documents never leave the network.",
    did: [
      "Built the retrieval pipeline (RAG): text extraction from PDF, Word, Excel, PowerPoint, CSV and more, chunking, embeddings and semantic search",
      "Admin panel to upload and remove documents, edit the bot's name, welcome message and system prompt, and review chat logs",
      "Embeddable chat widget so any internal web page can host the assistant",
      "Experimented with LoRA fine-tuning and documented when retrieval beats retraining",
      "Serves the models from a self-hosted GPU server with vLLM and Ollama",
    ],
    stack: ["Python", "FastAPI", "vLLM", "Ollama", "RAG", "Embeddings", "PostgreSQL", "Docker", "Nginx", "PyTorch", "PEFT / LoRA"],  },
  {
    title: "AI document reader",
    pipeline: "PDF / image → OCR → LLM + JSON schema → structured data",
    summary:
      "Turns PDFs and scanned documents into clean, structured data, from resumes into candidate profiles to free-form requests like summarise, extract or translate.",
    did: [
      "Hybrid OCR: native PDF text first, with automatic Tesseract fallback for scanned pages in the same file",
      "Schema-constrained LLM extraction with a cheap targeted retry when a key field comes back empty",
      "Benchmarked several local models for accuracy against speed, and chose consistency over raw speed",
      "Tuned the inference context size, which avoided a roughly 4x slowdown from the model spilling onto CPU",
      "Admin page to switch models without redeploying, and a feature template so new tools plug in quickly, shipped with Docker and CI pipelines",
    ],
    stack: ["Python", "FastAPI", "Ollama", "Tesseract OCR", "PyMuPDF", "PostgreSQL", "Docker", "Azure Pipelines"],
  },
  {
    title: "Computer vision training studio",
    pipeline: "camera → label → train → test → deploy",
    summary:
      "An end-to-end web studio for building object detection and segmentation models: label images, train, test against a live camera, and deploy.",
    did: [
      "React web UI for live camera view, labelling and model testing",
      "Python backend for project management, image processing, YOLO inference and contour masking",
      "AI-assisted auto-annotation with Segment Anything (SAM) to cut manual labelling time",
      "One-click run on Windows and auto-starting Linux service for server deployment",
    ],
    stack: ["Python", "FastAPI", "YOLO (Ultralytics)", "OpenCV", "SAM", "React", "Vite", "Linux / systemd"],
  },
];

// The four layers of a full-stack system, used by the hero diagram and the toolbox.
export const layers = [
  { id: "interface", label: "Interface", note: "web & mobile", items: ["React", "Next.js", "Vue.js", "React Native", "Angular", "TypeScript"] },
  { id: "services", label: "Services", note: "APIs & logic", items: ["Node.js", "Spring Boot", "ASP.NET", "Laravel", "Python", "Kotlin", "GraphQL"] },
  { id: "data", label: "Data", note: "SQL & NoSQL", items: ["PostgreSQL", "SQL Server", "MySQL", "NoSQL"] },
  { id: "cloud", label: "Cloud", note: "infra & delivery", items: ["AWS", "Azure", "GCP", "DevOps", "Git"] },
] as const;

export const practices = [
  {
    title: "Security testing",
    body: "Penetration testing with Kali Linux and Nmap, and fixing what VAPT finds in production systems.",
    tags: ["Kali Linux", "Nmap", "VAPT"],
  },
  {
    title: "QA automation",
    body: "Automated test suites so releases stay boring.",
    tags: ["Katalon Studio", "Automation"],
  },
  {
    title: "Applied AI",
    body: "AI agents grounded in company data, self-hosted LLMs, RAG, OCR pipelines and computer vision, wired into the apps teams already use.",
    tags: ["Copilot Studio", "Ollama", "RAG", "YOLO"],
  },
  {
    title: "IoT",
    body: "From thesis to work: sensors and devices feeding real applications.",
    tags: ["IoT", "Desktop apps"],
  },
];

export const education = {
  school: "Telkom University",
  place: "Bandung, West Java",
  degree: "Bachelor of Information Technology",
  start: "2018-08",
  end: "2022-08",
  gpa: "3.37",
  thesis: "The Use of IoT in the Ad Satiation Method to Improve the Effectiveness of Common Carp Cultivation",
};

export const speaking = [
  { event: "AWS User Group Medan Meetup", year: "2025", role: "Guest speaker" },
];

export const certifications = [
  { name: "AI Productivity and AI API Integration for Developers", issuer: "Hacktiv8", year: "2025" },
  { name: "Speaker Certificate, AWS User Group Medan Meetup", issuer: "AWS User Group Medan", year: "2025" },
  { name: "The Complete 2024 Web Development Bootcamp", issuer: null, year: "2021" },
  { name: "React - The Complete Guide 2024 (incl. Next.js, Redux)", issuer: null, year: "2021" },
  { name: "Certified Secure Computer User", issuer: null, year: "2021" },
  { name: "Problem Solving (Intermediate)", issuer: null, year: "2021" },
  { name: "SQL (Intermediate)", issuer: null, year: "2021" },
  { name: "TypeScript: The Complete Developer's Guide", issuer: null, year: null },
  { name: "Angular - The Complete Guide (2024 Edition)", issuer: null, year: null },
  { name: "Full Stack Java Developer", issuer: null, year: null },
];

export const languages = ["Indonesian", "English", "Batak"];
