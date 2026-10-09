import { content } from '../content/pages/unified-api-ingester';
import type { PageProps } from './contract';
import { ProjectPage } from './ProjectPage';

export default function IngesterPage(props: PageProps) {
  return <ProjectPage {...props} page="unified-api-ingester" content={content} />;
}
