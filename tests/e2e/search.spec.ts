import { expect, test, type Page } from "@playwright/test";
import { openFixture } from "./fixture.ts";

const field = (page: Page) => page.getByRole("combobox", { name: "Search the documentation" });
const results = (page: Page) => page.getByRole("listbox", { name: "Search results" });

test("/ focuses search; results show title, path and a marked snippet", async ({ page }) => {
  await openFixture(page);
  await page.locator("article").click();
  await page.keyboard.press("Control+k");
  await expect(field(page)).toBeFocused();
  await page.keyboard.type("installer");
  const option = results(page).getByRole("option").first();
  await expect(option).toContainText("Guide");
  await expect(option).toContainText("docs/guide.md");
  await expect(option.locator("mark").first()).toHaveText(/install/i);
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "search-option-0");
});

test("Enter opens the selected result; arrows move the selection", async ({ page }) => {
  await openFixture(page);
  await field(page).fill("readme");
  await expect(results(page).getByRole("option")).not.toHaveCount(0);
  const count = await results(page).getByRole("option").count();
  await page.keyboard.press("ArrowDown");
  await expect(
    results(page)
      .getByRole("option")
      .nth(count > 1 ? 1 : 0),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(results(page).getByRole("option").first()).toHaveAttribute("aria-selected", "true");

  await field(page).fill("installer");
  await expect(results(page).getByRole("option").first()).toContainText("Guide");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/read/repo/docs/guide.md");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guide");
  await expect(results(page)).toHaveCount(0);
});

test("HTML documents are searchable, scripts excluded", async ({ page }) => {
  await openFixture(page);
  await field(page).fill("outside");
  await expect(results(page).getByRole("option").first()).toContainText("site/index.html");
  await field(page).fill("sendBeacon");
  await expect(results(page).getByText("No document matches “sendBeacon”.")).toBeVisible();
});

test("an empty search says so; Escape closes, then leaves the field", async ({ page }) => {
  await openFixture(page);
  await field(page).fill("zzqqxxnothing");
  await expect(results(page).getByText("No document matches “zzqqxxnothing”.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(results(page)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(field(page)).not.toBeFocused();
});

test("the index survives a reload and picks up new documents", async ({ page }) => {
  await openFixture(page);
  await field(page).fill("installer");
  await expect(results(page).getByRole("option").first()).toContainText("Guide");
  // A new document appears in the folder.
  await page.evaluate(async () => {
    const opfs = await navigator.storage.getDirectory();
    const repo = await opfs.getDirectoryHandle("repo");
    const docs = await repo.getDirectoryHandle("docs");
    const writable = await (
      await docs.getFileHandle("bookmarks.md", { create: true })
    ).createWritable();
    await writable.write("# Bookmarks\n\nSave a passage for later.");
    await writable.close();
  });
  await page.reload();
  await field(page).fill("passage");
  await expect(results(page).getByRole("option").first()).toContainText("docs/bookmarks.md");
  await field(page).fill("installer");
  await expect(results(page).getByRole("option").first()).toContainText("Guide");
});

test("documents are found by file name, marked in the path", async ({ page }) => {
  await openFixture(page);
  await field(page).fill("page2");
  const option = results(page).getByRole("option").first();
  await expect(option).toContainText("site/page2.html");
  await expect(option.locator(".lc-search__path mark")).toHaveText("page2");
});
