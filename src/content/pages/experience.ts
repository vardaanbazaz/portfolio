import type { ExperienceContent } from '../types';

/** Copied word for word from the professional site's live text (`main`); each field cites its file and line there. */
export const content: ExperienceContent = {
  roles: [
    // src/data/manuscript_config.ts:532
    {
      title: 'Research and Development Intern',
      org: 'DRDO · Internship',
      where: 'Hyderabad (Hybrid)',
      period: 'Jan 2026 – Jun 2026',
      points: [
        'Built a C simulation framework for processing simulated time-series signals and telemetry data.',
        'Implemented an in-place double-precision Radix-2 FFT and spectral peak detection for chirp waveforms under noise.',
        'Modelled RS-422 serial framing and a command-response state machine.',
        'Used C11 atomics and multithreading for thread-safe state updates with minimal jitter.',
      ],
    },
    // src/data/manuscript_config.ts:527
    {
      title: 'Web/App Developer',
      org: 'AgryBin · Internship',
      where: 'Remote',
      period: 'May 2025 – Aug 2025',
      points: [
        'Handled all web and mobile development for an early-stage agritech startup as its sole developer, from requirements to delivery.',
        "Built the company's brand and product website.",
        'Built an Android app in Flutter with OTP login and modules for mandi prices, mandi requirements, news, transporter contacts and cold-storage contacts.',
      ],
    },
  ],
  // src/ui/pages/LaboratoryOverviewPage.tsx:143
  also: 'Also: built a results-review web app for a crop-imaging research collaboration between IIIT Naya Raipur and Mahyco (2024).',
};
