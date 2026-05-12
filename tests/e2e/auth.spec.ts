import { test, expect } from "@playwright/test";

test.describe("Autenticazione", () => {
  test.describe("Redirect non autenticato", () => {
    const protectedRoutes = ["/", "/deals", "/contacts", "/companies", "/leads",
      "/activities", "/emails", "/reports", "/products", "/automations", "/settings"];

    for (const route of protectedRoutes) {
      test(`${route} reindirizza a /login`, async ({ page }) => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      });
    }
  });

  test.describe("Pagina login", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("ha il logo Pipely", async ({ page }) => {
      await expect(page.getByText("P").first()).toBeVisible();
      await expect(page.getByText(/Accedi a Pipely/i)).toBeVisible();
    });

    test("mostra i campi email e password", async ({ page }) => {
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("bottone accedi è presente", async ({ page }) => {
      await expect(page.getByRole("button", { name: /accedi/i })).toBeVisible();
    });

    test("validazione: email obbligatoria", async ({ page }) => {
      await page.getByRole("button", { name: /accedi/i }).click();
      await expect(page.getByText(/obbligatoria/i)).toBeVisible();
    });

    test("validazione: email non valida", async ({ page }) => {
      await page.getByLabel(/email/i).fill("nonvalida");
      await page.getByLabel(/password/i).fill("pass123");
      await page.getByRole("button", { name: /accedi/i }).click();
      await expect(page.getByText(/email/i)).toBeVisible();
    });

    test("link a registrazione presente", async ({ page }) => {
      await expect(page.getByRole("link", { name: /registra/i })).toBeVisible();
    });

    test("link a password dimenticata presente", async ({ page }) => {
      await expect(page.getByRole("link", { name: /dimenticata/i })).toBeVisible();
    });
  });

  test.describe("Pagina registrazione", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/register");
    });

    test("ha logo Pipely", async ({ page }) => {
      await expect(page.getByText("P").first()).toBeVisible();
    });

    test("ha i campi richiesti", async ({ page }) => {
      await expect(page.getByPlaceholder(/mario rossi/i)).toBeVisible();
      await expect(page.getByPlaceholder(/acme/i)).toBeVisible();
    });

    test("bottone crea account presente", async ({ page }) => {
      await expect(page.getByRole("button", { name: /crea account/i })).toBeVisible();
    });

    test("validazione su form vuoto", async ({ page }) => {
      await page.getByRole("button", { name: /crea account/i }).click();
      await expect(page.getByText(/obbligatori/i)).toBeVisible();
    });

    test("link a login presente", async ({ page }) => {
      await expect(page.getByRole("link", { name: /accedi/i })).toBeVisible();
    });
  });

  test.describe("Pagina forgot password", () => {
    test("ha il titolo corretto", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByText(/password dimenticata/i)).toBeVisible();
    });

    test("ha un campo email", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByRole("textbox")).toBeVisible();
    });
  });
});
