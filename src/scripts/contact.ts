import { actions, isInputError } from "astro:actions";

/** Wires the "Email" button to the contact dialog and submits the form through the sendEmail action. */
export function initContactForm(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>("[data-email-dialog]");
  const openers = [...root.querySelectorAll<HTMLElement>("[data-email-open]")];
  if (!dialog || openers.length === 0 || typeof dialog.showModal !== "function") return;

  const form = dialog.querySelector<HTMLFormElement>("[data-email-form]");
  const status = dialog.querySelector<HTMLElement>("[data-email-status]");
  const success = dialog.querySelector<HTMLElement>("[data-email-success]");
  const submit = dialog.querySelector<HTMLButtonElement>('[data-email-form] button[type="submit"]');
  if (!form || !status || !success || !submit) return;

  const fields = ["name", "email", "message"] as const;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const errorEl = (name: string) => dialog.querySelector<HTMLElement>(`[data-error-for="${name}"]`);

  const clearErrors = () => {
    for (const name of fields) {
      input(name)?.removeAttribute("aria-invalid");
      const el = errorEl(name);
      if (el) {
        el.textContent = "";
        el.hidden = true;
      }
    }
    status.textContent = "";
  };

  const showError = (name: string, message: string) => {
    input(name)?.setAttribute("aria-invalid", "true");
    const el = errorEl(name);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  };

  const open = () => {
    clearErrors();
    form.hidden = false;
    success.hidden = true;
    dialog.showModal();
    // showModal() focuses the first focusable element, which is the close button; start on the form.
    input("name")?.focus();
    // The page behind is scroll-driven, so freeze it while the dialog is up.
    document.documentElement.style.overflow = "hidden";
  };

  for (const opener of openers) opener.addEventListener("click", open);
  for (const closer of dialog.querySelectorAll("[data-email-close]")) {
    closer.addEventListener("click", () => dialog.close());
  }
  // A click on the backdrop lands on the dialog element itself, not its children.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.documentElement.style.overflow = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    clearErrors();
    status.textContent = "Sending…";
    submit.disabled = true;

    const { error } = await actions.sendEmail(new FormData(form));
    submit.disabled = false;

    if (!error) {
      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.querySelector<HTMLElement>("[data-email-close]")?.focus();
      return;
    }
    if (isInputError(error)) {
      for (const [name, messages] of Object.entries(error.fields)) {
        if (messages?.length) showError(name, messages.join(" "));
      }
      status.textContent = "Please check the highlighted fields.";
      dialog.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    status.textContent = error.message;
  });
}
