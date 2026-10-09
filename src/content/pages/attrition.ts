import type { ProjectContent } from '../types';

const SOURCE = 'https://github.com/vardaanbazaz/employee-attrition-analysis';

/** The status is in `src/content/scene.ts`. */
export const content: ProjectContent = {
  subtitle: 'HR attrition prediction',
  summary:
    'Predicting employee attrition on the IBM HR dataset with SMOTE, XGBoost and SHAP explanations, reported with its limitations.',
  source: { label: 'View source code', href: SOURCE },
  pills: ['Python', 'Pandas', 'scikit-learn', 'Logistic Regression', 'Random Forest', 'XGBoost', 'SMOTE', 'SHAP'],
  figures: [
    { label: 'ROC-AUC:', value: '0.7592' },
    { label: 'Imbalance:', value: 'SMOTE (training split)' },
  ],
  sections: [
    {
      id: 'attrition-overview',
      contentsLabel: 'Overview',
      heading: 'Overview',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Predicting employee attrition on the IBM/Watson HR Employee Attrition dataset: 1,470 records, 35 features. Logistic Regression, Random Forest and XGBoost are evaluated on a 441-record (30%) test split, with SHAP explanations. The repo also keeps a legacy SQL exploration, which predates the single-CSV pipeline and is not wired into it.',
        },
        // The starting-repo credit, as plain text rather than a link.
        {
          kind: 'paragraph',
          text: 'Refurbished from an earlier attrition analysis (github.com/bhanmrinal/Employee-Attrition-and-Churn-Analysis).',
        },
      ],
    },
    {
      id: 'attrition-imbalance',
      contentsLabel: 'Class Imbalance & SMOTE',
      heading: 'Class Imbalance & SMOTE',
      blocks: [
        { kind: 'paragraph', text: 'The dataset is imbalanced: 83.88% of employees retained, 16.12% attrition.' },
        {
          kind: 'paragraph',
          text: 'Synthetic Minority Over-sampling Technique (SMOTE) synthesizes new minority instances along k-nearest neighbor feature vectors:',
        },
        {
          kind: 'formula',
          name: 'SMOTE synthesis formula',
          formula: 'x_new = x_i + λ × (x_knn - x_i),  where λ ~ Uniform(0, 1)',
          note: 'Where x_i is a minority sample, x_knn is a random k-nearest neighbor, and λ dictates vector interpolation offset.',
        },
        { kind: 'paragraph', text: 'SMOTE is applied to the training split, giving 1,726 records (863 per class).' },
      ],
    },
    {
      id: 'attrition-shap',
      contentsLabel: 'SHAP Attribution & Drivers',
      heading: 'SHAP Attribution & Drivers',
      blocks: [
        { kind: 'paragraph', text: 'SHAP values show which features drive predicted attrition. Ranked drivers:' },
        {
          kind: 'ranked',
          items: [
            { term: 'OverTime', text: '(30.5% vs 10.4% attrition)' },
            { term: 'YearsWithCurrManager' },
            { term: 'StockOptionLevel' },
            { term: 'MonthlyIncome' },
            { term: 'NumCompaniesWorked' },
          ],
        },
      ],
    },
    {
      id: 'attrition-design-decisions',
      contentsLabel: 'Design decisions',
      heading: 'Design decisions',
      blocks: [
        {
          kind: 'decision',
          decision: {
            title: 'SMOTE on the Training Split',
            problem:
              'The IBM/Watson HR Employee Attrition dataset (1,470 records, 35 features) is imbalanced: 83.88% retained, 16.12% attrition.',
            decision: 'Apply SMOTE to the training split, giving 1,726 records (863 per class).',
            result:
              'XGBoost reaches ROC-AUC 0.7592 on the 441-record (30%) test split, but recall is 0.2958: the model misses most actual leavers.',
          },
        },
        {
          kind: 'decision',
          decision: {
            title: 'SHAP Attribution for Attrition Drivers',
            problem: 'Predictions need feature-level explanations.',
            decision: "Compute SHAP values for the model's predictions.",
            result:
              'Driver ranking: OverTime #1 (30.5% vs 10.4% attrition), YearsWithCurrManager #2, StockOptionLevel #3, MonthlyIncome #4, NumCompaniesWorked #5.',
          },
        },
      ],
    },
    {
      id: 'attrition-results',
      contentsLabel: 'Results',
      heading: 'Results',
      blocks: [
        {
          kind: 'paragraph',
          text: 'XGBoost on the 441-record (30%) test split: accuracy 0.8549, precision 0.60, recall 0.2958, F1 0.3962.',
        },
        {
          kind: 'figures',
          items: [
            { label: 'XGBoost ROC-AUC', value: '0.7592' },
            { label: 'Training Records After SMOTE (863 per class)', value: '1,726' },
            { label: 'XGBoost Recall (misses most actual leavers)', value: '0.2958' },
          ],
        },
      ],
    },
    {
      id: 'attrition-limitations',
      contentsLabel: 'Limitations',
      heading: 'Limitations',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Small dataset (1,470 records); SMOTE uses synthetic minority samples; recall is low (0.2958), so the model misses most actual leavers.',
        },
      ],
    },
  ],
};
