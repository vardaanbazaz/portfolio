import { content } from '../content/pages/unified-api-ingester';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function IngesterPage(props: PageProps) {
  return <PlaceholderPage {...props} page="unified-api-ingester" content={content} />;
}
