import { content } from '../content/pages/datavista';
import type { PageProps } from './contract';
import { ProjectPage } from './ProjectPage';

export default function DataVistaPage(props: PageProps) {
  return <ProjectPage {...props} page="datavista" content={content} />;
}
