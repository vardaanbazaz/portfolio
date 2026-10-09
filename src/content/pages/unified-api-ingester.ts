import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/unified-api-ingester';

/** The status is in `src/content/scene.ts`. No live demo: the repo is the only link. */
export const content: ProjectContent = {
  subtitle: 'REST-to-lakehouse ingestion pipeline',
  summary:
    'A Python pipeline that pulls from a REST API (OpenBreweryDB) with retries and exponential backoff, then writes to DuckDB with idempotent upserts and to a Hive-partitioned Parquet data lake. Work in progress.',
  source: { label: 'View source code', href: SOURCE },
  pills: [
    'Python 3.10+',
    'DuckDB',
    'Apache Parquet',
    'Hive Partitioning',
    'Pandas',
    'PyArrow',
    'Exponential Backoff',
    'YAML Config',
    'GitHub Actions',
  ],
  figures: [
    { label: 'Tests:', value: 'Unit-tested, CI on GitHub Actions' },
    { label: 'Persistence Engine:', value: 'DuckDB + Parquet Lake' },
    { label: 'Partitioning Scheme:', value: 'Hive-style UTC date partitions' },
  ],
  sections: [
    {
      id: 'ingester-overview',
      contentsLabel: 'Overview',
      heading: 'Overview',
      blocks: [
        { kind: 'paragraph', text: 'A Python pipeline that pulls from a REST API and writes to two sinks.' },
        { kind: 'paragraph', text: 'Work in progress; details may change.' },
      ],
    },
    {
      id: 'ingester-how-its-built',
      contentsLabel: "How it's built",
      heading: "How it's built",
      blocks: [
        {
          kind: 'terms',
          items: [
            { term: 'Source:', text: 'OpenBreweryDB REST API.' },
            { term: 'Retries:', text: 'configurable exponential backoff on transient 4xx/5xx errors.' },
            { term: 'DuckDB sink:', text: 'idempotent upserts with ON CONFLICT (id) DO UPDATE.' },
            { term: 'Parquet sink:', text: 'data lake with Hive-style UTC date partitions.' },
            { term: 'Config:', text: 'config/config.yaml, with CLI overrides.' },
            { term: 'Runtime:', text: 'Python 3.10+.' },
            { term: 'Tests:', text: 'unit-tested, CI on GitHub Actions.' },
          ],
        },
      ],
    },
  ],
};
