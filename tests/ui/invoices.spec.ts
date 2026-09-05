import { expect, test } from "@playwright/test";

test("registra acconto e saldo, poi rettifica conservando lo storico", async ({ page }, info) => {
  await page.goto("/?view=invoice");
  await page.getByRole("button", { name: "Registra incasso", exact: true }).click();
  await page.getByLabel("Importo incassato (EUR)").fill("300,50");
  await page.getByLabel("Riferimento (facoltativo)").fill("Acconto progetto");
  await page.getByRole("button", { name: "Conferma incasso" }).click();
  await expect(page.getByTestId("invoice-balance")).toContainText("919,50");
  await expect(page.getByText("Acconto ricevuto", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("incassi.png"), fullPage: true });
  await page.getByRole("button", { name: "Registra incasso", exact: true }).click();
  await expect(page.getByLabel("Importo incassato (EUR)")).toHaveValue("919,50");
  await page.getByRole("button", { name: "Conferma incasso" }).click();
  await expect(page.getByText("Saldata", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registra incasso", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Rettifica incasso di 919,50/ }).click();
  await page.getByLabel("Motivo della rettifica").fill("Registrato per errore");
  await page.getByRole("button", { name: "Conferma rettifica" }).click();
  await expect(page.getByTestId("invoice-balance")).toContainText("919,50");
  await expect(page.getByText("Annullato", { exact: true })).toBeVisible();
  await expect(page.getByText("Registrato per errore", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("mantiene il modulo aperto in caso di errore e aggiorna la scadenza", async ({ page }) => {
  await page.goto("/?view=invoice");
  await page.getByLabel("Nuova scadenza").fill("2026-12-20");
  await page.getByRole("button", { name: "Salva scadenza" }).click();
  await expect(page.getByText("20 dic 2026", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Registra incasso", exact: true }).click();
  await page.getByLabel("Importo incassato (EUR)").fill("1500");
  await page.getByRole("button", { name: "Conferma incasso" }).click();
  await expect(page.getByRole("alert")).toContainText("supera il saldo residuo");
  await expect(page.getByRole("button", { name: "Conferma incasso" })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("il ruolo lettore non vede azioni di scrittura", async ({ page }) => {
  await page.goto("/?view=invoice&role=viewer");
  await expect(page.getByRole("heading", { name: "FT-2026/012" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registra incasso" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salva scadenza" })).toHaveCount(0);
});

test("scadenzario accessibile, valute distinte e collegamenti ai filtri", async ({ page }, info) => {
  await page.goto("/?view=invoices");
  await expect(page.getByRole("heading", { name: "Fatture e incassi" })).toBeVisible();
  await expect(page.getByText("Da incassare · EUR")).toBeVisible();
  await expect(page.getByText("Da incassare · USD")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Filtri fatture" }).getByRole("link", { name: "Scadute", exact: true })).toHaveAttribute("href", /filter=overdue/);
  await expect(page.getByRole("link", { name: "Successiva" })).toHaveAttribute("href", /page=2/);
  await page.screenshot({ path: info.outputPath("scadenzario.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("crea una bozza con scadenza suggerita senza scaricare XML", async ({ page }) => {
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.goto("/?view=invoice-create");
  await expect(page.getByLabel("Cliente / ragione sociale *")).toHaveValue("Studio Rossi");
  await page.getByLabel("Termini di pagamento").selectOption("immediato");
  await expect(page.getByLabel("Data scadenza *")).not.toHaveValue("");
  await page.getByRole("button", { name: "Crea bozza", exact: true }).click();
  await expect(page.getByText("Bozza", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Segna come inviata" })).toBeVisible();
  expect(downloads).toBe(0);
});
