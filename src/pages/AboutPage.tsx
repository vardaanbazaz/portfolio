import { content } from '../content/pages/about';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function AboutPage(props: PageProps) {
  return <PlaceholderPage {...props} page="about" content={content} />;
}
