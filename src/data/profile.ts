// Everything the site says about you lives here. Edit this file to update the site.

export const profile = {
  name: "Jaya Pangihutan Situmorang",
  shortName: "Jaya Situmorang",
  initials: "JS",
  role: "Full-Stack Engineer",
  location: "Medan, Indonesia",
  email: "jayasitumorang19@gmail.com",
  github: "jayasitumorang",
  summary:
    "I build web and mobile systems end to end: the screens people use, the services behind them, and the databases and cloud they run on. I've shipped for fintech, logistics, HR and enterprise teams, with a steady focus on performance, security and clean system design.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://jayasitumorang.vercel.app",
};

export type Role = {
  company: string;
  title: string;
  start: string; // "YYYY-MM"
  end: string | null; // null = current
  domain: string;
  summary: string;
  stack: string[];
};

export const experience: Role[] = [
  {
    company: "PT. Wilmar Consultancy Services",
    title: "Full-Stack Engineer",
    start: "2023-04",
    end: null,
    domain: "Enterprise",
    summary:
      "Maintain and extend the TWMS, PMS and HR systems from user requirements. Built additional desktop, IoT and internal applications, contributed to AI proof-of-concept work, and resolved VAPT security findings.",
    stack: [".NET", "Java Spring", "Next.js", "Python", "Kotlin", "AWS", "SQL Server", "JIRA"],
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
  },
  {
    company: "PT. Finansial Integrasi Teknologi",
    title: "Full-Stack Engineer (Intern)",
    start: "2021-10",
    end: "2021-12",
    domain: "Fintech",
    summary:
      "Built a B2B loan and assurance transaction dashboard with clear data summaries for faster decisions, and contributed to planning and design.",
    stack: ["React", "Node.js", "PostgreSQL"],
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
    title: "AI integration",
    body: "AI proofs of concept and API integration inside existing enterprise apps.",
    tags: ["AI PoC", "LLM APIs"],
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
  { name: "React - The Complete Guide (incl. Next.js, Redux)", issuer: null, year: "2021" },
  { name: "Certified Secure Computer User", issuer: null, year: "2021" },
  { name: "Problem Solving (Intermediate)", issuer: null, year: "2021" },
  { name: "SQL (Intermediate)", issuer: null, year: "2021" },
  { name: "TypeScript: The Complete Developer's Guide", issuer: null, year: null },
  { name: "Angular - The Complete Guide", issuer: null, year: null },
  { name: "Full Stack Java Developer", issuer: null, year: null },
];

export const languages = ["Indonesian", "English", "Batak"];
