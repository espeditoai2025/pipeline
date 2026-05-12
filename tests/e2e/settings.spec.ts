import { test, expect } from "@playwright/test";

test.describe("Settings — unauthenticated", () => {
  test("redirect a /login da /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Settings — navigazione tab (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /settings carica il tab Profilo", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/informazioni personali/i)).toBeVisible({ timeout: 10_000 });
  });

  test("form profilo ha i campi nome, email, telefono", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/nome completo/i)).toBeVisible();
    await expect(page.getByText(/email/i)).toBeVisible();
    await expect(page.getByText(/telefono/i)).toBeVisible();
  });

  test("tab Sicurezza mostra cambio password e 2FA", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /sicurezza/i }).click();
    await expect(page.getByText(/cambio password/i)).toBeVisible();
    await expect(page.getByText(/due fattori/i)).toBeVisible();
  });

  test("tab Sicurezza mostra le sessioni attive", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /sicurezza/i }).click();
    await expect(page.getByText(/sessioni attive/i)).toBeVisible();
    await expect(page.getByText(/corrente/i)).toBeVisible();
  });

  test("tab Sicurezza mostra le chiavi API", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /sicurezza/i }).click();
    await expect(page.getByText(/chiavi api/i)).toBeVisible();
  });

  test("tab Billing mostra i piani", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /billing/i }).click();
    await expect(page.getByText(/starter/i)).toBeVisible();
    await expect(page.getByText(/enterprise/i)).toBeVisible();
  });

  test("tab Billing mostra usage meters", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /billing/i }).click();
    await expect(page.getByText(/utilizzo piano/i)).toBeVisible();
  });

  test("tab Billing mostra storico fatture", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /billing/i }).click();
    await expect(page.getByText(/storico fatture/i)).toBeVisible();
  });

  test("tab Preferenze mostra opzioni tema", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /preferenze/i }).click();
    await expect(page.getByText(/tema/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /chiaro/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /scuro/i })).toBeVisible();
  });

  test("tab Organizzazione mostra i membri del team", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /organizzazione/i }).click();
    await expect(page.getByText(/membri del team/i)).toBeVisible();
    await expect(page.getByText(/Admin/)).toBeVisible();
  });
});
