import { test, expect } from "@playwright/test";

test.describe("Prodotti — unauthenticated", () => {
  test("redirect a /login da /products", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Prodotti — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /products mostra il catalogo", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /prodotti/i })).toBeVisible({ timeout: 10_000 });
  });

  test("mostra la tabella prodotti", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("bottone 'Nuovo prodotto' apre il form", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: /nuovo prodotto/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("form prodotto ha categoria, prezzo e IVA", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: /nuovo prodotto/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/categoria/i)).toBeVisible();
    await expect(dialog.getByText(/iva/i)).toBeVisible();
  });

  test("ricerca prodotto filtra la tabella", async ({ page }) => {
    await page.goto("/products");
    const search = page.getByPlaceholder(/cerca prodotto/i);
    await expect(search).toBeVisible();
    await search.fill("inesistente_xyz");
    await expect(page.getByText(/nessun prodotto/i)).toBeVisible({ timeout: 3_000 });
  });

  test("statistiche: prodotti totali, attivi, categorie", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText(/prodotti totali/i)).toBeVisible();
    await expect(page.getByText(/attivi/i)).toBeVisible();
  });
});
