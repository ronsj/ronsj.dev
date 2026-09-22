import { ParticleField } from './particles';
import { isShapeName, type ShapeName } from './shapes';

/** Keys that scroll the page, and so interrupt a smooth scroll the way a wheel or touch does. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/**
 * Keeps the particle field resting on the shape of whichever section covers most of the viewport.
 * In-page nav jumps morph straight to the destination rather than through every section on the way.
 */
export function initSections(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas]');
  const sections = [...root.querySelectorAll<HTMLElement>('[data-section]')];
  if (!canvas || sections.length === 0) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const readAccent = () => getComputedStyle(root).getPropertyValue('--color-accent').trim();
  const accent = readAccent();

  // Each section declares the shape the particles rest on while it's the one on screen.
  const shapes: ShapeName[] = sections.map((el) => {
    const s = el.dataset.shape;
    if (!isShapeName(s)) throw new Error(`Section ${el.id} has no valid data-shape`);
    return s;
  });

  /** The section taking up the most of the viewport. A tie goes to the earlier one. */
  const dominant = () => {
    let best = 0;
    let bestHeight = -Infinity;
    sections.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const height = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (height > bestHeight) {
        bestHeight = height;
        best = i;
      }
    });
    return best;
  };

  let section = dominant();
  // The current section is mirrored onto the root so it can be observed without reading the canvas.
  const mark = (i: number) => {
    root.dataset.current = sections[i]!.id;
  };

  let field: ParticleField | null = null;
  try {
    field = new ParticleField(canvas, {
      shapes,
      section,
      count: Number(root.dataset.particles) || 5000,
      color: accent || undefined,
      reducedMotion: motion.matches,
    });
    field.start();
  } catch {
    canvas.hidden = true;
  }

  // The dots take the accent colour, which the theme redefines (see styles/global.css and scripts/theme.ts).
  document.addEventListener('themechange', () => {
    const color = readAccent();
    if (color) field?.setColor(color);
  });

  const setSection = (i: number) => {
    if (i === section) return;
    section = i;
    field?.setSection(i);
    mark(i);
  };

  /**
   * Set while a nav link smooth-scrolls to a section. Until the scroll arrives, the field holds that
   * target instead of morphing through whichever sections the scroll passes. Cleared on arrival, or as
   * soon as the user scrolls themselves.
   */
  let pinned: number | null = null;
  let settleTimer = 0;

  const unpin = () => {
    pinned = null;
    window.clearTimeout(settleTimer);
  };

  const readScroll = () => {
    const i = dominant();
    if (pinned !== null) {
      if (i !== pinned) {
        // A smooth scroll the browser abandoned (e.g. the tab lost focus) would otherwise stay pinned
        // forever, so release once scroll events stop arriving.
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          unpin();
          readScroll();
        }, 200);
        return;
      }
      unpin();
    }
    setSection(i);
  };

  const scrollToSection = (i: number) => {
    unpin();
    const smooth = !motion.matches;
    // Only pin when there's a journey: a scroll that's already at its target fires no scroll events.
    if (smooth && dominant() !== i) pinned = i;
    setSection(i);
    sections[i]!.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };

  // In-page nav: smooth scroll to the section and morph straight to its shape.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const i = sections.findIndex((el) => `#${el.id}` === link.hash);
    if (i < 0) return;
    // Leave modified clicks (open in new tab, etc.) to the browser.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    history.replaceState(null, '', link.hash);
    // A native anchor jump moves the tab-order start point to the target; do the same for ours.
    sections[i]!.focus({ preventScroll: true });
    scrollToSection(i);
  });

  window.addEventListener('scroll', readScroll, { passive: true });
  // The user taking over mid-jump cancels the browser's smooth scroll; hand the field back to the scroll position.
  const takeOver = () => {
    if (pinned === null) return;
    unpin();
    readScroll();
  };
  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('touchstart', takeOver, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (!SCROLL_KEYS.has(e.key)) return;
    // Space on a control activates it rather than scrolling.
    if (e.key === ' ' && (e.target as Element | null)?.closest('button, input, select, textarea'))
      return;
    takeOver();
  });
  window.addEventListener('resize', () => {
    field?.resize();
    readScroll();
  });

  mark(section);
}
