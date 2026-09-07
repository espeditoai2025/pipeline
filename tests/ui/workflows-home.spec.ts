import { expect, test } from "@playwright/test";

test("il builder conserva i filtri e permette fase, responsabile, tipo attività e attesa", async ({
  page,
}, info) => {
  await page.goto("/?view=workflow");
  await expect(page.getByLabel("Dalla fase")).toHaveValue("stage");
  await expect(page.getByLabel("Alla fase", { exact: true })).toHaveValue("next");
  await page.getByRole("button", { name: "Aggiorna stage", exact: true }).click();
  await page.getByLabel("Fase di destinazione").selectOption("next");
  await page.getByRole("button", { name: "Assegna proprietario", exact: true }).click();
  await page.getByLabel("Nuovo responsabile").selectOption("user");
  await page.getByRole("button", { name: "Crea attività", exact: true }).click();
  await page.getByLabel("Tipo attività").selectOption("TASK");
  await page.getByLabel("Oggetto attività").fill("Richiama cliente");
  await page.getByRole("button", { name: "Attendi", exact: true }).click();
  await page.getByLabel("Giorni di attesa").fill("2");
  await page.screenshot({ path: info.outputPath("builder.png"), fullPage: true });
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = JSON.parse((await page.getByTestId("saved-workflow").textContent())!);
  expect(saved.trigger).toMatchObject({ fromStageId: "stage", toStageId: "next" });
  expect(saved.steps.map((s: { action: unknown }) => s.action)).toEqual(
    expect.arrayContaining([
      { type: "WAIT", days: 2 },
      { type: "ASSIGN_OWNER", userId: "user" },
      { type: "UPDATE_DEAL_STAGE", stageId: "next" },
      expect.objectContaining({ activityType: "TASK" }),
    ]),
  );
});
test("mostra errori e richiede verifica prima di riprovare un'email incerta", async ({ page }) => {
  await page.goto("/?view=workflow-logs");
  await page.getByRole("button", { name: /Richiamo cliente/ }).click();
  await expect(page.getByText("Azione 2 · FAILED · Timeout email", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Riprendi dal passo interrotto" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-resumed", "true");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Riprendi dal passo interrotto" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-resumed", "true");
});
test("riconosce piani legacy ed Enterprise senza proporre un doppio acquisto", async ({ page }) => {
  await page.goto("/?view=billing&plan=ESSENTIAL");
  await expect(page.getByText("Piano gestito direttamente:", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Passa a Pro/ })).toHaveCount(0);
  await page.goto("/?view=billing&plan=ENTERPRISE");
  await expect(page.getByText("Enterprise", { exact: true })).toBeVisible();
});
test("home coerente con piani e tracking, con navigazione e contenuti leggibili su mobile", async ({
  page,
}, info) => {
  await page.goto("/?view=home");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing.getByText("SSO & SAML")).toHaveCount(0);
  await expect(pricing.getByText("Report personalizzati")).toHaveCount(0);
  await expect(pricing.getByText("99€")).toHaveCount(0);
  await expect(pricing.getByText("Non incluso: Automazioni")).toHaveCount(1);
  await expect(pricing.getByRole("link", { name: "Crea account, poi attiva Pro" })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(
    page.getByText("Ogni email inviata include pixel di tracking.", { exact: false }),
  ).toHaveCount(0);
  await pricing.screenshot({ path: info.outputPath("home-prezzi.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  if (info.project.name.includes("mobile"))
    await expect(page.getByRole("navigation", { name: "Sezioni della home" })).toBeVisible();
});
