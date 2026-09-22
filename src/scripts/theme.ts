export type Theme = 'light' | 'dark';
/** What the visitor chose: a theme, or `auto` to follow the system preference. */
export type Mode = Theme | 'auto';

/** localStorage key for the chosen mode. Absent means `auto`, the default. */
const STORAGE_KEY = 'theme';
/** The order the header button cycles through. */
const MODES: Mode[] = ['auto', 'light', 'dark'];

const isMode = (v: unknown): v is Mode => v === 'auto' || v === 'light' || v === 'dark';

/** The theme in effect, as set on <html> by the inline script in Layout.astro. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function storedMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isMode(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function storeMode(mode: Mode) {
  try {
    if (mode === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}

/**
 * Wires every `data-theme-toggle` button under `root` to cycle auto → light → dark. `auto` follows the
 * system preference, including changes to it while the page is open. The mode goes on <html> as
 * `data-mode` (which icon the button shows) and the theme it resolves to as `data-theme` (what the
 * stylesheet reads). Each change is announced as a `themechange` event on `document` so canvas colours can follow.
 */
export function initTheme(root: ParentNode) {
  const toggles = [...root.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const system = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (mode: Mode) => {
    const theme: Theme = mode === 'auto' ? (system.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.theme = theme;
    for (const t of toggles) t.setAttribute('aria-label', `Theme: ${mode}`);
    // The browser chrome colour comes from the paper token so it can't drift from the stylesheet.
    const paper = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-paper')
      .trim();
    if (paper) for (const m of metas) m.content = paper;
    document.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }));
  };

  apply(storedMode());

  for (const t of toggles) {
    t.addEventListener('click', () => {
      const next = MODES[(MODES.indexOf(storedMode()) + 1) % MODES.length]!;
      storeMode(next);
      apply(next);
    });
  }

  system.addEventListener('change', () => {
    if (storedMode() === 'auto') apply('auto');
  });
}
