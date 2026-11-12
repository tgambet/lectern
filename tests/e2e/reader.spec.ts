import { expect, test, type Page } from "@playwright/test";
import { blockForeignRequests, openFixture } from "./fixture.ts";

const article = (page: Page) => page.locator("article");

test("opening a folder lands on its README, with the document tree", async ({ page }) => {
  await openFixture(page);
  await expect(page).toHaveURL("/read/repo/README.md");
  await expect(page).toHaveTitle("Repo · Lectern");
  const tree = page.getByRole("tree");
  await expect(page.getByText("repo · 9 documents")).toBeVisible();
  await expect(tree.getByRole("treeitem", { name: "README.md" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tree.getByRole("treeitem", { name: "docs" })).toBeVisible();
  await expect(page.getByText("Should not appear")).toHaveCount(0);
  await expect(tree.getByRole("treeitem", { name: "node_modules" })).toHaveCount(0);
});

test("relative images and SVG load through the service worker", async ({ page }) => {
  await openFixture(page);
  for (const name of ["Logo", "Diagram"]) {
    const img = article(page).getByRole("img", { name });
    await expect(img).toHaveAttribute("src", /^\/~\/[\w-]+\/img\//);
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("links navigate between documents, with back and forward", async ({ page }) => {
  await openFixture(page);
  await article(page).getByRole("link", { name: "guide", exact: true }).click();
  await expect(page).toHaveURL("/read/repo/docs/guide.md");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  await expect(page.getByRole("treeitem", { name: "guide.md" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Repo");
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
});

test("a link with an anchor scrolls to the heading", async ({ page }) => {
  await openFixture(page);
  await article(page).getByRole("link", { name: "its install section" }).click();
  await expect(page).toHaveURL("/read/repo/docs/guide.md#install");
  await expect(page.getByRole("heading", { name: "Install" })).toBeInViewport();
});

test("a folder link opens the folder's README", async ({ page }) => {
  await openFixture(page);
  await article(page).getByRole("link", { name: "the docs folder" }).click();
  await expect(page).toHaveURL("/read/repo/docs/README.md");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Docs index");
});

test("broken links say so, not only with color", async ({ page }) => {
  await openFixture(page);
  const broken = article(page).getByRole("link", { name: /the setup notes/ });
  await expect(broken).toHaveAttribute("title", "No file at guides/setup.md");
  await expect(broken).toHaveClass(/lc-broken/);
});

test("code is highlighted and can be copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openFixture(page);
  const block = page.locator(".lc-code");
  await expect(block.locator(".lc-code__lang")).toHaveText("ts");
  await expect(block.locator(".tk-kw").first()).toHaveText("const");
  await block.getByRole("button", { name: "Copy" }).click();
  await expect(block.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "const answer: number = 42;",
  );
});

test("the table of contents lists sections and jumps to them", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await openFixture(page);
  const toc = page.getByRole("navigation", { name: "On this page" });
  await expect(toc.getByRole("link")).toHaveText(["Overview", "Details"]);
  await toc.getByRole("link", { name: "Details" }).click();
  await expect(page.getByRole("heading", { name: "Details" })).toBeInViewport();
});

test("the tree works from the keyboard", async ({ page }) => {
  await openFixture(page);
  const tree = page.getByRole("tree");
  await tree.getByRole("treeitem", { name: "README.md" }).focus();
  await page.keyboard.press("Home"); // docs
  await expect(tree.getByRole("treeitem", { name: "docs" })).toBeFocused();
  await page.keyboard.press("ArrowRight"); // expand
  await expect(tree.getByRole("treeitem", { name: "docs" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("ArrowRight"); // first child
  await page.keyboard.press("g"); // type-ahead: guide.md
  await expect(tree.getByRole("treeitem", { name: "guide.md" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/read/repo/docs/guide.md");
});

test("relaunching reopens the last document at the same scroll position", async ({ page }) => {
  await openFixture(page);
  await article(page).getByRole("link", { name: "guide", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  const before = await page.evaluate(() => scrollY);
  await page.waitForTimeout(600); // scroll position is saved after 300 ms
  await page.goto("/");
  await expect(page).toHaveURL("/read/repo/docs/guide.md");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 50);
});

test("an opened folder reads fully offline, images included", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await openFixture(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Repo" })).toBeVisible();
  const logo = article(page).getByRole("img", { name: "Logo" });
  await expect
    .poll(() => logo.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await article(page).getByRole("link", { name: "guide", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  expect(foreign).toEqual([]);
});

test("files served from /~/ carry the sandbox policy, even opened as a page", async ({ page }) => {
  await openFixture(page);
  const src = await article(page).getByRole("img", { name: "Logo" }).getAttribute("src");
  const folder = src!.split("/")[2];
  // The app itself cannot fetch (connect-src 'none'); a top-level visit goes through the service worker.
  const response = await page.goto(`/~/${folder}/docs/api.html`);
  expect(response?.headers()["content-security-policy"]).toMatch(
    /^sandbox allow-same-origin;.*script-src 'none'/,
  );
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { name: "API" })).toBeVisible();
});

test("the tree filters by name, and switches to a flat list", async ({ page }) => {
  await openFixture(page);
  const tree = page.getByRole("tree");
  await page.getByRole("searchbox", { name: "Filter by name" }).fill("GUIDE");
  await expect(tree.getByRole("treeitem", { name: "guide.md" })).toBeVisible();
  await expect(tree.getByRole("treeitem", { name: "guide.md" }).locator("mark")).toHaveText(
    "guide",
  );
  await expect(tree.getByRole("treeitem", { name: "README.md" })).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/read/repo/docs/guide.md");

  await page.getByRole("searchbox", { name: "Filter by name" }).fill("");
  await page.getByRole("button", { name: "Tree options" }).click();
  await page.getByRole("button", { name: "Flat list" }).click();
  await expect(tree.getByRole("treeitem", { name: "docs/guide.md" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tree.getByRole("treeitem", { name: "docs", exact: true })).toHaveCount(0);
});

test("reading width is chosen from the header and kept; zen shows the document alone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openFixture(page);
  const width = () => article(page).evaluate((el) => el.getBoundingClientRect().width);
  const normal = await width();
  await page.getByRole("button", { name: "Reading width" }).click();
  await page.getByRole("button", { name: "Wide" }).click();
  await expect.poll(width).toBeGreaterThan(normal);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Repo");
  await expect.poll(width).toBeGreaterThan(normal);

  await page.locator("article").click();
  await page.keyboard.press("Alt+z");
  await expect(page.getByRole("tree")).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tree")).toBeVisible();
  await page.getByRole("button", { name: /Zen mode/ }).click();
  await page.getByRole("button", { name: /Leave zen mode/ }).click();
  await expect(page.getByRole("banner")).toBeVisible();
});

test("an edited document updates in place, keeping the reader's place", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 400 });
  await openFixture(page);
  test.skip(!(await page.evaluate(() => "FileSystemObserver" in window)), "no FileSystemObserver");
  await page.evaluate(() => scrollTo(0, 120));
  const write = (path: string, text: string) =>
    page.evaluate(
      async ({ path, text }) => {
        let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle("repo");
        const parts = path.split("/");
        const name = parts.pop()!;
        for (const part of parts) dir = await dir.getDirectoryHandle(part);
        const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
        await writable.write(text);
        await writable.close();
      },
      { path, text },
    );
  const before = await page.evaluate(() => scrollY);
  await write("README.md", "# Repo, edited\n\n" + "Line.\n\n".repeat(80));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Repo, edited");
  await expect(page.getByRole("status").filter({ hasText: "Document updated." })).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(before);

  await write("docs/new.md", "# New");
  await expect(page.getByRole("treeitem", { name: "docs" })).toBeVisible();
  await page.getByRole("treeitem", { name: "docs" }).click();
  await expect(page.getByRole("treeitem", { name: "new.md" })).toBeVisible();
});

test("a GitHub-style alert renders as a notice", async ({ page }) => {
  await openFixture(page);
  await page.goto("/read/repo/docs/alerts.md");
  const notice = page.getByRole("note");
  await expect(notice).toContainText("Warning");
  await expect(notice).toContainText("Mind the gap.");
  await expect(notice.locator("svg")).toHaveCount(1);
  await expect(page.locator("blockquote")).toHaveCount(1);
});
