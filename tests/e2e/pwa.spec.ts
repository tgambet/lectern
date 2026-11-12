import { expect, test } from "@playwright/test";
import { blockForeignRequests, openFixture, stubFolderPicker } from "./fixture.ts";

test("the main flows raise no CSP or Trusted Types violation in the app", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const violations: string[] = [];
  const isApp = (url: string) =>
    url.startsWith(baseURL!) && !new URL(url).pathname.startsWith("/~/");
  page.on("console", (m) => {
    if (
      /Content Security Policy|Trusted Type/i.test(m.text()) &&
      isApp(m.location().url || baseURL!)
    ) {
      violations.push(m.text());
    }
  });
  page.on("pageerror", (e) => violations.push(String(e)));

  await openFixture(page);
  await page.locator(".lc-code").getByRole("button", { name: "Copy" }).click();
  await page.getByRole("button", { name: /Switch theme/ }).click();
  await page.locator("article").getByRole("link", { name: "guide", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  await page.getByRole("combobox", { name: "Search the documentation" }).fill("installer");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  await page.goto("/read/repo/site/index.html");
  await page.getByRole("button", { name: "Run scripts" }).click();
  await expect(page.frameLocator("iframe").locator("#out")).toHaveText(/scripts ran/);
  expect(violations).toEqual([]);
});

test("grammars and fonts come from the precache when offline from the start", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await stubFolderPicker(page);
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Open a folder…" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Repo" })).toBeVisible();
  await expect(page.locator(".lc-code .tk-kw").first()).toHaveText("const");
  expect(await page.evaluate(() => document.fonts.check('16px "JetBrains Mono"'))).toBe(true);
  expect(foreign).toEqual([]);
});

test("the app is installable", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = (await cdp.send("Page.getInstallabilityErrors")) as {
    installabilityErrors: Array<{ errorId: string }>;
  };
  // Playwright contexts are ephemeral, which Chrome reports as incognito; nothing else may fail.
  expect(installabilityErrors.filter((e) => e.errorId !== "in-incognito")).toEqual([]);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = (await (await page.request.get(href!)).json()) as {
    name: string;
    display: string;
    icons: Array<{ purpose?: string }>;
  };
  expect(manifest).toMatchObject({ name: "Lectern", display: "standalone" });
  expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
});

test("storage persistence is requested once a folder opens", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { persistCalls: string[] }).persistCalls = calls;
    navigator.storage.persist = async () => {
      calls.push("persist");
      return true;
    };
    navigator.storage.persisted = async () => false;
  });
  await openFixture(page);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { persistCalls: string[] }).persistCalls))
    .toEqual(["persist"]);
});
