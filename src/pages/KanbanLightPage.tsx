import { content } from '../content/pages/kanbanlight';
import type { PageProps } from './contract';
import { ProjectPage } from './ProjectPage';

export default function KanbanLightPage(props: PageProps) {
  return <ProjectPage {...props} page="kanbanlight" content={content} />;
}
