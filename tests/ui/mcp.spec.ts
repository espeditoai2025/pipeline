import { expect, test } from "@playwright/test";

test("connessione di sola lettura e chiave visibile una sola volta", async ({ page }, info) => {
  await page.goto("/mcp.html");
  await expect(page.getByText("https://www.pipely.it/api/mcp", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByLabel("Nome connessione").fill("Assistente vendite");
  await page.getByRole("button", { name: "Genera chiave MCP" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copia la chiave ora" })).toBeVisible();
  expect(JSON.parse((await page.locator("html").getAttribute("data-mcp-created"))!)).toMatchObject({
    canWrite: false,
    expiresInDays: 90,
  });
  await page.getByRole("button", { name: "Ho salvato la chiave" }).click();
  await expect(page.getByText("pip_mcp_" + "0".repeat(64), { exact: true })).toHaveCount(0);
  await expect(page.getByText("Sola lettura · Attiva")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("mcp-connections.png"), fullPage: true });
});
test("scrittura esplicita, scadenza e revoca", async ({ page }) => {
  await page.goto("/mcp.html");
  await page.getByLabel("Nome connessione").fill("Agente operativo");
  await page.getByRole("checkbox").check();
  await page.getByLabel("Scadenza", { exact: true }).selectOption("30");
  await page.getByRole("button", { name: "Genera chiave MCP" }).click();
  await expect(page.getByText("Lettura e scrittura · Attiva")).toBeVisible();
  expect(JSON.parse((await page.locator("html").getAttribute("data-mcp-created"))!)).toMatchObject({
    canWrite: true,
    expiresInDays: 30,
  });
  await page.getByRole("button", { name: "Revoca Agente operativo" }).click();
  await expect(page.getByText("Lettura e scrittura · Revocata")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoca Agente operativo" })).toHaveCount(0);
});
test("errori di quota leggibili e nessuna chiave generata", async ({ page }) => {
  await page.goto("/mcp.html");
  await page.getByLabel("Nome connessione").fill("Quota piena");
  await page.getByRole("button", { name: "Genera chiave MCP" }).click();
  await expect(page.getByRole("alert")).toContainText("10 connessioni");
  await expect(page.getByRole("button", { name: "Copia chiave", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Genera chiave MCP" })).toBeEnabled();
});
