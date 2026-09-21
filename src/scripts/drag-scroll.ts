/**
 * Lets a horizontally scrolling row be dragged with a mouse or pen. Touch already scrolls natively,
 * so those pointers are left alone. Applies to every element in `root` marked `data-drag-scroll`.
 */
export function initDragScroll(root: ParentNode) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-drag-scroll]')) {
    let startX = 0;
    let startLeft = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      // Nothing to drag when the row fits.
      if (el.scrollWidth <= el.clientWidth) return;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = '';
    });

    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.scrollLeft = startLeft - (e.clientX - startX);
    });

    const release = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.releasePointerCapture(e.pointerId);
      delete el.dataset.dragging;
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }
}
