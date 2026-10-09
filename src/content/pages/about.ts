import { GITHUB, LINKEDIN, RESUME } from '../links';
import type { AboutContent } from '../types';

export const content: AboutContent = {
  education: {
    institution: 'Dr. Shyama Prasad Mukherjee International Institute of Information Technology, Naya Raipur', // DECISIONS 7; FACTS 1 Institution and degree
    degree: 'B.Tech in Data Science and Artificial Intelligence', // DECISIONS 7; FACTS 1 Institution and degree
    period: '2022–2026 (completed July 2026)', // FACTS 1 Degree period and status; matches the professional site
    grade: 'CGPA 7.57 / 10 (80.7%, official conversion)', // DECISIONS 7; FACTS 1 Grade display
    // FACTS 1 Coursework
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
  location: 'Jammu, India · open to remote', // DECISIONS 2 Location; FACTS 1 Location
  links: [LINKEDIN, GITHUB, RESUME],
};
