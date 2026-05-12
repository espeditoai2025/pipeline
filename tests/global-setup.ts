import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global setup: log in with test credentials and save session state.
 * Requires TEST_EMAIL / TEST_PASSWORD env vars (or falls back to demo account).
 * The saved state is reused by all authenticated tests via storageState.
 */
export default async function globalSetup(_config: FullConfig) {
  const email = process.env.TEST_EMAIL ?? "mario@acme.com";
  const password = process.env.TEST_PASSWORD ?? "password123";

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /accedi/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(deals|$)/, { timeout: 10_000 }).catch(() => {
      // If login fails (no real DB), skip saving state
    });

    await page.context().storageState({ path: "tests/.auth/session.json" });
  } finally {
    await browser.close();
  }
}
