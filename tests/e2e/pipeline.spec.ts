import { test, expect } from "@playwright/test";

/**
 * Pipeline / Deals tests.
 * Unauthenticated tests run immediately.
 * Authenticated tests are skipped until a session fixture is configured
 * (set up globalSetup with valid TEST_EMAIL / TEST_PASSWORD).
 */

test.describe("Pipeline — unauthenticated", () => {
  test("redirect a /login da /deals", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Pipeline — struttura pagina (autenticato)", () => {
  test.skip(!process.env.TEST_SESSION, "Richiede sessione attiva");

  test.use({ storageState: "tests/.auth/session.json" });

  test("pagina /deals carica il kanban board", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByTestId("kanban-board")).toBeVisible({ timeout: 10_000 });
  });

  test("il kanban mostra le colonne degli stage", async ({ page }) => {
    await page.goto("/deals");
    const columns = page.getByTestId(/stage-column-/);
    await expect(columns.first()).toBeVisible();
    expect(await columns.count()).toBeGreaterThanOrEqual(3);
  });

  test("bottone 'Nuovo affare' è visibile", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByRole("button", { name: /nuovo affare/i })).toBeVisible();
  });

  test("click 'Nuovo affare' apre lo sheet", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("button", { name: /nuovo affare/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("form affare ha i campi richiesti", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("button", { name: /nuovo affare/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByPlaceholder(/implementazione pipely/i)).toBeVisible();
    await expect(dialog.getByRole("spinbutton").first()).toBeVisible();
  });

  test("toggle lista/kanban è funzionante", async ({ page }) => {
    await page.goto("/deals");
    const listBtn = page.getByRole("button", { name: /lista/i });
    await expect(listBtn).toBeVisible();
    await listBtn.click();
    // After toggle, table should appear
    await expect(page.getByRole("table")).toBeVisible({ timeout: 5_000 });
  });

  test.skip("drag & drop deal tra stage aggiorna la UI", async ({ page }) => {
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
    await page.waitForTimeout(300);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 30 });
    await page.mouse.up();

    await expect(page.getByText(/affare spostato/i)).toBeVisible({ timeout: 5_000 });
  });
});
