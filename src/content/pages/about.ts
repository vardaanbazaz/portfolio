import { GITHUB, LINKEDIN, RESUME } from '../links';
import type { AboutContent } from '../types';

export const content: AboutContent = {
  education: {
    institution: 'Dr. Shyama Prasad Mukherjee International Institute of Information Technology, Naya Raipur',
    degree: 'B.Tech in Data Science and Artificial Intelligence',
    period: '2022–2026 (completed July 2026)',
    grade: 'CGPA 7.57 / 10 (80.7%, official conversion)',
    coursework: [
      'Deep Learning',
      'Computer Vision',
      'Optimization Methods in ML',
      'Natural Language Processing',
      'Data Mining',
      'Distributed Systems',
      'Design and Analysis of Algorithms',
      'Signal and System',
      'Undergraduate Research Work-I',
      'Undergraduate Research Work-II',
      'Major Project/Thesis',
    ],
  },
  location: 'Jammu, India · open to remote',
  links: [LINKEDIN, GITHUB, RESUME],
};
