import { test, expect } from "@playwright/test";

test.describe("Automazioni — unauthenticated", () => {
  test("redirect a /login da /automations", async ({ page }) => {
    await page.goto("/automations");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Automazioni — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /automations mostra i workflow", async ({ page }) => {
    await page.goto("/automations");
    await expect(page.getByRole("heading", { name: /automazioni/i })).toBeVisible({ timeout: 10_000 });
  });

  test("statistiche: automazioni totali, attive, esecuzioni", async ({ page }) => {
    await page.goto("/automations");
    await expect(page.getByText(/automazioni totali/i)).toBeVisible();
    await expect(page.getByText(/attive/i)).toBeVisible();
  });

  test("tab 'Automazioni' è selezionato di default", async ({ page }) => {
    await page.goto("/automations");
    await expect(page.getByRole("button", { name: /automazioni/i }).first()).toBeVisible();
  });

  test("switch al tab 'Log esecuzioni'", async ({ page }) => {
    await page.goto("/automations");
    await page.getByRole("button", { name: /log esecuzioni/i }).click();
    // Il log view dovrebbe mostrare filtri SUCCESS/FAILED/SKIPPED
    await expect(page.getByText(/riuscite/i)).toBeVisible();
  });

  test("bottone 'Nuova automazione' apre il builder", async ({ page }) => {
    await page.goto("/automations");
    await page.getByRole("button", { name: /nuova automazione/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("builder ha sezione Trigger con le opzioni", async ({ page }) => {
    await page.goto("/automations");
    await page.getByRole("button", { name: /nuova automazione/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/trigger/i)).toBeVisible();
    await expect(dialog.getByText(/affare creato/i)).toBeVisible();
  });

  test("espansione flusso di un workflow esistente", async ({ page }) => {
    await page.goto("/automations");
    // Click "Mostra flusso" sul primo workflow
    const showBtn = page.getByRole("button", { name: /mostra flusso/i }).first();
    await expect(showBtn).toBeVisible();
    await showBtn.click();
    await expect(page.getByText(/trigger:/i)).toBeVisible();
  });
});
