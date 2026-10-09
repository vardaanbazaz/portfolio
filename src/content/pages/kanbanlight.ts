import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/kanbanlight';
const DEMO = 'https://kanbanlight.vercel.app';

/** The status is in `src/content/scene.ts`. */
export const content: ProjectContent = {
  subtitle: 'Git-style Kanban board · v0.0.1 (early build)',
  summary:
    'A browser-based Kanban board that borrows ideas from Git: branch a board, switch between branches, and compare them in a visual diff. Work in progress.',
  source: { label: 'View source code', href: SOURCE },
  demo: { label: 'Live demo · early build', href: DEMO },
  pills: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'IndexedDB (idb)', 'Node.js', 'Commander.js', 'WebSocket (ws)'],
  sections: [
    {
      id: 'kanbanlight-branches',
      contentsLabel: 'Branches',
      heading: 'Branches',
      blocks: [{ kind: 'paragraph', text: 'Branch a board and switch between branches.' }],
    },
    {
      id: 'kanbanlight-visual-diff',
      contentsLabel: 'Visual Diff',
      heading: 'Visual Diff',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Compare the active branch with another branch; cards are marked as added, modified or deleted.',
        },
      ],
    },
    {
      id: 'kanbanlight-local-first',
      contentsLabel: 'Local-first',
      heading: 'Local-first',
      blocks: [{ kind: 'paragraph', text: 'All data stays in the browser (IndexedDB via idb); no backend, no accounts.' }],
    },
    {
      id: 'kanbanlight-cli',
      contentsLabel: 'kb CLI',
      heading: 'kb CLI',
      blocks: [
        {
          kind: 'paragraph',
          text: 'A Node.js CLI (Commander.js) controls the open board over a local WebSocket bridge (ws).',
        },
      ],
    },
  ],
};
