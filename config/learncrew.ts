import type { SkuCode } from "@/lib/catalogue";

// Links back to the parent brand (learncrew.org). This store is downstream of the coaching
// site and used to be a dead end — one footer line out. These are the way back.
//
// EVERY URL BELOW WAS VERIFIED TO RETURN 200. Never add one from memory: a 404 in the header
// or in a per-set card is worse than no link at all. The rule that governs config/elearning.ts
// applies here too — a missing destination hides the row, it never renders a dead link.
export const LEARNCREW = "https://learncrew.org";

export const LC = {
  coachingPgcet: `${LEARNCREW}/pgcet-online-coaching-mba-mca/`,
  coachingMat: `${LEARNCREW}/mat-online-coaching-600plus/`,
  results: `${LEARNCREW}/results/`,
  blog: `${LEARNCREW}/blog/`,
  tools: `${LEARNCREW}/tools/`,
  toolStudyPlan: `${LEARNCREW}/tools/cat-mat-study-plan-generator/`,
  toolPercentile: `${LEARNCREW}/tools/cat-percentile-target-calculator/`,
  toolExamDates: `${LEARNCREW}/tools/mba-exam-dates-2026/`,
} as const;

export interface NavLink {
  href: string;
  label: string;
  /** Only for internal links that must not pass authority (e.g. /track). */
  rel?: string;
}

/** Header cross-site row — the three highest-intent destinations on the parent site. */
export const HEADER_LINKS: NavLink[] = [
  { href: LC.coachingPgcet, label: "Coaching" },
  { href: LC.tools, label: "Free Tools" },
  { href: LC.blog, label: "Blog" },
];

export const FOOTER_PROGRAMS: NavLink[] = [
  { href: LC.coachingPgcet, label: "PGCET coaching" },
  { href: LC.coachingMat, label: "MAT coaching" },
  { href: LC.results, label: "Results" },
  { href: LC.blog, label: "Blog" },
];

export const FOOTER_TOOLS: NavLink[] = [
  { href: LC.tools, label: "All free tools" },
  { href: LC.toolStudyPlan, label: "Study-plan generator" },
  { href: LC.toolPercentile, label: "Percentile target" },
  { href: LC.toolExamDates, label: "Exam dates 2026" },
];

export const FOOTER_STORE: NavLink[] = [
  { href: "/", label: "Catalogue" },
  { href: "/track", label: "Track order", rel: "nofollow" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

/**
 * Per-set cross-link card ("Preparing for X?"), shown below the digital upsell on a product
 * page. Help, not upsell: the buyer already has the book set in hand, this points at the
 * coaching / free tool that actually answers "what now?".
 *
 * A SKU with no entry renders NOTHING. There is deliberately no CLAT coaching entry — that
 * product does not exist, so CLAT gets the blog instead of an invented landing page.
 */
export interface CrossLink {
  heading: string;
  blurb: string;
  links: NavLink[];
}

export const CROSSLINKS: Partial<Record<SkuCode, CrossLink>> = {
  PGCET_MBA: {
    heading: "Preparing for PGCET?",
    blurb:
      "Learn Crew runs live online PGCET coaching for MBA and MCA, plus free tools for exam dates, eligibility and study planning. Both are on our main site — nothing extra to buy here.",
    links: [
      { href: LC.coachingPgcet, label: "PGCET online coaching" },
      { href: LC.tools, label: "Free exam tools" },
    ],
  },
  PGCET_MCA: {
    heading: "Preparing for PGCET?",
    blurb:
      "Learn Crew runs live online PGCET coaching for MBA and MCA, plus free tools for exam dates, eligibility and study planning. Both are on our main site — nothing extra to buy here.",
    links: [
      { href: LC.coachingPgcet, label: "PGCET online coaching" },
      { href: LC.tools, label: "Free exam tools" },
    ],
  },
  MAT: {
    heading: "Preparing for MAT?",
    blurb:
      "Live online MAT coaching and a free study-plan generator that lays out your weeks up to the exam. Both live on learncrew.org.",
    links: [
      { href: LC.coachingMat, label: "MAT online coaching" },
      { href: LC.toolStudyPlan, label: "Free study-plan generator" },
    ],
  },
  CAT: {
    heading: "Preparing for CAT?",
    blurb:
      "Work out the percentile you actually need for your target schools, and build a week-by-week plan around it. Free, no sign-up.",
    links: [
      { href: LC.toolPercentile, label: "Percentile target calculator" },
      { href: LC.tools, label: "All free exam tools" },
    ],
  },
  CLAT: {
    heading: "Preparing for CLAT?",
    blurb:
      "We don't run CLAT coaching — the books are the whole offer. The Learn Crew blog covers entrance-exam strategy, timetables and exam-day notes.",
    links: [{ href: LC.blog, label: "Learn Crew blog" }],
  },
};
