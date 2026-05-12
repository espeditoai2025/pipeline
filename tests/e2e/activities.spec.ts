import { test, expect } from "@playwright/test";

test.describe("Attività — unauthenticated", () => {
  test("redirect a /login da /activities", async ({ page }) => {
    await page.goto("/activities");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Attività — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /activities carica le attività", async ({ page }) => {
    await page.goto("/activities");
    await expect(page.getByRole("heading", { name: /attività/i })).toBeVisible({ timeout: 10_000 });
  });

  test("tab 'Lista' è selezionato di default", async ({ page }) => {
    await page.goto("/activities");
    await expect(page.getByRole("button", { name: /lista/i })).toBeVisible();
  });

  test("switch al tab 'Calendario' mostra la griglia mensile", async ({ page }) => {
    await page.goto("/activities");
    await page.getByRole("button", { name: /calendario/i }).click();
    // Verifica che compaiano i giorni della settimana
    await expect(page.getByText(/lun/i)).toBeVisible();
  });

  test("bottone 'Nuova attività' apre il form", async ({ page }) => {
    await page.goto("/activities");
    await page.getByRole("button", { name: /nuova attività/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("form attività ha i tipi (CALL, MEETING, EMAIL)", async ({ page }) => {
    await page.goto("/activities");
    await page.getByRole("button", { name: /nuova attività/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/chiamata/i)).toBeVisible();
    await expect(dialog.getByText(/meeting/i)).toBeVisible();
  });

  test("statistiche riepilogative sono visibili", async ({ page }) => {
    await page.goto("/activities");
    await expect(page.getByText(/oggi/i)).toBeVisible();
  });
});
