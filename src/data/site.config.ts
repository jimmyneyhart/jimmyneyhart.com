// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for content + curation.
// Edit THIS file to change what shows on the site — no component edits needed.
// Live GitHub data (commit counts, dates, languages) is merged in at build
// time by src/lib/github.ts; curated entries below override / supplement it.
// ─────────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'LIVE'
  | 'IN PROGRESS'
  | 'OPEN SOURCE'
  | 'REDACTED'
  | 'ARCHIVED';

export type ProjectSource = 'personal' | 'studio';

export interface FeaturedProject {
  /** Stable id. If `repo` is set, live GitHub data binds to this card. */
  id: string;
  /** "owner/name" to bind live GitHub metadata. Omit for private/external work. */
  repo?: string;
  title: string;
  blurb: string;
  status: ProjectStatus;
  /** External destination (live app, repo, case study). */
  url?: string;
  tags: string[];
  source: ProjectSource;
}

export interface SiteConfig {
  profile: {
    name: string;
    role: string;
    location: string;
    /** One real sentence of voice — not marketing filler. */
    statement: string;
    email: string;
    socials: { label: string; href: string }[];
  };
  sources: {
    /** GitHub user login for personal work. */
    user: string;
    /** GitHub org login for the studio. */
    org: string;
  };
  studio: {
    name: string;
    url: string;
    headline: string;
    manifesto: string[];
    /** Jimmy's relationship to the studio. */
    role: string;
  };
  /** Curated projects, in display order. Live data merges onto matching repos. */
  featured: FeaturedProject[];
  /** Repo full-names ("owner/name") to never auto-list (infra / self). */
  denylist: string[];
  /** Design tokens surfaced for quick iteration. */
  theme: {
    paper: string;
    ink: string;
    accent: string;
  };
}

export const site: SiteConfig = {
  profile: {
    name: 'Jimmy Neyhart',
    role: 'Builder · Systems thinker',
    location: 'Tennessee',
    statement:
      'I build software a single person can ship that ends up touching thousands of people. Mobile-first, systems-deep, written in code — not slide decks.',
    email: 'hello@jimmyneyhart.com',
    socials: [
      { label: 'GitHub', href: 'https://github.com/jimmyneyhart' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jimmyneyhart' },
      { label: 'Twitter', href: 'https://twitter.com/jimmyneyhart' },
    ],
  },

  sources: {
    user: 'jimmyneyhart',
    org: 'brilliant-disruptions',
  },

  studio: {
    name: 'Brilliant Disruptions',
    url: 'https://brilliantdisruptions.com',
    headline: "We build the software the world doesn't know it needs yet.",
    manifesto: [
      "We don't move fast and break things. We break limits.",
      'AI-first software studio — enterprise and fintech.',
    ],
    role: 'Founder & builder',
  },

  featured: [
    {
      id: 'canvasroute',
      title: 'CanvasRoute',
      blurb:
        'Mobile-first field-sales tool for door-to-door teams — routing, territory, and live pipeline. React Native + Supabase, shipping now.',
      status: 'IN PROGRESS',
      tags: ['React Native', 'Expo', 'Supabase', 'TanStack Query', 'Zustand'],
      source: 'personal',
    },
    {
      id: 'btc-calculator',
      title: 'Bitcoin Early-Retirement Calculator',
      blurb:
        'Interactive financial model: DCA, power-law price projections, a tax-optimized withdrawal schedule and a generated PDF report. Built in vanilla JS — canvas charting, jsPDF, live CoinGecko price.',
      status: 'LIVE',
      url: '/bitcoin-calculator.html',
      tags: ['Vanilla JS', 'Canvas', 'jsPDF', 'CoinGecko'],
      source: 'personal',
    },
    {
      id: 'tokenwatch',
      repo: 'brilliant-disruptions/tokenwatch',
      title: 'TokenWatch',
      blurb:
        'Real-time Claude usage monitoring for teams — see token spend as it happens. Chrome extension.',
      status: 'LIVE',
      url: 'https://brilliantdisruptions.com/projects/tokenwatch/',
      tags: ['TypeScript', 'AI'],
      source: 'studio',
    },
    {
      id: 'jarvis',
      title: 'JARVIS',
      blurb:
        'Autonomous command & control center orchestrating 12 AI agents, with human approval gates.',
      status: 'IN PROGRESS',
      url: 'https://brilliantdisruptions.com/projects/jarvis/',
      tags: ['Agents', 'Orchestration', 'AI'],
      source: 'studio',
    },
    {
      id: 'redacted-1',
      title: '████████████',
      blurb: 'Classified operation — in development at the studio.',
      status: 'REDACTED',
      tags: ['████', '████'],
      source: 'studio',
    },
    {
      id: 'portfolio',
      repo: 'jimmyneyhart/portfolio',
      title: 'Data Portfolio',
      blurb:
        'A sampling of projects, capabilities and use cases — Jupyter notebooks and applied data analysis.',
      status: 'OPEN SOURCE',
      tags: ['Python', 'Jupyter', 'Data'],
      source: 'personal',
    },
  ],

  // Infra + self repos that should never auto-list.
  denylist: [
    'jimmyneyhart/jimmyneyhart.com',
    'brilliant-disruptions/.github',
    'brilliant-disruptions/brilliant-disruptions.github.io',
  ],

  theme: {
    paper: '#F2F0EA',
    ink: '#0B0B0B',
    accent: '#FF4A1C',
  },
};
