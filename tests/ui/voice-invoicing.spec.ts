import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }, permissions: ["microphone"] });

test("estrae il testo aziendale mostrando i campi e conserva quelli già compilati", async ({ page }, info) => {
  await page.goto("/?view=company-autofill");
  await page.getByText("Compila dai tuoi dati", { exact: true }).click();
  await page.getByLabel("Testo aziendale").fill("Ragione sociale: Nuovo Nome\nP.IVA: IT12345678903\nEmail: cliente@example.it\nCittà: Milano");
  await page.getByRole("button", { name: "Estrai dal testo" }).click();
  await expect(page.getByRole("checkbox", { name: /Ragione sociale/ })).not.toBeChecked();
  await page.screenshot({ path: info.outputPath("company-autofill.png"), fullPage: true });
  await page.getByRole("button", { name: "Applica i campi selezionati" }).click();
  const fields = JSON.parse((await page.getByTestId("company-fields").textContent())!);
  expect(fields).toMatchObject({ name: "Nome già compilato", vatNumber: "12345678903", email: "cliente@example.it", city: "Milano" });
});

test("registra audio dal browser, permette l’ascolto e salva su richiesta", async ({ page }, info) => {
  let uploads = 0;
  await page.route("**/api/voice", async route => { uploads++; expect(route.request().postDataBuffer()!.byteLength).toBeGreaterThan(200); await route.fulfill({ json: { id: "saved" } }); });
  await page.goto("/?view=voice");
  await page.getByLabel("Titolo", { exact: true }).fill("Incontro Rossi");
  await page.getByRole("button", { name: "Registra nota", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ferma registrazione" })).toBeVisible();
  await expect(page.getByText("1s / 120s", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ferma registrazione" }).click();
  await expect(page.getByLabel("Anteprima registrazione")).toBeVisible();
  expect(uploads).toBe(0);
  await page.screenshot({ path: info.outputPath("voice-recorded.png"), fullPage: true });
  await page.getByRole("button", { name: "Salva registrazione" }).click();
  await expect(page.getByRole("status")).toContainText("Nota salvata"); expect(uploads).toBe(1);
});

test("comandi con anteprima annullabile e conferma prima delle modifiche", async ({ page }, info) => {
  await page.goto("/?view=voice");
  await page.getByRole("button", { name: "Cerca record" }).click();
  await page.getByLabel("Seleziona record CRM").selectOption("deal:deal-1");
  await page.getByLabel("Comando", { exact: true }).fill("Segna vinto e richiama il cliente domani alle dieci");
  await page.getByRole("button", { name: "Mostra anteprima del comando" }).click();
  await expect(page.getByText("Modifiche a Consulenza Rossi", { exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-commands");
  await page.screenshot({ path: info.outputPath("voice-command.png"), fullPage: true });
  await page.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(page.getByRole("button", { name: "Conferma ed esegui" })).toHaveCount(0);
  await page.getByRole("button", { name: "Mostra anteprima del comando" }).click();
  await page.getByRole("button", { name: "Conferma ed esegui" }).click();
  await expect(page.getByRole("status")).toContainText("Comando eseguito");
  await expect(page.locator("html")).toHaveAttribute("data-commands", "1");
});

test("Starter e Viewer vedono solo le azioni del proprio piano e ruolo", async ({ page }) => {
  await page.goto("/?view=voice&plan=starter");
  await expect(page.getByRole("button", { name: "Registra nota", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mostra anteprima del comando" })).toHaveCount(0);
  await page.goto("/?view=voice&role=viewer");
  await expect(page.getByRole("button", { name: "Registra nota", exact: true })).toHaveCount(0);
});

test("fattura: dati fiscali, conferma creazione e seconda conferma SdI", async ({ page }, info) => {
  await page.goto("/?view=invoice-cloud");
  await page.getByRole("button", { name: "Gestisci fatturazione" }).click();
  await page.getByRole("button", { name: "Prepara fattura elettronica" }).click();
  await page.getByLabel("Indirizzo", { exact: true }).fill("Via Roma 10");
  await page.getByLabel("Città", { exact: true }).fill("Milano");
  await page.getByLabel("CAP", { exact: true }).fill("20100");
  await page.getByLabel("Provincia", { exact: true }).fill("MI");
  await page.getByLabel("Codice destinatario", { exact: false }).fill("0000000");
  await page.getByRole("button", { name: "Controlla dati e totali" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-invoice-created");
  await page.screenshot({ path: info.outputPath("invoice-cloud-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "Conferma creazione in Fatture in Cloud" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-invoice-created", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-invoice-sent");
  await page.getByRole("button", { name: "Invia allo SdI", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-invoice-sent");
  await page.getByRole("button", { name: "Conferma invio fiscale" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-invoice-sent", "true");
});

test("dichiara il collegamento non configurato senza mostrare una falsa attivazione", async ({ page }) => {
  await page.goto("/?view=invoicing-settings");
  await expect(page.getByText(/deve essere attivato dal gestore/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Collega Fatture in Cloud", exact: true })).toHaveCount(0);
});
