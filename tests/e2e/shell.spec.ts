import { expect, test } from "@playwright/test";
import { blockForeignRequests } from "./fixture.ts";

test("first run invites to open a folder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read the docs in a folder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open a folder…" })).toBeFocused();
  await expect(page.getByText("Read-only. Nothing leaves this device.")).toBeVisible();
});

test("a browser without the File System Access API gets the unsupported screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (Window.prototype as Partial<Window>).showDirectoryPicker;
    delete (window as Partial<Window>).showDirectoryPicker;
  });
  await page.goto("/");
  await expect(
    page.getByText("This browser can't open local folders yet. Use Chrome or Edge."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Why only Chrome and Edge?" }).click();
  await expect(page.getByText(/File System Access API/)).toBeVisible();
});

test("an opened folder lists its top level, folders first", async ({ page }) => {
  // A real FileSystemDirectoryHandle from the origin private file system stands in for the picker.
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => {
      const opfs = await navigator.storage.getDirectory();
      const docs = await opfs.getDirectoryHandle("docs", { create: true });
      const write = async (dir: FileSystemDirectoryHandle, name: string, text: string) => {
        const file = await dir.getFileHandle(name, { create: true });
        const writable = await file.createWritable();
        await writable.write(text);
        await writable.close();
      };
      await write(docs, "README.md", "# Docs");
      await write(await docs.getDirectoryHandle("guide", { create: true }), "setup.md", "Setup");
      return docs;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).click();
  const tree = page.getByRole("navigation", { name: "Documentation" });
  await expect(tree.getByRole("treeitem")).toHaveText(["guide", "README.md"]);
});

test("the theme toggle cycles and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  const toggle = page.getByRole("button", { name: /Switch theme/ });
  await toggle.click(); // auto → light
  await toggle.click(); // light → dark
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("the shell ships a strict CSP and makes no foreign request", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await page.goto("/");
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("connect-src 'none'");
  expect(csp).toContain("script-src 'self'");
  await expect(page.getByRole("heading", { name: "Read the docs in a folder" })).toBeVisible();
  expect(foreign).toEqual([]);
});

test("once the service worker is installed, the app loads offline", async ({
  page,
  context,
  baseURL,
}) => {
  const foreign = await blockForeignRequests(context, new URL(baseURL!).origin);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Read the docs in a folder" })).toBeVisible();
  // Fonts come from the precache too.
  expect(await page.evaluate(() => document.fonts.check('16px "Literata"'))).toBe(true);
  expect(foreign).toEqual([]);
});
