import { SECTION_T } from '../../src/scene/cameraPath';
import { caption, expect, test } from './fixtures';

/** Records how the page first appeared: a fly-in would insert it transparent, over a visible scene. */
const RECORD_FIRST_PAGE = () => {
  const w = window as unknown as { firstPage?: { opacity: string; sceneHidden: boolean } };
  new MutationObserver((_, observer) => {
    const main = document.querySelector<HTMLElement>('main.page');
    if (!main) return;
    w.firstPage = { opacity: main.style.opacity, sceneHidden: !!document.querySelector('.scene.scene-hidden') };
    observer.disconnect();
  }).observe(document, { childList: true, subtree: true });
};

test('a direct page link opens the page at once, with no fly-in', async ({ page }) => {
  await page.addInitScript(RECORD_FIRST_PAGE);
  await page.goto('/publications');
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Publications');
  const first = await page.evaluate(() => (window as unknown as { firstPage: { opacity: string; sceneHidden: boolean } }).firstPage);
  expect(first).toEqual({ opacity: '1', sceneHidden: true });
  // Not a dialog: a page is the main landmark, labelled by its heading.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveAttribute('aria-labelledby', 'page-title-publications');
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await expect(page).toHaveTitle('Publications · Vardaan');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Two IEEE conference papers (first author, CICT 2025)');

  // Closing a direct load lands on the path at the page's section.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('main.page')).toHaveCount(0);
  await expect(page).toHaveURL(/\/#publications$/);
  await expect(caption(page, 'publications')).toBeVisible();
  const progress = await page.evaluate(() => window.scrollY / (document.documentElement.scrollHeight - window.innerHeight));
  expect(progress).toBeCloseTo(SECTION_T.publications, 2);
});

test('each page sets its own title and description', async ({ page }) => {
  await page.goto('/projects/kanbanlight');
  await expect(page).toHaveTitle('KanbanLight · Vardaan');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^A browser-based Kanban board/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
