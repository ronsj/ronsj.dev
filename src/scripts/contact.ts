import { actions, isInputError } from 'astro:actions';

/** The subset of the Turnstile client API we use. Loaded on demand from challenges.cloudflare.com. */
interface Turnstile {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  getResponse(widgetId: string): string | undefined;
}
interface TurnstileOptions {
  sitekey: string;
  action: string;
  size: 'normal' | 'flexible' | 'compact';
  theme: 'auto' | 'light' | 'dark';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let turnstileLoading: Promise<Turnstile> | null = null;

/** Injects the Turnstile script the first time it's needed, so visitors who never open the form don't load it. */
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileLoading) {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    turnstileLoading = new Promise<Turnstile>((resolve, reject) => {
      script.addEventListener('load', () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('Turnstile failed to initialise'));
      });
      script.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      // Don't remember the failure: the next open injects a fresh script and tries again.
      turnstileLoading = null;
      script.remove();
      throw error;
    });
  }
  return turnstileLoading;
}

/** Wires the "Email" button to the contact dialog and submits the form through the sendEmail action. */
export function initContactForm(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>('[data-email-dialog]');
  const openers = [...root.querySelectorAll<HTMLElement>('[data-email-open]')];
  if (!dialog || openers.length === 0 || typeof dialog.showModal !== 'function') return;

  const form = dialog.querySelector<HTMLFormElement>('[data-email-form]');
  const status = dialog.querySelector<HTMLElement>('[data-email-status]');
  const success = dialog.querySelector<HTMLElement>('[data-email-success]');
  const submit = dialog.querySelector<HTMLButtonElement>('[data-email-form] button[type="submit"]');
  const widgetHost = dialog.querySelector<HTMLElement>('[data-turnstile]');
  if (!form || !status || !success || !submit || !widgetHost) return;

  const fields = ['name', 'email', 'message'] as const;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const errorEl = (name: string) => dialog.querySelector<HTMLElement>(`[data-error-for="${name}"]`);

  const clearErrors = () => {
    for (const name of fields) {
      input(name)?.removeAttribute('aria-invalid');
      const el = errorEl(name);
      if (el) {
        el.textContent = '';
        el.hidden = true;
      }
    }
    status.textContent = '';
  };

  const showError = (name: string, message: string) => {
    input(name)?.setAttribute('aria-invalid', 'true');
    const el = errorEl(name);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  };

  // Turnstile: rendered explicitly so we keep the widget id and can reset it, because tokens are
  // single-use and the page stays open after each submission attempt.
  let turnstile: Turnstile | null = null;
  let widgetId: string | null = null;
  let verified = false;
  const setVerified = (ok: boolean) => {
    verified = ok;
    submit.disabled = !ok;
  };
  const resetWidget = () => {
    if (turnstile && widgetId) turnstile.reset(widgetId);
    setVerified(false);
  };
  /** Set while the widget is loading or rendering, so overlapping opens don't render it twice. */
  let mounting: Promise<void> | null = null;
  const mountWidget = () => {
    if (widgetId) return;
    mounting ??= loadTurnstile()
      .then((api) => {
        turnstile = api;
        widgetId = api.render(widgetHost, {
          sitekey: widgetHost.dataset.sitekey ?? '',
          action: 'contact',
          size: 'flexible',
          theme: 'light',
          callback: () => setVerified(true),
          'expired-callback': () => {
            setVerified(false);
            status.textContent = 'The verification expired. Please complete it again.';
          },
          'error-callback': () => {
            setVerified(false);
            status.textContent = "The verification couldn't load. Please try again later.";
          },
        });
      })
      .catch(() => {
        // Let the next open try again.
        mounting = null;
        status.textContent = "The verification couldn't load. Please try again later.";
      });
  };

  const open = () => {
    clearErrors();
    form.hidden = false;
    success.hidden = true;
    setVerified(verified);
    dialog.showModal();
    // showModal() focuses the first focusable element, which is the close button; start on the form.
    input('name')?.focus();
    // Keep the page from scrolling behind the modal.
    document.documentElement.style.overflow = 'hidden';
    mountWidget();
  };

  for (const opener of openers) opener.addEventListener('click', open);
  for (const closer of dialog.querySelectorAll('[data-email-close]')) {
    closer.addEventListener('click', () => dialog.close());
  }
  // A click on the backdrop lands on the dialog element itself, but so does one on the dialog's own
  // padding, so only close when the pointer was outside the dialog's box.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!verified) {
      status.textContent = 'Please wait for the verification to finish.';
      return;
    }
    clearErrors();
    status.textContent = 'Sending…';
    submit.disabled = true;

    const { error } = await actions.sendEmail(new FormData(form));
    // The token was redeemed by that request whatever the outcome, so get a fresh one before any retry.
    resetWidget();

    if (!error) {
      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.querySelector<HTMLElement>('[data-email-close]')?.focus();
      return;
    }
    if (isInputError(error)) {
      for (const [name, messages] of Object.entries(error.fields)) {
        if (messages?.length) showError(name, messages.join(' '));
      }
      status.textContent = 'Please check the highlighted fields.';
      dialog.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    status.textContent = error.message;
  });
}
