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

export interface ContactContent {
  email: string;
  availability: string;
  links: readonly ExternalLink[];
}
