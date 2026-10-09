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
  contribution: string;
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
  summary: string;
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
  /** Citation and contribution line only, beneath the write-up. */
  citations: readonly Citation[];
}

export interface ContactContent {
  email: string;
  availability: string;
  links: readonly ExternalLink[];
}
