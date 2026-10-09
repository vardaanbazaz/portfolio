// Fails the build check if any built text file contains an http(s) URL that is neither one of the site's own
// outbound links nor a known inert library string. Usage: node scripts/check-urls.mjs <dir>
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/** The site's own outbound links: matched as a prefix that ends at the string's end or at a '/'. */
const SITE_LINKS = [
  'https://github.com/vardaanbazaz',
  'https://www.linkedin.com/in/vardaan-bajaj-a03605254/',
  'https://ieeexplore.ieee.org/abstract/document/',
  'https://doi.org/',
  'https://kanbanlight.vercel.app',
];

/** Strings the libraries carry that the site never requests. Matched exactly, so a new one fails until reviewed. */
const INERT_LIBRARY_STRINGS = {
  // XML namespace names (react-dom, three): identifiers, never fetched.
  'http://www.w3.org/1999/xlink': 'XML namespace',
  'http://www.w3.org/2000/svg': 'XML namespace',
  'http://www.w3.org/XML/1998/namespace': 'XML namespace',
  'http://www.w3.org/1998/Math/MathML': 'XML namespace',
  'http://www.w3.org/1999/xhtml': 'XML namespace',
  // Text of error and warning messages.
  'https://react.dev/errors/': 'react-dom error message',
  'https://reactrouter.com/en/main/routers/picking-a-router.': 'react-router warning',
  'https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively': '@react-three/fiber error message',
  'https://github.com/react-spring/react-use-measure/#resize-observer-polyfills': 'react-use-measure error message',
  // A base for parsing relative URLs, never requested.
  'http://localhost': 'react-router URL parsing base',
  // A paper cited in a three.js shader comment string.
  'https://jcgt.org/published/0007/04/01/': 'three.js source citation',
  // @react-three/fiber's package.json fields, bundled as data.
  'https://opencollective.com/react-three-fiber': '@react-three/fiber package metadata',
  'https://github.com/pmndrs/react-three-fiber#readme': '@react-three/fiber package metadata',
  'https://github.com/pmndrs/react-three-fiber/issues': '@react-three/fiber package metadata',
  'https://github.com/pmndrs/react-three-fiber.git': '@react-three/fiber package metadata',
  'https://github.com/drcmda': '@react-three/fiber package metadata',
  'https://github.com/codyjasonbennett': '@react-three/fiber package metadata',
  'https://github.com/joshuaellis': '@react-three/fiber package metadata',
  'https://github.com/krispya': '@react-three/fiber package metadata',
};

/** Files a browser parses as text. Anything else (the resume PDF, images) is listed as skipped. */
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest', '.map']);

const URL_PATTERN = /https?:\/\/[^\s"'`<>()\\]+/g;

const isSiteLink = (url) =>
  SITE_LINKS.some((link) => url === link || (url.startsWith(link) && (link.endsWith('/') || url[link.length] === '/')));

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/check-urls.mjs <dir>');
  process.exit(2);
}

const failures = [];
const skipped = [];
let scanned = 0;
for (const path of files(root)) {
  const name = relative(root, path);
  if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) {
    skipped.push(name);
    continue;
  }
  scanned++;
  for (const [url] of readFileSync(path, 'utf8').matchAll(URL_PATTERN)) {
    if (!isSiteLink(url) && !Object.hasOwn(INERT_LIBRARY_STRINGS, url)) failures.push(`${name}: ${url}`);
  }
}

console.log(`Scanned ${scanned} text files in ${root}; skipped ${skipped.length} other files: ${skipped.join(', ') || 'none'}.`);
if (failures.length > 0) {
  console.error(`Outside URLs not on the allowlist:\n${failures.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('No outside URLs beyond the allowlist.');
