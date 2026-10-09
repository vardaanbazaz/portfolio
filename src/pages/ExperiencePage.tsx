import { content } from '../content/pages/experience';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function ExperiencePage(props: PageProps) {
  return <PlaceholderPage {...props} page="experience" content={content} />;
}
