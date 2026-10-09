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
  /** Muted line at the end of the page: work that is not a role. */
  also: string;
}

export interface ContactContent {
  email: string;
  availability: string;
  links: readonly ExternalLink[];
}
