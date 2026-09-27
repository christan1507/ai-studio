/**
 * Placeholder content for the Showreel home page ("Prompts that think ahead").
 * Mirrors the copy of the original vanilla showreel. Fed to the view via props
 * so no string is hardcoded in a component.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface CatalistContent {
  url: string;
  /** Headline / subhead split into plain + emphasised (bold) runs. */
  lead: string;
  leadStrong: string;
  /** Dark card: pill label + title. Light card: search query text. */
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
  /** Black CTA pinned to the right of the header bar. */
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
  /** CTA pinned under the 4-card carousel (the second block). */
  carouselCta: {
    button: string;
    href: string;
  };
  sphere: {
    headingTop: string;
    headingBottom: string[];
    /** Supporting paragraphs shown in the open sphere scene. */
    body: string[];
    /** Carousel-face chrome (slot-4 card preview). */
    cardLabel: string;
    cardUrl: string;
    cardHeading: string;
  };
  portfolio: {
    items: PortfolioItem[];
  };
  cta: {
    heading: string;
    /** Second heading line, rendered semi-transparent (like the hero subtitle). */
    headingFaded: string;
    sub: string;
    button: string;
    href: string;
  };
}

const A = "/assets/showreel";

export const homeContent: ShowreelContent = {
  brand: "Superconscious",
  logo: `${A}/star.svg`,
  nav: [
    { label: "Wearable", href: "#wearable" },
    { label: "Neural", href: "#neural" },
    { label: "Programs", href: "#programs" },
    { label: "Updates", href: "#updates" },
    { label: "Search", href: "#search" },
  ],
  headerCta: { label: "Get Started", href: "#get-started" },
  marquee: [
    "Templates that work",
    "Design that sells",
    "Speed without compromise",
    "AI prompts on another level",
  ],
  hero: {
    lines: ["Prompts that", "think ahead"],
    templatesTitle: "Browse our\ntemplates",
    bottomBlock: {
      leftText: "Turn engagement into conversions, trends into traffic, and views into revenue. All with a team that knows how to make social media work for you.",
      rightText: "From crafting scroll-stopping content to engineering algorithms we help your brand break through the noise and go viral.",
      avatars: [
        "https://i.pravatar.cc/100?img=1",
        "https://i.pravatar.cc/100?img=2",
        "https://i.pravatar.cc/100?img=3",
        "https://i.pravatar.cc/100?img=4",
        "https://i.pravatar.cc/100?img=5",
      ]
    }
  },
  catalistDark: {
    url: "Catalist.co.uk",
    pillLabel: "Catalist Lendings",
    pillTitle: "Apply for Loan",
    lead: "The Ultimate Engine for ",
    leadStrong: "Business Lending",
  },
  catalistLight: {
    url: "Catalist.co.uk",
    searchText: "Analyze impact of lending in Business [Field]",
    lead: "Use AI-based system analyser — ",
    leadStrong: "all through one intelligent platform.",
  },
  carouselCta: {
    button: "Explore the collection",
    href: "#templates",
  },
  sphere: {
    headingTop: "Beyond",
    headingBottom: ["all", "limits"],
    body: [
      "Superconscious is a neural engine that turns intent into action — anticipating your next move before you make it, across every device you already own.",
      "One model, every surface: wearable, neural, and beyond. No ceilings, no limits — just intelligence that keeps pace with the way you think.",
    ],
    cardLabel: "Neural Core",
    cardUrl: "superconscious.ai",
    cardHeading: "Intelligence, beyond limits",
  },
  portfolio: {
    items: [
      {
        year: "2023",
        client: "logan cee",
        title: "Archin",
        discipline: "Architecture Design · Website",
        video: `${A}/portfolio-1.mp4`,
      },
      {
        year: "2024",
        client: "zumar",
        title: "Zumar",
        discipline: "Web Design & Development",
        video: `${A}/portfolio-2.mp4`,
      },
      {
        year: "2024",
        client: "nova",
        title: "Nova",
        discipline: "Brand · Motion · Web",
        video: `${A}/portfolio-3.mp4`,
      },
    ],
  },
  cta: {
    heading: "Build beyond",
    headingFaded: "all limits",
    sub: "Templates, prompts, and tools that think ahead — start shipping faster today.",
    button: "Get started",
    href: "#get-started",
  },
};
