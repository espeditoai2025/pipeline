import { test, expect } from "@playwright/test";

test.describe("Contatti — unauthenticated", () => {
  test("redirect a /login da /contacts", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect a /login da /companies", async ({ page }) => {
    await page.goto("/companies");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect a /login da /leads", async ({ page }) => {
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Contatti — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /contacts mostra la tabella", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });
  });

  test("header mostra il titolo 'Contatti'", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("heading", { name: /contatti/i })).toBeVisible();
  });

  test("bottone 'Nuovo contatto' è visibile", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("button", { name: /nuovo contatto/i })).toBeVisible();
  });

  test("apertura form contatto tramite click", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByRole("button", { name: /nuovo contatto/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/nuovo contatto/i)).toBeVisible();
  });

  test("campo di ricerca filtra la tabella", async ({ page }) => {
    await page.goto("/contacts");
    const search = page.getByPlaceholder(/cerca/i);
    await expect(search).toBeVisible();
    await search.fill("inesistente_xyz_123");
    await expect(page.getByText(/nessun contatto/i)).toBeVisible({ timeout: 3_000 });
  });

  test("pagina /companies mostra le aziende", async ({ page }) => {
    await page.goto("/companies");
    await expect(page.getByRole("heading", { name: /aziende/i })).toBeVisible();
  });

  test("pagina /leads mostra i lead con score bar", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /lead/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("bottone 'Importa CSV' visibile in /contacts", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("button", { name: /importa/i })).toBeVisible();
  });
});
