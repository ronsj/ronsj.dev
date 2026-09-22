import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { AXE_TAGS, hideCanvas } from './helpers';

const openDialog = async (page: Page) => {
  await page.goto('/#contact');
  await page.getByRole('button', { name: 'Email' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send me a message' });
  await expect(dialog).toBeVisible();
  return dialog;
};

type Dialog = ReturnType<Page['getByRole']>;
const tokenInput = (dialog: Dialog) => dialog.locator('input[name="cf-turnstile-response"]');

/**
 * The suite builds with Turnstile's always-pass dummy sitekey, so the widget verifies on its own.
 * Pass the token from an earlier attempt to insist on a new one, since tokens are single-use.
 */
const awaitVerified = async (dialog: Dialog, previousToken = '') => {
  await expect(tokenInput(dialog)).not.toHaveValue(previousToken);
  await expect(tokenInput(dialog)).not.toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Send' })).toBeEnabled();
};

test('Email button opens an accessible dialog and Escape closes it', async ({ page }) => {
  // Hold the Turnstile script back until the pre-verification state has been checked; the always-pass
  // widget otherwise enables Send within milliseconds of the dialog opening.
  let releaseTurnstile!: () => void;
  const gate = new Promise<void>((resolve) => (releaseTurnstile = resolve));
  await page.route('**/turnstile/v0/api.js*', async (route) => {
    await gate;
    await route.continue();
  });
  const dialog = await openDialog(page);
  await expect(dialog.getByRole('button', { name: 'Send' })).toBeDisabled();
  await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused();
  for (const name of ['Name', 'Email', 'Message']) {
    await expect(dialog.getByLabel(name, { exact: true })).toHaveAttribute('required', '');
  }
  releaseTurnstile();
  await awaitVerified(dialog);

  await hideCanvas(page);
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).include('dialog').analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter((r) => r.id === 'color-contrast')).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Email' })).toBeFocused();
});

test('server validation errors are shown inline', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel('Name', { exact: true }).fill('Test Person');
  // "a@b" passes the browser's loose email check but not the action's, so the server has to answer.
  await dialog.getByLabel('Email', { exact: true }).fill('a@b');
  await dialog.getByLabel('Message', { exact: true }).fill('Hello');
  await awaitVerified(dialog);
  const spentToken = await tokenInput(dialog).inputValue();
  await dialog.getByRole('button', { name: 'Send' }).click();

  const emailField = dialog.getByLabel('Email', { exact: true });
  await expect(emailField).toHaveAttribute('aria-invalid', 'true');
  await expect(emailField).toBeFocused();
  await expect(dialog.getByText('Please enter a valid email address.')).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Please check the highlighted fields.');
  // The token was spent on that attempt; the widget must issue a fresh one before a retry.
  await awaitVerified(dialog, spentToken);
});

test('a valid submission sends and shows the confirmation', async ({ page }) => {
  const dialog = await openDialog(page);
  const sent = page.waitForResponse((r) => r.url().includes('/_actions/sendEmail'));
  await dialog.getByLabel('Name', { exact: true }).fill('Test Person');
  await dialog.getByLabel('Email', { exact: true }).fill('test@example.com');
  await dialog.getByLabel('Message', { exact: true }).fill('Hello from the test suite.');
  await awaitVerified(dialog);
  await dialog.getByRole('button', { name: 'Send' }).click();

  expect((await sent).status()).toBe(200);
  await expect(dialog.getByText(/your message is on its way/)).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
});

test('the action rejects a submission with no Turnstile token', async ({ request, baseURL }) => {
  const response = await request.post('/_actions/sendEmail', {
    headers: { Accept: 'application/json', Origin: baseURL! },
    multipart: { name: 'Bot', email: 'bot@example.com', message: 'No token here' },
  });
  expect(response.status()).toBe(403);
});
