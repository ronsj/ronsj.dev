import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const openDialog = async (page: Page) => {
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Email" }).click();
  const dialog = page.getByRole("dialog", { name: "Send me a message" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test("Email button opens an accessible dialog and Escape closes it", async ({ page }) => {
  const dialog = await openDialog(page);
  for (const name of ["Name", "Email", "Message"]) {
    await expect(dialog.getByLabel(name, { exact: true })).toHaveAttribute("required", "");
  }
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .include("dialog")
    .analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Email" })).toBeFocused();
});

test("server validation errors are shown inline", async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel("Name", { exact: true }).fill("Test Person");
  // "a@b" passes the browser's loose email check but not the action's, so the server has to answer.
  await dialog.getByLabel("Email", { exact: true }).fill("a@b");
  await dialog.getByLabel("Message", { exact: true }).fill("Hello");
  await dialog.getByRole("button", { name: "Send" }).click();

  const emailField = dialog.getByLabel("Email", { exact: true });
  await expect(emailField).toHaveAttribute("aria-invalid", "true");
  await expect(emailField).toBeFocused();
  await expect(dialog.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Please check the highlighted fields.");
});

test("a valid submission sends and shows the confirmation", async ({ page }) => {
  const dialog = await openDialog(page);
  const sent = page.waitForResponse((r) => r.url().includes("/_actions/sendEmail"));
  await dialog.getByLabel("Name", { exact: true }).fill("Test Person");
  await dialog.getByLabel("Email", { exact: true }).fill("test@example.com");
  await dialog.getByLabel("Message", { exact: true }).fill("Hello from the test suite.");
  await dialog.getByRole("button", { name: "Send" }).click();

  expect((await sent).status()).toBe(200);
  await expect(dialog.getByText(/your message is on its way/)).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
});
