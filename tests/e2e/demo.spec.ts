import { expect, test } from "@playwright/test";
import { blockForeignRequests } from "./fixture.ts";

test("the demo folder can be read, searched and browsed without picking a folder", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo folder" }).click();
  await expect(page).toHaveURL("/read/Lectern%20demo/README.md");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to Lectern" })).toBeVisible();
  // In-memory files reach the page through the service worker and the window relay.
  const img = page
    .locator("article")
    .getByRole("img", { name: /folder on your computer|How Lectern/ });
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.locator("article").getByRole("link", { name: /link goes nowhere/ }),
  ).toHaveClass(/lc-broken/);

  await page.getByRole("combobox", { name: "Search the documentation" }).fill("sandbox");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();

  await page.goto("/read/Lectern%20demo/README.md");
  await page.getByRole("button", { name: "Try the demo folder" }).click();
  await page
    .locator("article")
    .getByRole("link", { name: "An HTML document", exact: true })
    .click();
  const frame = page.frameLocator('iframe[title="api.html"]');
  await expect(frame.getByRole("heading", { name: "API reference" })).toBeVisible();
  await expect(frame.locator("#state")).toHaveText("Scripts are off.");

  // The themed page takes Lectern's design system, not a stylesheet of its own.
  await page.goto("/read/Lectern%20demo/README.md");
  await page.getByRole("button", { name: "Try the demo folder" }).click();
  await page
    .locator("article")
    .getByRole("link", { name: /in Lectern's theme/ })
    .click();
  const themed = page.frameLocator('iframe[title="themed.html"]');
  const heading = themed.getByRole("heading", { level: 1, name: /Lectern's theme/ });
  await expect(heading).toBeVisible();
  await expect(themed.locator("html")).toHaveCSS("background-color", "rgb(250, 247, 242)");
  await expect(heading).toHaveCSS("font-family", /Literata/);
  await expect(themed.locator(".lc-notice").first()).toHaveCSS("border-top-style", "solid");
  expect(foreign).toEqual([]);
});
