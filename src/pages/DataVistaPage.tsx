import { content } from '../content/pages/datavista';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function DataVistaPage(props: PageProps) {
  return <PlaceholderPage {...props} page="datavista" content={content} />;
}
