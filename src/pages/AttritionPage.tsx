import { content } from '../content/pages/attrition';
import type { PageProps } from './contract';
import { ProjectPage } from './ProjectPage';

export default function AttritionPage(props: PageProps) {
  return <ProjectPage {...props} page="attrition" content={content} />;
}
