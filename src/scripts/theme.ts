export type Theme = 'light' | 'dark';

/** localStorage key for an explicit choice. Absent, the theme follows the system preference. */
const STORAGE_KEY = 'theme';

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

/** The theme in effect, as set on <html> by the inline script in Layout.astro. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}

/**
 * Wires every `data-theme-toggle` button under `root`. A toggle stores an explicit choice; until then
 * the theme follows the system preference, including changes to it while the page is open.
 * Each change is announced as a `themechange` event on `document` so canvas colours can follow.
 */
export function initTheme(root: ParentNode) {
  const toggles = [...root.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const system = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    for (const t of toggles) t.setAttribute('aria-pressed', String(theme === 'dark'));
    // The browser chrome colour comes from the paper token so it can't drift from the stylesheet.
    const paper = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-paper')
      .trim();
    if (paper) for (const m of metas) m.content = paper;
    document.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }));
  };

  apply(currentTheme());

  for (const t of toggles) {
    t.addEventListener('click', () => {
      const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
      storeTheme(next);
      apply(next);
    });
  }

  system.addEventListener('change', (e) => {
    if (storedTheme() === null) apply(e.matches ? 'dark' : 'light');
  });
}
