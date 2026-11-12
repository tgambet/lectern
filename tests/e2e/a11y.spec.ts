import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openFixture } from "./fixture.ts";

async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    // HTML documents are the folder's content, not Lectern's interface.
    .exclude("iframe")
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("first run and unsupported screens", async ({ page, context }) => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Open a folder…" })).toBeVisible();
      expect(await audit(page)).toEqual([]);
      const other = await context.newPage();
      await other.addInitScript(() => {
        delete (Window.prototype as Partial<Window>).showDirectoryPicker;
        delete (window as Partial<Window>).showDirectoryPicker;
      });
      await other.goto("/");
      await expect(other.getByText(/can't open local folders/)).toBeVisible();
      expect(await audit(other)).toEqual([]);
    });

    test("reader, search popover and HTML frame", async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await openFixture(page);
      expect(await audit(page)).toEqual([]);
      await page.getByRole("combobox", { name: "Search the documentation" }).fill("installer");
      await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
      expect(await audit(page)).toEqual([]);
      await page.goto("/read/repo/site/index.html");
      await expect(page.getByRole("button", { name: "Run scripts" })).toBeVisible();
      expect(await audit(page)).toEqual([]);
    });

    test("notes in a document, the note dialog and the list", async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await openFixture(page);
      await page.getByRole("button", { name: "Bookmark this document" }).click();
      await page.getByRole("button", { name: /^Add a note/ }).click();
      const dialog = page.getByRole("dialog", { name: "Add a note" });
      await dialog.getByLabel("Note", { exact: true }).fill("A note");
      expect(await audit(page)).toEqual([]);
      await dialog.getByRole("button", { name: "Save note" }).click();
      await expect(page.locator("mark.lc-note")).toHaveCount(1);
      expect(await audit(page)).toEqual([]);
      await page.getByRole("button", { name: "Bookmarks and notes" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await audit(page)).toEqual([]);
    });

    test("resume screen", async ({ page }) => {
      await openFixture(page);
      await page.addInitScript(() => {
        FileSystemHandle.prototype.queryPermission = async () => "prompt";
      });
      await page.reload();
      await expect(page.getByRole("button", { name: "Resume" })).toBeFocused();
      expect(await audit(page)).toEqual([]);
    });
  });
}

test("a skip link leads to the document", async ({ page }) => {
  await openFixture(page);
  // From a fresh load, as when the app opens on a document.
  await page.reload();
  await page.getByRole("heading", { level: 1, name: "Repo" }).waitFor();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the document" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});
