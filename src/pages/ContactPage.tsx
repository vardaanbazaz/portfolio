import { content } from '../content/pages/contact';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function ContactPage(props: PageProps) {
  return <PlaceholderPage {...props} page="contact" content={content} />;
}
