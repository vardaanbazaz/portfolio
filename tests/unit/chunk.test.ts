import { describe, expect, it, vi } from 'vitest';
import { failedScriptUrl, once, withRetries } from '../../src/ui/chunk';

/** A loader that fails its first `failures` calls, then resolves to 'module'. */
function flaky(failures: number) {
  let calls = 0;
  const load = vi.fn(async () => {
    calls++;
    if (calls <= failures) throw new Error(`fetch ${calls} failed`);
    return 'module';
  });
  return load;
}

describe('withRetries', () => {
  it('retries a failed load twice', async () => {
    const load = flaky(2);
    await expect(withRetries(load, 2, 0)).resolves.toBe('module');
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('gives up after the retries, with the last error', async () => {
    const load = flaky(3);
    await expect(withRetries(load, 2, 0)).rejects.toThrow('fetch 3 failed');
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe('failedScriptUrl', () => {
  const origin = 'https://example.test';

  it("reads the script from Chromium's and Firefox's errors", () => {
    expect(failedScriptUrl(new TypeError(`Failed to fetch dynamically imported module: ${origin}/assets/A-x1.js`), origin)).toBe(
      `${origin}/assets/A-x1.js`,
    );
    expect(failedScriptUrl(new TypeError(`error loading dynamically imported module: ${origin}/assets/A-x1.js`), origin)).toBe(
      `${origin}/assets/A-x1.js`,
    );
  });

  it('drops a query an earlier retry added', () => {
    expect(failedScriptUrl(new TypeError(`Failed to fetch dynamically imported module: ${origin}/assets/A-x1.js?retry=2`), origin)).toBe(
      `${origin}/assets/A-x1.js`,
    );
  });

  it("finds nothing in Safari's error, which names no script, or in another site's script", () => {
    expect(failedScriptUrl(new TypeError('Importing a module script failed.'), origin)).toBeUndefined();
    expect(failedScriptUrl(new TypeError('Failed to fetch dynamically imported module: https://other.test/a.js'), origin)).toBeUndefined();
    expect(failedScriptUrl(undefined, origin)).toBeUndefined();
  });
});

describe('once', () => {
  it('shares one fetch between callers and keeps its result', async () => {
    const load = flaky(0);
    const get = once(load, 2, 0);
    await Promise.all([get(), get()]);
    await get();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('forgets a failure, so the next call fetches again', async () => {
    const load = flaky(3);
    const get = once(load, 2, 0);
    await expect(get()).rejects.toThrow();
    await expect(get()).resolves.toBe('module');
    expect(load).toHaveBeenCalledTimes(4);
  });
});
