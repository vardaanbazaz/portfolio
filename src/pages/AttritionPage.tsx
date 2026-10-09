import { content } from '../content/pages/attrition';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function AttritionPage(props: PageProps) {
  return <PlaceholderPage {...props} page="attrition" content={content} />;
}
