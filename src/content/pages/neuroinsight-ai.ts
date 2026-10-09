import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/neuroinsight-ai';

/** The status is in `src/content/scene.ts`. */
export const content: ProjectContent = {
  subtitle: 'Voice-classification research',
  summary:
    "Parkinson's voice-classification research, with an independently derived index (VIC) and subject-grouped evaluation. A research project, not a clinical tool.",
  source: { label: 'View source code', href: SOURCE },
  pills: ['Python', 'Pandas', 'scikit-learn', 'XGBoost', 'Notebooks', 'VIC index', 'Subject-grouped CV'],
  figures: [
    { label: 'Accuracy:', value: '0.796 ± 0.098' },
    { label: 'Baseline:', value: '0.756 ± 0.067' },
  ],
  sections: [
    {
      id: 'neuroinsight-overview',
      contentsLabel: 'Overview',
      heading: 'Overview',
      blocks: [
        {
          kind: 'paragraph',
          text: "Parkinson's voice-classification research, with an independently derived index (VIC) and subject-grouped evaluation. This is a research project; it is not designed, certified, or intended for clinical medical diagnosis.",
        },
        // The starting-repo credit, as plain text rather than a link.
        {
          kind: 'paragraph',
          text: 'Started from an earlier fPI analyser (github.com/bhanmrinal/fPI-Parkison-Analyser-using-Acoustic-Sound-Features) and rebuilt with the VIC index and subject-grouped cross-validation; external validation was attempted but is inconclusive (see Limitations).',
        },
      ],
    },
    {
      id: 'neuroinsight-dataset',
      contentsLabel: 'Dataset',
      heading: 'Dataset',
      blocks: [
        {
          kind: 'paragraph',
          text: "UCI Oxford Parkinson's Disease Detection Dataset (Little et al.): 195 recordings from 32 subjects (147 recordings labeled Parkinson's, 48 labeled healthy control). The project uses the dataset's pre-extracted features; there is no audio processing.",
        },
      ],
    },
    {
      id: 'neuroinsight-vic',
      contentsLabel: 'VIC Index & Credits',
      heading: 'VIC Index & Credits',
      blocks: [
        { kind: 'paragraph', text: 'The Vocal Instability Compound (VIC) is an independently derived index:' },
        {
          kind: 'formula',
          name: 'Vocal Instability Compound (VIC)',
          formula: 'VIC = log10(Jitter% × Shimmer:APQ3 × spread2 × 1000)',
          note: 'VIC alone: 0.833 ROC-AUC vs 0.734 for the raw 22-feature set (Oxford only, subject-grouped CV; the 22-feature model overfits at this sample size).',
        },
        // The fPI paper credit.
        {
          kind: 'paragraph',
          text: "The feature engineering was inspired by the paper “fPI: A Novel Index for Predictive Analysis of Parkinson's Disease Using Acoustic Sound Feature” by Gautam Gupta, Mrinal Bhan and Sahil Nimsarkar (Data Science & AI department, IIIT Naya Raipur). Their Frequency Parkinson's Indicator is fPI = log10(D2 × DFA) × spread2. This project does not reuse their formula.",
        },
      ],
    },
    {
      id: 'neuroinsight-design-decisions',
      contentsLabel: 'Design decisions',
      heading: 'Design decisions',
      blocks: [
        {
          kind: 'decision',
          decision: {
            title: 'Vocal Instability Compound (VIC)',
            problem:
              "Inspired by the paper “fPI: A Novel Index for Predictive Analysis of Parkinson's Disease Using Acoustic Sound Feature” by Gautam Gupta, Mrinal Bhan, and Sahil Nimsarkar (IIIT Naya Raipur), whose Frequency Parkinson's Indicator is fPI = log10(D2 × DFA) × spread2.",
            decision:
              'Derive a separate index, VIC = log10(Jitter% × Shimmer:APQ3 × spread2 × 1000). This project does not reuse their formula.',
            result:
              'VIC alone reaches 0.833 ROC-AUC vs 0.734 for the raw 22-feature set (Oxford dataset only, subject-grouped CV). VIC is untested outside the Oxford dataset because spread2 is missing from both external datasets.',
          },
        },
        {
          kind: 'decision',
          decision: {
            title: 'XGBoost on Pre-Extracted Voice Features',
            problem:
              "The UCI Oxford Parkinson's Disease Detection Dataset (Little et al.) has 195 recordings from 32 subjects (147 recordings labeled Parkinson's, 48 labeled healthy control), with features already extracted; there is no audio processing.",
            decision:
              'Compare XGBoost against Decision Tree, Random Forest, SVM and KNN under 5-fold subject-grouped stratified CV over 10 seeds (50 folds).',
            result:
              'XGBoost: accuracy 0.796 ± 0.098 vs a majority baseline of 0.756 ± 0.067; F1 0.872 ± 0.063 (baseline 0.860); precision 0.833 ± 0.093; ROC-AUC 0.741 ± 0.034 (Random Forest 0.764 ± 0.022).',
          },
        },
      ],
    },
    {
      id: 'neuroinsight-evaluation',
      contentsLabel: 'Evaluation',
      heading: 'Evaluation',
      blocks: [
        // The caveat.
        {
          kind: 'paragraph',
          text: '5-fold subject-grouped stratified CV over 10 seeds (50 folds); XGBoost compared against Decision Tree, Random Forest, SVM and KNN. XGBoost precision: 0.833 ± 0.093. XGBoost is nominally best of the five on accuracy, precision and F1, but each margin over the majority baseline is comparable to or smaller than the fold-to-fold spread, and no paired test was run.',
        },
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
      contentsLabel: 'Limitations',
      heading: 'Limitations',
      blocks: [
        {
          kind: 'paragraph',
          text: 'VIC is untested outside the Oxford dataset because spread2 is missing from both external datasets. Its two testable ingredients (Jitter%, Shimmer:APQ3) were modestly weaker on one external cohort and showed no significant relationship with disease severity on the other, which is a different task. These comparisons are not like-for-like with VIC itself, so they neither confirm nor refute it, and external validation remains open.',
        },
      ],
    },
  ],
};
