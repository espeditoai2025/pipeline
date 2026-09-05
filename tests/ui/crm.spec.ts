import { expect, test } from "@playwright/test";

test("la giornata consente completamento e pianificazione del ricontatto", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "La tua giornata" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("giornata.png"), fullPage: true });
  await page.getByRole("button", { name: "Completa Richiamare Mario" }).click();
  await expect(page.getByText("Nessuna attività in ritardo", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Pianifica ricontatto per Consulenza sito web" }).click();
  await expect(page.getByLabel("Oggetto *", { exact: true })).toHaveValue("Ricontatto: Consulenza sito web");
  await expect(page.getByLabel("Affare collegato", { exact: true })).toHaveValue("deal-1");
  await page.getByLabel("Data e ora *", { exact: true }).fill("2026-12-10T09:30");
  await page.getByRole("button", { name: "Crea", exact: true }).click();
  await expect(page.getByText("Nessun affare da ricontattare:", { exact: false })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test("unisce tutti e tre i contatti di un gruppo", async ({ page }) => {
  await page.goto("/?view=merge");
  await expect(page.getByText("3 contatti nel gruppo.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Unisci contatti", exact: true }).click();
  await expect(page.getByText("2 contatti nel gruppo.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Unisci contatti", exact: true }).click();
  await expect(page.getByText("Unioni eseguite: 2")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("importa CSV italiani con virgole nei campi senza spezzarli", async ({ page }) => {
  await page.goto("/?view=import");
  await page.locator('input[type="file"]').setInputFiles({ name: "contatti.csv", mimeType: "text/csv", buffer: Buffer.from('Nome;Email;Azienda\nMario;mario@example.it;"Studio, Associati"') });
  await expect(page.getByRole("cell", { name: "Studio, Associati", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Importa 1 contatti" }).click();
  await expect(page.getByText("1 contatti importati", { exact: true })).toBeVisible();
});

test("rifiuta CSV senza nome prima dell'importazione", async ({ page }) => {
  await page.goto("/?view=import");
  await page.locator('input[type="file"]').setInputFiles({ name: "errato.csv", mimeType: "text/csv", buffer: Buffer.from('Nome;Email\n;mario@example.it') });
  await expect(page.getByText("Riga 2: Nome obbligatorio", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Importa", exact: true })).toBeDisabled();
});

test("il completamento in lista aggiorna i contatori e il calendario", async ({ page }) => {
  await page.goto("/?view=activities");
  await expect(page.getByText("1 da completare · 1 totali")).toBeVisible();
  await expect(page.getByRole("region", { name: "Elenco attività" }).getByText("Richiamare Mario", { exact: true })).toHaveCount(1);
  await page.getByTitle("Segna come completata").click();
  await expect(page.getByText("0 da completare · 1 totali")).toBeVisible();
  await page.getByRole("button", { name: "Calendario", exact: true }).click();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByText("0 da completare · 1 totali")).toBeVisible();
});
