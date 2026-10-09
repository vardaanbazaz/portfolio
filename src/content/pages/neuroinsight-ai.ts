import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/neuroinsight-ai'; // :6

/**
 * Copied word for word from the professional site's live text (`main`), `src/pages/NeuroInsightEntry.jsx`;
 * each field cites its line there. The subtitle is the exception. The status is in `src/content/scene.ts`.
 */
export const content: ProjectContent = {
  subtitle: 'Voice-classification research', // decision; the live subtitle at :98 is not used
  // :101
  summary:
    "Parkinson's voice-classification research, with an independently derived index (VIC) and subject-grouped evaluation. A research project, not a clinical tool.",
  source: { label: 'View source code', href: SOURCE }, // :112, live label "[VIEW SOURCE CODE]"
  // :118
  pills: ['Python', 'Pandas', 'scikit-learn', 'XGBoost', 'Notebooks', 'VIC index', 'Subject-grouped CV'],
  // :75-76, the live contents sidebar
  figures: [
    { label: 'Accuracy:', value: '0.796 ± 0.098' },
    { label: 'Baseline:', value: '0.756 ± 0.067' },
  ],
  // Contents labels :9-14; headings and text per section below.
  sections: [
    {
      id: 'neuroinsight-abstract',
      contentsLabel: '1. Abstract & Scope',
      heading: '1. Abstract & Scope', // :129
      blocks: [
        // :132
        {
          kind: 'paragraph',
          text: "Parkinson's voice-classification research, with an independently derived index (VIC) and subject-grouped evaluation. This is a research project; it is not designed, certified, or intended for clinical medical diagnosis.",
        },
        // :135, the starting-repo credit (plain text live, not a link)
        {
          kind: 'paragraph',
          text: 'Started from an earlier fPI analyser (github.com/bhanmrinal/fPI-Parkison-Analyser-using-Acoustic-Sound-Features) and rebuilt with the VIC index and subject-grouped cross-validation; external validation was attempted but is inconclusive (see Limitations).',
        },
      ],
    },
    {
      id: 'neuroinsight-dataset',
      contentsLabel: '2. Dataset',
      heading: '2. Dataset', // :142
      blocks: [
        // :145
        {
          kind: 'paragraph',
          text: "UCI Oxford Parkinson's Disease Detection Dataset (Little et al.): 195 recordings from 32 subjects (147 PD, 48 healthy). The project uses the dataset's pre-extracted features; there is no audio processing.",
        },
      ],
    },
    {
      id: 'neuroinsight-vic',
      contentsLabel: '3. VIC Index & Credits',
      heading: '3. VIC Index & Credits', // :152
      blocks: [
        { kind: 'paragraph', text: 'The Vocal Instability Compound (VIC) is an independently derived index:' }, // :155
        // :159 (live label "[VOCAL INSTABILITY COMPOUND (VIC)]"), :161, :164
        {
          kind: 'formula',
          name: 'Vocal Instability Compound (VIC)',
          formula: 'VIC = log10(Jitter% × Shimmer:APQ3 × spread2 × 1000)',
          note: 'VIC alone: 0.833 ROC-AUC vs 0.734 for the raw 22-feature set (Oxford only, subject-grouped CV; the 22-feature model overfits at this sample size).',
        },
        // :168, the fPI paper credit (title and authors are bold live)
        {
          kind: 'paragraph',
          text: "The feature engineering was inspired by the paper “fPI: A Novel Index for Predictive Analysis of Parkinson's Disease Using Acoustic Sound Feature” by Gautam Gupta, Mrinal Bhan and Sahil Nimsarkar (Data Science & AI department, IIIT Naya Raipur). Their Frequency Parkinson's Indicator is fPI = log10(D2 × DFA) × spread2. This project does not reuse their formula.",
        },
      ],
    },
    {
      id: 'neuroinsight-adrs',
      // Contents label matches the heading (:175), not the live contents list (:12, "Architectural Decision Records").
      contentsLabel: '4. Architecture Decision Records (ADRs)',
      heading: '4. Architecture Decision Records (ADRs)',
      blocks: [
        // :181, :185, :188-190 (id shown live as "[ADR-001]")
        {
          kind: 'adr',
          adr: {
            id: 'ADR-001',
            title: 'Vocal Instability Compound (VIC)',
            context:
              "Inspired by the paper “fPI: A Novel Index for Predictive Analysis of Parkinson's Disease Using Acoustic Sound Feature” by Gautam Gupta, Mrinal Bhan, and Sahil Nimsarkar (IIIT Naya Raipur), whose Frequency Parkinson's Indicator is fPI = log10(D2 × DFA) × spread2.",
            decision:
              'Derive a separate index, VIC = log10(Jitter% × Shimmer:APQ3 × spread2 × 1000). This project does not reuse their formula.',
            consequences:
              'VIC alone reaches 0.833 ROC-AUC vs 0.734 for the raw 22-feature set (Oxford dataset only, subject-grouped CV). VIC is untested outside the Oxford dataset because spread2 is missing from both external datasets.',
          },
        },
        // :197, :201, :204-206 (id shown live as "[ADR-002]")
        {
          kind: 'adr',
          adr: {
            id: 'ADR-002',
            title: 'XGBoost on Pre-Extracted Voice Features',
            context:
              "The UCI Oxford Parkinson's Disease Detection Dataset (Little et al.) has 195 recordings from 32 subjects (147 PD, 48 healthy), with features already extracted; there is no audio processing.",
            decision:
              'Compare XGBoost against Decision Tree, Random Forest, SVM and KNN under 5-fold subject-grouped stratified CV over 10 seeds (50 folds).',
            consequences:
              'XGBoost: accuracy 0.796 ± 0.098 vs a majority baseline of 0.756 ± 0.067; F1 0.872 ± 0.063 (baseline 0.860); precision 0.833 ± 0.093; ROC-AUC 0.741 ± 0.034 (Random Forest 0.764 ± 0.022).',
          },
        },
      ],
    },
    {
      id: 'neuroinsight-evaluation',
      contentsLabel: '5. Evaluation',
      heading: '5. Evaluation', // :214
      blocks: [
        // :217, the caveat
        {
          kind: 'paragraph',
          text: '5-fold subject-grouped stratified CV over 10 seeds (50 folds); XGBoost compared against Decision Tree, Random Forest, SVM and KNN. XGBoost precision: 0.833 ± 0.093. XGBoost is nominally best of the five on accuracy, precision and F1, but each margin over the majority baseline is comparable to or smaller than the fold-to-fold spread, and no paired test was run.',
        },
        // :222-241, labels as written in the source (shown uppercase live)
        {
          kind: 'figures',
          items: [
            { label: 'XGBoost Accuracy (baseline 0.756 ± 0.067)', value: '0.796 ± 0.098' },
            { label: 'XGBoost F1 (baseline 0.860)', value: '0.872 ± 0.063' },
            { label: 'XGBoost ROC-AUC (Random Forest 0.764 ± 0.022)', value: '0.741 ± 0.034' },
          ],
        },
      ],
    },
    {
      id: 'neuroinsight-limitations',
      contentsLabel: '6. Limitations',
      heading: '6. Limitations', // :250
      blocks: [
        // :253
        {
          kind: 'paragraph',
          text: 'VIC is untested outside the Oxford dataset because spread2 is missing from both external datasets. Its two testable ingredients (Jitter%, Shimmer:APQ3) were modestly weaker on one external cohort and showed no significant relationship with disease severity on the other, which is a different task. These comparisons are not like-for-like with VIC itself, so they neither confirm nor refute it, and external validation remains open.',
        },
      ],
    },
  ],
};
