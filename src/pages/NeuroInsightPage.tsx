import { content } from '../content/pages/neuroinsight-ai';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function NeuroInsightPage(props: PageProps) {
  return <PlaceholderPage {...props} page="neuroinsight-ai" content={content} />;
}
