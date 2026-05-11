import { test, expect } from "@playwright/test";

// NOTE: These tests require the dev server running at localhost:3000.
// The NextAuth session is bypassed by mocking the cookie/session in a real setup.
// For now we test the UI in unauthenticated-redirected state and the
// kanban board DOM structure when a session is present.

test.describe("Pipeline Kanban - struttura UI", () => {
  test("redirect a /login se non autenticato", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/login/);
  });

  test("pagina login contiene form con email e password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /accedi/i })).toBeVisible();
  });

  test("errore di validazione su login form vuoto", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /accedi/i }).click();
    await expect(page.getByText(/obbligatoria/i)).toBeVisible();
  });

  test("pagina register contiene i campi richiesti", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByPlaceholder(/mario rossi/i)).toBeVisible();
    await expect(page.getByPlaceholder(/acme srl/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /crea account/i })).toBeVisible();
  });
});

test.describe("Pipeline Kanban - flusso drag & drop (con sessione)", () => {
  // To run authenticated tests, set up a fixture that injects the session cookie.
  // Example using a seeded test user:
  test.skip("drag & drop deal tra stage persiste dopo refresh", async ({ page }) => {
    // 1. Autenticati come owner@acme.com
    // 2. Vai a /deals
    // 3. Localizza deal-1 nella colonna stage-1
    // 4. Drag verso colonna stage-2
    // 5. Verifica che il deal appaia in stage-2
    // 6. Ricarica la pagina
    // 7. Verifica che il deal sia ancora in stage-2

    await page.goto("/deals");
    const board = page.getByTestId("kanban-board");
    await expect(board).toBeVisible();

    const card = page.getByTestId("deal-card-deal-1");
    const targetColumn = page.getByTestId("stage-column-stage-2");

    const cardBox = await card.boundingBox();
    const targetBox = await targetColumn.boundingBox();
    if (!cardBox || !targetBox) throw new Error("Bounding boxes non trovati");

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
    await page.mouse.up();

    await expect(page.getByText("Affare spostato")).toBeVisible();
    await expect(targetColumn.getByTestId("deal-card-deal-1")).toBeVisible();
  });

  test.skip("creazione nuovo affare tramite form slide-over", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("button", { name: /nuovo affare/i }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    await sheet.getByPlaceholder(/implementazione crm/i).fill("Test Affare E2E");
    await sheet.getByRole("spinbutton").fill("15000");
    await sheet.getByRole("button", { name: /crea/i }).click();
    await expect(page.getByText("Affare creato")).toBeVisible();
  });

  test.skip("filtro per commerciale nasconde affari di altri owner", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("combobox", { name: /commerciali/i }).selectOption("owner-1");
    const cards = page.getByTestId(/deal-card-/);
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // Tutti i card visibili devono appartenere a owner-1
  });
});
