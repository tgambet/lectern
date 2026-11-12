// Regenerates the README screenshots from the built-in demo folder: `pnpm screenshots`.
import { test, type Page } from "@playwright/test";

const out = (name: string) => `docs/screenshots/${name}.png`;

async function openDemo(page: Page, scheme: "light" | "dark") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo folder" }).click();
  await page.getByRole("heading", { level: 1, name: "Welcome to Lectern" }).waitFor();
}

test("first run", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).waitFor();
  await page.screenshot({ path: out("first-run") });
});

for (const scheme of ["light", "dark"] as const) {
  test(`reader ${scheme}`, async ({ page }) => {
    await openDemo(page, scheme);
    await page.getByRole("link", { name: "What Markdown looks like" }).click();
    await page.getByRole("heading", { level: 1, name: "What Markdown looks like" }).waitFor();
    await page.locator(".lc-code .tk-kw").first().waitFor();
    await page.screenshot({ path: out(`reader-${scheme}`) });
  });
}

test("search", async ({ page }) => {
  await openDemo(page, "light");
  await page.getByRole("combobox", { name: "Search the documentation" }).fill("sandbox");
  await page.getByRole("listbox").getByRole("option").nth(1).waitFor();
  await page.screenshot({ path: out("search") });
});

test("html document", async ({ page }) => {
  await openDemo(page, "dark");
  await page
    .locator("article")
    .getByRole("link", { name: "An HTML document", exact: true })
    .click();
  await page.frameLocator("iframe").getByRole("heading", { name: "API reference" }).waitFor();
  await page.screenshot({ path: out("html-document") });
});
