/** Stage 1 stand-in for a page's content. Replaced by a real type per page when content arrives. */
export interface PlaceholderContent {
  note: string;
}

export interface ExternalLink {
  label: string;
  href: string;
}

export interface AboutContent {
  education: {
    institution: string;
    degree: string;
    period: string;
    grade: string;
    coursework: readonly string[];
  };
  location: string;
  links: readonly ExternalLink[];
}

export interface Role {
  title: string;
  org: string;
  /** Place and work mode, for example "Hyderabad (Hybrid)" or "Remote". */
  where: string;
  period: string;
  points: readonly string[];
}

export interface ExperienceContent {
  /** Most recent first. */
  roles: readonly Role[];
  /** Line at the end of the page: work that is not a role. */
  also: string;
}

export interface Citation {
  title: string;
  venue: string;
  date: string;
  authors: readonly string[];
  authorRole: string;
  doi: string;
  xploreUrl: string;
  summary: string;
}

export interface PipelineStage {
  step: string;
  title: string;
  description: string;
}

export interface ResultRow {
  dataset: string;
  description: string;
  precision: string;
  recall: string;
  map50: string;
  map5095: string;
}

/** A paper with its full write-up on this site. */
export interface PaperWriteUp extends Citation {
  subtitle: string;
  pills: readonly string[];
  contribution: string;
  pipeline: readonly PipelineStage[];
  results: {
    formula: string;
    rows: readonly ResultRow[];
    training: string;
  };
  adr: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
  };
  bibtex: string;
}

export interface PublicationsContent {
  writeUp: PaperWriteUp;
  /** Citation and summary only. Shown in their panels, not on the page. */
  citations: readonly Citation[];
}

/** A bold term and the text after it, as in "Storage: IndexedDB via Dexie.js…". */
export interface TermItem {
  term: string;
  text: string;
}

/** An architecture decision record. */
export interface Adr {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
}

/** One piece of a project page section, shown in order. */
export type ProjectBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'terms'; items: readonly TermItem[] }
  | { kind: 'adr'; adr: Adr }
  | { kind: 'link'; link: ExternalLink };

/** A section of a project page, with its entry in the page's contents list. */
export interface ProjectSection {
  /** Heading id the contents list links to. Unique across the site. */
  id: string;
  /** Its text in the contents list, which can differ from its heading. */
  contentsLabel: string;
  heading: string;
  blocks: readonly ProjectBlock[];
}

/** A project page. Its status lives in `src/content/scene.ts`, which the Projects caption counts. */
export interface ProjectContent {
  subtitle: string;
  summary: string;
  source: ExternalLink;
  pills: readonly string[];
  sections: readonly ProjectSection[];
}

export interface ContactContent {
  email: string;
  availability: string;
  links: readonly ExternalLink[];
}
