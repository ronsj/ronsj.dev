import { ParticleField } from "./particles";

/** How long the outgoing text fades before the next stage's text swaps in (matches the CSS transition). */
const SWAP_MS = 260;

export function initStages(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
  const text = root.querySelector<HTMLElement>("[data-text]");
  const panels = [...root.querySelectorAll<HTMLElement>("[data-stage]")];
  const anchors = [...root.querySelectorAll<HTMLElement>("[data-anchor]")];
  const stageNum = root.querySelector<HTMLElement>("[data-stage-num]");
  const bar = root.querySelector<HTMLElement>("[data-bar]");
  const hint = root.querySelector<HTMLElement>("[data-hint]");
  if (!canvas || !text || panels.length === 0) return;

  const last = panels.length - 1;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const accent = getComputedStyle(root).getPropertyValue("--color-accent").trim();

  let field: ParticleField | null = null;
  try {
    field = new ParticleField(canvas, {
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

  const show = (i: number) => {
    panels.forEach((el, j) => el.toggleAttribute("data-active", j === i));
    text.dataset.visible = "true";
  };

  const maxScroll = () => Math.max(1, root.offsetHeight - window.innerHeight);

  const readScroll = () => {
    const top = window.scrollY - root.offsetTop;
    const p = Math.max(0, Math.min(1, top / maxScroll())) * last;
    if (field) field.progress = p;

    const next = Math.min(last, Math.round(p));
    if (next !== stage) {
      stage = next;
      text.dataset.visible = "false";
      window.clearTimeout(swapTimer);
      swapTimer = window.setTimeout(() => show(stage), motion.matches ? 0 : SWAP_MS);
    }
    if (stageNum) stageNum.textContent = String(stage + 1).padStart(2, "0");
    if (bar) bar.style.width = `${Math.round((p / last) * 100)}%`;
    if (hint) hint.style.opacity = p < 0.2 ? "1" : "0";
  };

  const scrollToStage = (i: number, smooth = !motion.matches) => {
    field?.jumpTo(i);
    window.scrollTo({
      top: root.offsetTop + (maxScroll() * i) / last,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // In-page nav: smooth scroll to the stage's slot and morph straight to its shape.
  document.addEventListener("click", (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const i = anchors.findIndex((a) => `#${a.id}` === link.hash);
    if (i < 0) return;
    e.preventDefault();
    history.replaceState(null, "", link.hash);
    scrollToStage(i);
  });

  // Keyboard users tabbing into a stage that isn't on screen yet (e.g. contact links): bring it into view.
  text.addEventListener("focusin", (e) => {
    const i = panels.findIndex((el) => el.contains(e.target as Node));
    if (i >= 0 && i !== stage) {
      window.clearTimeout(swapTimer);
      stage = i;
      show(i);
      // Jump instantly so intermediate stages don't swap in underneath the focused element.
      scrollToStage(i, false);
    }
  });

  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", () => {
    field?.resize();
    readScroll();
  });

  readScroll();
  window.clearTimeout(swapTimer);
  show(stage);
}
