import { GITHUB, LINKEDIN, RESUME } from '../links';
import type { ContactContent } from '../types';

export const content: ContactContent = {
  email: 'vardaanbazaz@gmail.com', // DECISIONS 2 Public email; FACTS 1 Public email
  availability: 'Open to remote roles.', // DECISIONS 1; FACTS 1 Target roles
  links: [LINKEDIN, GITHUB, RESUME],
};
