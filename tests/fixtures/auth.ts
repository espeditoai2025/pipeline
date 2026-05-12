import { test as base, expect } from "@playwright/test";

// Extend test with authenticated page fixture
export const test = base.extend({
  // Use saved session state if available
  page: async ({ browser }, use) => {
    let context;
    try {
      context = await browser.newContext({
        storageState: "tests/.auth/session.json",
      });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
