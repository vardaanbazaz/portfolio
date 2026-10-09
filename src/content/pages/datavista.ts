import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/datavista'; // :6

/**
 * Copied word for word from the professional site's live text (`main`), `src/pages/DataVistaEntry.jsx`;
 * each field cites its line there. The status is in `src/content/scene.ts`.
 */
export const content: ProjectContent = {
  subtitle: 'Browser-native BI platform', // :99
  // :102
  summary:
    'A business-intelligence app that runs in the browser: load a CSV or Excel file and build pivots, calculated fields and dashboards without a backend.',
  source: { label: 'View source code', href: SOURCE }, // :113, live label "[VIEW SOURCE CODE]"
  // :119
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
  // Contents labels :9-16; headings and text per section below.
  sections: [
    {
      id: 'datavista-abstract',
      contentsLabel: '1. Abstract',
      heading: '1. Abstract', // :130
      blocks: [
        // :133
        {
          kind: 'paragraph',
          text: 'DataVista is an offline-first, browser-native business intelligence (BI) and analytics platform. Load a CSV, TSV or XLSX file of up to 100 MB and build pivots, calculated fields and dashboards without a backend.',
        },
        // :136
        {
          kind: 'paragraph',
          text: 'It is built with React 18 and Vite, keeps app state in Zustand with local-storage persistence, and stores data in IndexedDB via Dexie.js. Tests run on Vitest (unit) and Playwright (E2E) in GitHub Actions.',
        },
      ],
    },
    {
      id: 'datavista-architecture',
      contentsLabel: '2. System Architecture',
      heading: '2. System Architecture', // :143
      blocks: [
        { kind: 'paragraph', text: 'DataVista has four main parts:' }, // :146
        // :149-152
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
      contentsLabel: '3. Formula Parser',
      heading: '3. Formula Parser', // :159
      blocks: [
        // :162
        {
          kind: 'paragraph',
          text: 'A recursive-descent parser evaluates Excel-style calculated fields and window functions: ROW_NUMBER, RANK, DENSE_RANK, rolling and moving averages, and cumulative sums.',
        },
      ],
    },
    {
      id: 'datavista-features',
      contentsLabel: '4. Features',
      heading: '4. Features', // :169
      blocks: [
        // :172-176
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
      contentsLabel: '5. AI Co-Pilot',
      heading: '5. AI Co-Pilot', // :183
      blocks: [
        // :186
        {
          kind: 'paragraph',
          text: 'Optional and bring-your-own-key (Gemini or OpenAI). Without a key, a local heuristic engine is used. The app discloses at the point of use that sample values are sent to the provider.',
        },
      ],
    },
    {
      id: 'datavista-adrs',
      // The live contents list and heading differ: "Architectural" at :14, "Architecture … (ADRs)" at :193.
      contentsLabel: '6. Architectural Decision Records',
      heading: '6. Architecture Decision Records (ADRs)',
      blocks: [
        // :199, :203, :206-208 (id shown live as "[ADR-001]")
        {
          kind: 'adr',
          adr: {
            id: 'ADR-001',
            title: 'Client-Side Formula Parsing',
            context: 'Calculated fields and window functions have to run in the browser, without a backend.',
            decision:
              'A recursive-descent parser for Excel-style calculated fields and window functions (ROW_NUMBER, RANK, DENSE_RANK; rolling, moving averages, cumulative sums).',
            consequences: 'Works fully offline; the optional AI Co-Pilot is the only exception (see AI Co-Pilot).',
          },
        },
        // :215, :219, :222-224 (id shown live as "[ADR-002]")
        {
          kind: 'adr',
          adr: {
            id: 'ADR-002',
            title: 'IndexedDB via Dexie.js for Local Persistence',
            context: 'Uploaded CSV, TSV or XLSX files of up to 100 MB have to persist in the browser.',
            decision: 'Store datasets in IndexedDB via Dexie.js; keep app state in Zustand with local-storage persistence.',
            consequences: 'No backend is needed to store data.',
          },
        },
      ],
    },
    {
      id: 'datavista-audits',
      contentsLabel: '7. Audits and Fixes',
      heading: '7. Audits and Fixes', // :232
      blocks: [
        // :235
        {
          kind: 'paragraph',
          text: 'Five audits (correctness, type-inference gaps, shell completeness, product relevance, and a cross-cutting review). The critical and high findings of the correctness audit are fixed. A regression pass found and fixed a crash when creating dashboards, and live testing of the AI path caught two bugs: a retired model name and charts using the wrong aggregation.',
        },
        // :238, :243, live label "[READ THE AUDIT REPORTS]"
        { kind: 'link', link: { label: 'Read the audit reports', href: 'https://github.com/vardaanbazaz/datavista/tree/main/docs' } },
      ],
    },
    {
      id: 'datavista-limitations',
      contentsLabel: '8. Limitations',
      heading: '8. Limitations', // :250
      blocks: [
        // :253
        {
          kind: 'paragraph',
          text: 'No live demo is linked yet. The redesign is dark-mode first; light mode was not redesigned. Only the Gemini path has been tested against a live key.',
        },
      ],
    },
  ],
};
