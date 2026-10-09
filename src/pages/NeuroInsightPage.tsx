import { content } from '../content/pages/neuroinsight-ai';
import type { PageProps } from './contract';
import { ProjectPage } from './ProjectPage';

export default function NeuroInsightPage(props: PageProps) {
  return <ProjectPage {...props} page="neuroinsight-ai" content={content} />;
}
