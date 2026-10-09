import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/datavista';

/** The status is in `src/content/scene.ts`. */
export const content: ProjectContent = {
  subtitle: 'Browser-native BI platform',
  summary:
    'A business-intelligence app that runs in the browser: load a CSV or Excel file and build pivots, calculated fields and dashboards without a backend.',
  source: { label: 'View source code', href: SOURCE },
  pills: [
    'React 18',
    'Vite',
    'TypeScript',
    'Tailwind CSS',
    'Zustand',
    'Dexie.js',
    'IndexedDB',
    'Recursive-descent parser',
    'TanStack Virtual',
    'D3',
    'Vitest',
    'Playwright',
    'GitHub Actions',
  ],
  sections: [
    {
      id: 'datavista-overview',
      contentsLabel: 'Overview',
      heading: 'Overview',
      blocks: [
        {
          kind: 'paragraph',
          text: 'DataVista is an offline-first, browser-native business intelligence (BI) and analytics platform. Load a CSV, TSV or XLSX file of up to 100 MB and build pivots, calculated fields and dashboards without a backend.',
        },
        {
          kind: 'paragraph',
          text: 'It is built with React 18 and Vite, keeps app state in Zustand with local-storage persistence, and stores data in IndexedDB via Dexie.js. Tests run on Vitest (unit) and Playwright (E2E) in GitHub Actions.',
        },
      ],
    },
    {
      id: 'datavista-how-its-built',
      contentsLabel: "How it's built",
      heading: "How it's built",
      blocks: [
        { kind: 'paragraph', text: 'DataVista has four main parts:' },
        {
          kind: 'terms',
          items: [
            {
              term: 'Formula parser:',
              text: 'Recursive-descent parser for Excel-style calculated fields and window functions.',
            },
            { term: 'Unified Query & Pivot Engine:', text: 'Rows, columns and values.' },
            {
              term: 'Storage:',
              text: 'IndexedDB via Dexie.js for datasets; Zustand with local-storage persistence for app state.',
            },
            { term: 'Data table:', text: 'Rendered with TanStack Virtual.' },
          ],
        },
      ],
    },
    {
      id: 'datavista-formula-parser',
      contentsLabel: 'Formula Parser',
      heading: 'Formula Parser',
      blocks: [
        {
          kind: 'paragraph',
          text: 'A recursive-descent parser evaluates Excel-style calculated fields and window functions: ROW_NUMBER, RANK, DENSE_RANK, rolling and moving averages, and cumulative sums.',
        },
      ],
    },
    {
      id: 'datavista-features',
      contentsLabel: 'Features',
      heading: 'Features',
      blocks: [
        {
          kind: 'terms',
          items: [
            { term: 'Data explorer:', text: 'Inspect records, with filters.' },
            { term: 'Statistics:', text: 'Descriptive statistics, correlation matrices and outlier detection.' },
            { term: 'Charts:', text: 'Interactive charts.' },
            {
              term: 'Dashboards:',
              text: 'Arrange charts into dashboards, save them as templates, and capture snapshots.',
            },
            { term: 'Export:', text: 'Charts as PNG or SVG, and reports as PDF.' },
          ],
        },
      ],
    },
    {
      id: 'datavista-ai-copilot',
      contentsLabel: 'AI Co-Pilot',
      heading: 'AI Co-Pilot',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Optional and bring-your-own-key (Gemini or OpenAI). Without a key, a local heuristic engine is used. The app discloses at the point of use that sample values are sent to the provider.',
        },
      ],
    },
    {
      id: 'datavista-design-decisions',
      contentsLabel: 'Design decisions',
      heading: 'Design decisions',
      blocks: [
        {
          kind: 'decision',
          decision: {
            title: 'Client-Side Formula Parsing',
            problem: 'Calculated fields and window functions have to run in the browser, without a backend.',
            decision:
              'A recursive-descent parser for Excel-style calculated fields and window functions (ROW_NUMBER, RANK, DENSE_RANK; rolling, moving averages, cumulative sums).',
            result: 'Works fully offline; the optional AI Co-Pilot is the only exception (see AI Co-Pilot).',
          },
        },
        {
          kind: 'decision',
          decision: {
            title: 'IndexedDB via Dexie.js for Local Persistence',
            problem: 'Uploaded CSV, TSV or XLSX files of up to 100 MB have to persist in the browser.',
            decision: 'Store datasets in IndexedDB via Dexie.js; keep app state in Zustand with local-storage persistence.',
            result: 'No backend is needed to store data.',
          },
        },
      ],
    },
    {
      id: 'datavista-audits',
      contentsLabel: 'Audits and Fixes',
      heading: 'Audits and Fixes',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Five audits (correctness, type-inference gaps, shell completeness, product relevance, and a cross-cutting review). The critical and high findings of the correctness audit are fixed. A regression pass found and fixed a crash when creating dashboards, and live testing of the AI path caught two bugs: a retired model name and charts using the wrong aggregation.',
        },
        { kind: 'link', link: { label: 'Read the audit reports', href: 'https://github.com/vardaanbazaz/datavista/tree/main/docs' } },
      ],
    },
    {
      id: 'datavista-limitations',
      contentsLabel: 'Limitations',
      heading: 'Limitations',
      blocks: [
        {
          kind: 'paragraph',
          text: 'No live demo is linked yet. The redesign is dark-mode first; light mode was not redesigned. Only the Gemini path has been tested against a live key.',
        },
      ],
    },
  ],
};
