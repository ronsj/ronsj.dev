import { ParticleField } from './particles';
import { isShapeName, type ShapeName } from './shapes';

/** How long the outgoing text fades before the next stage's text swaps in (matches the CSS transition). */
const SWAP_MS = 260;

/** Keys that scroll the page, and so interrupt a smooth scroll the way a wheel or touch does. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function initStages(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas]');
  const text = root.querySelector<HTMLElement>('[data-text]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-stage]')];
  const anchors = [...root.querySelectorAll<HTMLElement>('[data-anchor]')];
  const stageNum = root.querySelector<HTMLElement>('[data-stage-num]');
  const bar = root.querySelector<HTMLElement>('[data-bar]');
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  if (!canvas || !text || panels.length === 0) return;

  const last = panels.length - 1;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const accent = getComputedStyle(root).getPropertyValue('--color-accent').trim();

  // Each stage declares the shape the particles rest on while it's showing.
  const shapes: ShapeName[] = panels.map((el) => {
    const s = el.dataset.shape;
    if (!isShapeName(s)) throw new Error(`Stage ${el.id} has no valid data-shape`);
    return s;
  });

  let field: ParticleField | null = null;
  try {
    field = new ParticleField(canvas, {
      shapes,
      count: Number(root.dataset.particles) || 5000,
      color: accent || undefined,
      reducedMotion: motion.matches,
    });
    field.start();
  } catch {
    canvas.hidden = true;
  }

  let stage = 0;
  let swapTimer = 0;
  /**
   * Set while a nav link or step button smooth-scrolls to a stage. Until the scroll arrives, the text
   * tracks this stage instead of whichever one the scroll position happens to be passing through, so
   * no intermediate section flashes in. Cleared on arrival, or as soon as the user scrolls themselves.
   */
  let pinned: number | null = null;
  let settleTimer = 0;

  const show = (i: number) => {
    panels.forEach((el, j) => el.toggleAttribute('data-active', j === i));
    text.dataset.visible = 'true';
    // Ends stay focusable but inert, so focus isn't dropped when the last section is reached.
    prev?.setAttribute('aria-disabled', String(i === 0));
    next?.setAttribute('aria-disabled', String(i === last));
  };

  // Content swaps in place without moving focus, so tell screen readers what's now on screen.
  const announce = (i: number) => {
    const title = panels[i]?.querySelector('h1, h2')?.textContent?.trim() ?? '';
    if (live) live.textContent = `Section ${i + 1} of ${last + 1}: ${title}`;
  };

  const maxScroll = () => Math.max(1, root.offsetHeight - window.innerHeight);
  const progress = () => {
    const top = window.scrollY - root.offsetTop;
    return Math.max(0, Math.min(1, top / maxScroll())) * last;
  };

  const unpin = () => {
    pinned = null;
    window.clearTimeout(settleTimer);
  };

  const readScroll = () => {
    const p = progress();
    if (field) field.progress = p;

    if (pinned !== null) {
      if (Math.abs(p - pinned) < 0.02) unpin();
      else {
        // A smooth scroll the browser abandoned (e.g. the tab lost focus) would otherwise leave the
        // text pinned forever, so release once scroll events stop arriving.
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          unpin();
          readScroll();
        }, 200);
      }
    }
    const target = pinned ?? Math.min(last, Math.round(p));
    if (target !== stage) {
      stage = target;
      text.dataset.visible = 'false';
      window.clearTimeout(swapTimer);
      swapTimer = window.setTimeout(
        () => {
          show(stage);
          announce(stage);
        },
        motion.matches ? 0 : SWAP_MS,
      );
    }
    if (stageNum) stageNum.textContent = String(stage + 1).padStart(2, '0');
    if (bar) bar.style.width = `${Math.round((p / last) * 100)}%`;
  };

  const scrollToStage = (i: number, smooth = !motion.matches) => {
    unpin();
    // Only pin when there's a journey: a scroll that's already at its target fires no scroll events.
    if (smooth && Math.abs(progress() - i) >= 0.02) pinned = i;
    field?.jumpTo(i);
    window.scrollTo({
      top: root.offsetTop + (maxScroll() * i) / last,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Step buttons: move one section at a time, ignoring clicks at either end.
  prev?.addEventListener('click', () => {
    if (stage > 0) scrollToStage(stage - 1);
  });
  next?.addEventListener('click', () => {
    if (stage < last) scrollToStage(stage + 1);
  });

  // In-page nav: smooth scroll to the stage's slot and morph straight to its shape.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const i = anchors.findIndex((a) => `#${a.id}` === link.hash);
    if (i < 0) return;
    e.preventDefault();
    history.replaceState(null, '', link.hash);
    scrollToStage(i);
  });

  // Keyboard users tabbing into a stage that isn't on screen yet (e.g. contact links): bring it into view.
  text.addEventListener('focusin', (e) => {
    const i = panels.findIndex((el) => el.contains(e.target as Node));
    if (i >= 0 && i !== stage) {
      window.clearTimeout(swapTimer);
      stage = i;
      show(i);
      // Jump instantly so intermediate stages don't swap in underneath the focused element.
      scrollToStage(i, false);
    }
  });

  window.addEventListener('scroll', readScroll, { passive: true });
  // The user taking over mid-jump cancels the browser's smooth scroll; hand the text back to the scroll position.
  const takeOver = () => {
    if (pinned === null) return;
    unpin();
    readScroll();
  };
  window.addEventListener('wheel', takeOver, { passive: true });
  window.addEventListener('touchstart', takeOver, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (!SCROLL_KEYS.has(e.key)) return;
    // Space on a control activates it (e.g. the step buttons) rather than scrolling.
    if (e.key === ' ' && (e.target as Element | null)?.closest('button, input, select, textarea'))
      return;
    takeOver();
  });
  window.addEventListener('resize', () => {
    field?.resize();
    readScroll();
  });

  readScroll();
  window.clearTimeout(swapTimer);
  show(stage);
}
