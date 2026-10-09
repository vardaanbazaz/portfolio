import { content } from '../content/pages/publications';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function PublicationsPage(props: PageProps) {
  return <PlaceholderPage {...props} page="publications" content={content} />;
}
