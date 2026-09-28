/**
 * Placeholder content for the Showreel home page.
 * Fed to the view via props so no string is hardcoded in a component.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface CatalistContent {
  url: string;
  lead: string;
  leadStrong: string;
  pillLabel?: string;
  pillTitle?: string;
  searchText?: string;
}

export interface PortfolioItem {
  year: string;
  client: string;
  title: string;
  discipline: string;
  video: string;
}

export interface ShowreelContent {
  brand: string;
  logo: string;
  nav: NavLink[];
  headerCta: { label: string; href: string };
  marquee: string[];
  hero: {
    lines: string[];
    templatesTitle: string;
    bottomBlock?: {
      leftText: string;
      rightText: string;
      avatars: string[];
    };
  };
  catalistDark: CatalistContent;
  catalistLight: CatalistContent;
  carouselCta: {
    button: string;
    href: string;
  };
  sphere: {
    headingTop: string;
    headingBottom: string[];
    body: string[];
    cardLabel: string;
    cardUrl: string;
    cardHeading: string;
  };
  portfolio: {
    items: PortfolioItem[];
  };
  cta: {
    heading: string;
    headingFaded: string;
    sub: string;
    button: string;
    href: string;
  };
}

const A = "/assets/showreel";

export const homeContent: ShowreelContent = {
  brand: "Metaskills Institute",
  logo: `${A}/star.svg`,
  nav: [
    { label: "Who We Are", href: "#who-we-are" },
    { label: "What We Do", href: "#what-we-do" },
    { label: "Programmes", href: "#programmes" },
    { label: "Track Record", href: "#track-record" },
    { label: "Contact", href: "#contact" },
  ],
  headerCta: { label: "Get Started", href: "#contact" },
  marquee: [
    "AI Training",
    "Cybersecurity",
    "Algorithmic Trading",
    "Enterprise AI",
    "ASEAN Reach",
  ],
  hero: {
    lines: ["Capability Building for", "ASEAN Enterprises"],
    templatesTitle: "The AI Institute for Asia",
    bottomBlock: {
      leftText: "Consulting-led AI training and transformation, customised to each organisation and every learner.",
      rightText: "From leadership alignment to production engineering, we build programmes that create measurable capability — not just attendance.",
      avatars: [
        "https://i.pravatar.cc/100?img=11",
        "https://i.pravatar.cc/100?img=12",
        "https://i.pravatar.cc/100?img=13",
        "https://i.pravatar.cc/100?img=14",
        "https://i.pravatar.cc/100?img=15",
      ],
    },
  },
  catalistDark: {
    url: "metaskills.sg",
    pillLabel: "AI Training & Transformation",
    pillTitle: "Enterprise AI Programmes",
    lead: "Build real capability with",
    leadStrong: "practitioner-led programmes",
  },
  catalistLight: {
    url: "metaskills.sg",
    searchText: "Assess your organisation’s AI readiness with AIRI",
    lead: "Measure where you are",
    leadStrong: "before you invest.",
  },
  carouselCta: {
    button: "Explore our programmes",
    href: "#programmes",
  },
  sphere: {
    headingTop: "Why",
    headingBottom: ["Metaskills", "Institute"],
    body: [
      "Metaskills Institute builds AI capability for enterprises, governments, and institutions across ASEAN. We design programmes around your reality — from leadership alignment to production engineering.",
      "Our faculty teach at SMU, ISCA, HKU SPACE, NUS and IMD. Our clients include MINDEF, Great Eastern, OCBC, AIA, IMDA, and AI Singapore.",
    ],
    cardLabel: "AIRI Diagnostic",
    cardUrl: "metaskills.sg",
    cardHeading: "Know where to invest before you train",
  },
  portfolio: {
    items: [
      {
        year: "2023",
        client: "MINDEF / SAF",
        title: "Three-tier AI Roadmap",
        discipline: "Defence · Leadership · Literacy",
        video: `${A}/portfolio-1.mp4`,
      },
      {
        year: "2024",
        client: "SMU Academy",
        title: "MBA Digital Transformation",
        discipline: "Academia · Curriculum Design",
        video: `${A}/portfolio-2.mp4`,
      },
      {
        year: "2024",
        client: "IMDA",
        title: "Vibe Coding Pilot",
        discipline: "Government · Whole-of-agency",
        video: `${A}/portfolio-3.mp4`,
      },
    ],
  },
  cta: {
    heading: "Ready when you are",
    headingFaded: "Let's build your AI capability",
    sub: "Tell us where AI should make a difference in your organisation, and we will design the programme, the roadmap, and the delivery around it.",
    button: "Start the conversation",
    href: "#contact",
  },
};
