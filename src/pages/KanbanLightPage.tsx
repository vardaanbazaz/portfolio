import { content } from '../content/pages/kanbanlight';
import type { PageProps } from './contract';
import { PlaceholderPage } from './PlaceholderPage';

export default function KanbanLightPage(props: PageProps) {
  return <PlaceholderPage {...props} page="kanbanlight" content={content} />;
}
