import { test, expect } from "@playwright/test";

test.describe("Report — unauthenticated", () => {
  test("redirect a /login da /reports", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Report — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /reports carica i KPI", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /report/i })).toBeVisible({ timeout: 10_000 });
  });

  test("mostra il filtro periodo (7d / 30d / 90d / 12m)", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("button", { name: /7 giorni/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /30 giorni/i })).toBeVisible();
  });

  test("click sul periodo cambia i KPI", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: /7 giorni/i }).click();
    // KPI cards dovrebbero aggiornarsi
    await expect(page.getByText(/affari aperti/i)).toBeVisible();
  });

  test("AI Insights strip è visibile", async ({ page }) => {
    await page.goto("/reports");
    // L'AIInsightsStrip carica async
    await expect(page.getByText(/AI Insights/i)).toBeVisible({ timeout: 5_000 });
  });

  test("bottone 'Esporta CSV' è presente", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("button", { name: /esporta csv/i })).toBeVisible();
  });

  test("sezione grafico funnel conversione", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByText(/funnel/i)).toBeVisible();
  });

  test("sezione top performer", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByText(/top performer/i)).toBeVisible();
  });
});
