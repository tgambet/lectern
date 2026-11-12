import { expect, test, type Page } from "@playwright/test";
import { blockForeignRequests, openFixture } from "./fixture.ts";

async function openHtml(page: Page, path: string) {
  await openFixture(page);
  await page.goto(`/read/repo/${path}`);
  return page.frameLocator(`iframe[title="${path.split("/").pop()}"]`);
}

test("an HTML document renders with its relative CSS, images and SVG, scripts off", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  const frame = await openHtml(page, "site/index.html");
  await expect(frame.getByRole("heading", { name: "Site home" })).toHaveCSS(
    "color",
    "rgb(1, 2, 3)",
  );
  for (const name of ["dot", "shape"]) {
    const img = frame.getByRole("img", { name, exact: true });
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
  // The SVG <object> was rewritten to an image, which loads offline.
  await expect(frame.locator("#obj")).toHaveCount(0);
  await expect(frame.locator("#out")).toHaveText("scripts did not run");
  await expect(page.getByText("This document has scripts. They are off.")).toBeVisible();
  expect(foreign).toEqual([]);
});

test("links inside an HTML document move the app with them", async ({ page }) => {
  const frame = await openHtml(page, "site/index.html");
  await frame.getByRole("link", { name: "Page two" }).click();
  await expect(page).toHaveURL("/read/repo/site/page2.html");
  await expect(page.getByRole("treeitem", { name: "page2.html" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Page two" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Site home" }),
  ).toBeVisible();
});

test("a Markdown link inside an HTML document opens in the reader", async ({ page }) => {
  const frame = await openHtml(page, "site/index.html");
  await frame.getByRole("link", { name: "Back to the readme" }).click();
  await expect(page).toHaveURL("/read/repo/README.md");
  await expect(page.getByRole("heading", { level: 1, name: "Repo" })).toBeVisible();
});

test("outside links open in a new tab, never in the frame", async ({ page }) => {
  await page.addInitScript(() => {
    window.open = (url) => {
      (window as unknown as { opened: unknown }).opened = String(url);
      return null;
    };
  });
  const frame = await openHtml(page, "site/index.html");
  await frame.getByRole("link", { name: "Outside" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { opened?: string }).opened))
    .toBe("https://example.com/");
  await expect(frame.getByRole("heading", { name: "Site home" })).toBeVisible();
});

test("scripts can be turned on, with in-memory storage only", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await openHtml(page, "site/index.html");
  await page.getByRole("button", { name: "Run scripts" }).click();
  await expect(page.getByText("Scripts run without access to your files")).toBeVisible();
  const frame = page.frameLocator('iframe[title="index.html"]');
  // Storage works, in memory only: the app's own storage stays out of reach.
  await expect(frame.locator("#out")).toHaveText("scripts ran; storage: in memory");
  // Inlined resources still render in scripts mode.
  await expect(frame.getByRole("heading", { name: "Site home" })).toHaveCSS(
    "color",
    "rgb(1, 2, 3)",
  );
  await expect
    .poll(() =>
      frame.getByRole("img", { name: "dot" }).evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Turn scripts off" }).click();
  await expect(page.frameLocator('iframe[title="index.html"]').locator("#out")).toHaveText(
    "scripts did not run",
  );
  expect(foreign).toEqual([]);
});

for (const mode of ["scripts off", "scripts on"] as const) {
  test(`a malicious document cannot reach app state, the folder or the network (${mode})`, async ({
    page,
    context,
    baseURL,
  }) => {
    const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
    await openHtml(page, "site/evil.html");
    if (mode === "scripts on") await page.getByRole("button", { name: "Run scripts" }).click();
    const frame = page.frameLocator('iframe[title="evil.html"]');
    if (mode === "scripts off") {
      await frame.locator("#js").click();
      await page.waitForTimeout(500);
      await expect(frame.locator("#out")).toHaveText("nothing ran");
    } else {
      await expect(frame.locator("body")).toHaveAttribute("data-done", "yes");
      const out = await frame.locator("#out").textContent();
      for (const name of ["parent", "handles", "fetch", "top"]) {
        expect(out).toContain(`${name}: blocked`);
      }
      // The in-memory shim answers, but never with the app's own values.
      expect(out).toContain("storage: empty");
      // Form posts and beacons fail silently; the foreign-request check below proves they went nowhere.
      expect(out).toContain("image: failed");
      expect(out).not.toContain("GOT");
      // A javascript: link may rewrite the frame's own document, nothing more.
      await frame.locator("#js").click();
    }
    // The app is untouched: same URL, same title, still working.
    await expect(page).toHaveURL("/read/repo/site/evil.html");
    await expect(page).toHaveTitle("evil.html · Lectern");
    await expect(page.getByRole("treeitem", { name: "evil.html" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(foreign).toEqual([]);
  });
}

test("HTML documents get their dark styles when the system prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const frame = await openHtml(page, "site/index.html");
  await expect(frame.getByRole("heading", { name: "Site home" })).toHaveCSS(
    "color",
    "rgb(4, 5, 6)",
  );
});

test("HTML documents read offline", async ({ page, context }) => {
  await openHtml(page, "site/index.html");
  await context.setOffline(true);
  await page.reload();
  const frame = page.frameLocator('iframe[title="index.html"]');
  await expect(frame.getByRole("heading", { name: "Site home" })).toHaveCSS(
    "color",
    "rgb(1, 2, 3)",
  );
  await expect
    .poll(() =>
      frame.getByRole("img", { name: "dot" }).evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
});

test("a document that opts in gets Lectern's design system, in both themes", async ({ page }) => {
  const frame = await openHtml(page, "site/themed.html");
  const heading = frame.getByRole("heading", { name: "Themed page" });
  await expect(heading).toBeVisible();
  // Light paper and ink from tokens.css.
  await expect(frame.locator("html")).toHaveCSS("background-color", "rgb(250, 247, 242)");
  await expect(heading).toHaveCSS("color", "rgb(30, 27, 24)");
  await expect(frame.locator(".lc-notice")).toHaveCSS("border-top-style", "solid");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(frame.locator("html")).toHaveCSS("background-color", "rgb(22, 20, 18)");
});

test("a document that does not opt in keeps its own styles", async ({ page }) => {
  const frame = await openHtml(page, "site/index.html");
  await expect(frame.getByRole("heading", { name: "Site home" })).toBeVisible();
  await expect(frame.locator("link[href='/lectern-doc.css']")).toHaveCount(0);
});
