import { expect, test, type Page } from "@playwright/test";
import { openFixture } from "./fixture.ts";

const bookmarkButton = (page: Page) => page.getByRole("button", { name: "Bookmark this document" });
const addNoteButton = (page: Page) => page.getByRole("button", { name: /^Add a note/ });
const panelButton = (page: Page) => page.getByRole("button", { name: "Bookmarks and notes" });

async function selectParagraph(page: Page, text: string) {
  await page.evaluate((wanted) => {
    const paragraph = [...document.querySelectorAll(".lc-prose p")].find(
      (p) => p.textContent === wanted,
    )!;
    getSelection()!.selectAllChildren(paragraph);
  }, text);
}

test("a bookmark is set, listed, kept across a reload and removed", async ({ page }) => {
  await openFixture(page);
  await expect(bookmarkButton(page)).toHaveAttribute("aria-pressed", "false");
  await bookmarkButton(page).click();
  await expect(bookmarkButton(page)).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByRole("heading", { level: 1, name: "Repo" }).waitFor();
  await expect(bookmarkButton(page)).toHaveAttribute("aria-pressed", "true");

  await panelButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Bookmarks and notes" });
  await expect(dialog.getByRole("link", { name: "Repo" })).toBeVisible();
  await dialog.getByRole("button", { name: "Remove bookmark: Repo" }).click();
  await expect(dialog.getByText("No bookmarks in this folder.")).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Bookmark removed.");
});

test("a bookmark in the list opens its document", async ({ page }) => {
  await openFixture(page);
  await page.goto("/read/repo/docs/guide.md");
  await page.getByRole("heading", { level: 1, name: "Guide" }).waitFor();
  await bookmarkButton(page).click();
  await expect(bookmarkButton(page)).toHaveAttribute("aria-pressed", "true");
  await page.goto("/read/repo/README.md");
  await page.getByRole("heading", { level: 1, name: "Repo" }).waitFor();
  await panelButton(page).click();
  await page.getByRole("dialog").getByRole("link", { name: "Guide" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Guide" })).toBeVisible();
});

test("a note on a selection is marked, numbered, edited and deleted", async ({ page }) => {
  await openFixture(page);
  await selectParagraph(page, "The end.");
  await addNoteButton(page).click();

  const dialog = page.getByRole("dialog", { name: "Add a note" });
  await expect(dialog.getByRole("blockquote")).toHaveText("The end.");
  const field = dialog.getByLabel("Note", { exact: true });
  await expect(field).toBeFocused();
  await field.fill("Worth a second look");
  await dialog.getByRole("button", { name: "Save note" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("mark.lc-note")).toHaveText("The end.");
  await expect(page.getByRole("status").filter({ hasText: "Note saved." })).toHaveCount(1);
  const ref = page.getByRole("button", { name: "Note 1: Worth a second look" });
  await expect(ref).toBeVisible();

  await page.reload();
  await expect(ref).toBeVisible();

  await ref.click();
  const edit = page.getByRole("dialog", { name: "Edit note" });
  await expect(edit.getByLabel("Note", { exact: true })).toHaveValue("Worth a second look");
  await edit.getByLabel("Note", { exact: true }).fill("Changed");
  await edit.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Note 1: Changed" })).toBeVisible();

  await page.getByRole("button", { name: "Note 1: Changed" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete note" }).click();
  await expect(page.locator("mark.lc-note")).toHaveCount(0);
  await expect(page.locator("main#main")).toBeFocused();
});

test("with the keyboard alone, a note goes on the current section", async ({ page }) => {
  await openFixture(page);
  await addNoteButton(page).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add a note" });
  await expect(dialog.getByRole("blockquote")).toHaveText("Repo");
  await page.keyboard.type("From the keyboard");
  await dialog.getByRole("button", { name: "Save note" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Focus comes back to the button that opened the dialog.
  await expect(addNoteButton(page)).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 }).locator("mark.lc-note")).toHaveText("Repo");
});

test("Escape closes a dialog, returns focus and leaves zen mode alone", async ({ page }) => {
  await openFixture(page);
  await panelButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Alt+z");
  await expect(page.locator("[data-zen]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(panelButton(page)).toBeFocused();
});

test("the list leads to a note in another document and focuses it", async ({ page }) => {
  await openFixture(page);
  await selectParagraph(page, "The end.");
  await addNoteButton(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save note" }).click();
  await expect(page.locator("mark.lc-note")).toHaveCount(1);

  await page.goto("/read/repo/docs/alerts.md");
  await page.getByRole("heading", { level: 1, name: "Alerts" }).waitFor();
  await panelButton(page).click();
  await page.getByRole("dialog").getByRole("link", { name: "The end." }).click();
  await expect(page.getByRole("button", { name: "Note 1" })).toBeFocused();
});

test("a note whose text is gone is reported and listed", async ({ page }) => {
  await openFixture(page);
  await selectParagraph(page, "The end.");
  await addNoteButton(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save note" }).click();
  await expect(page.locator("mark.lc-note")).toHaveCount(1);

  await page.evaluate(async () => {
    const opfs = await navigator.storage.getDirectory();
    const repo = await opfs.getDirectoryHandle("repo");
    const file = await repo.getFileHandle("README.md");
    const writable = await file.createWritable();
    await writable.write("# Repo\n\nAll new.\n");
    await writable.close();
  });
  await page.reload();
  await expect(page.getByText("One note is about text no longer in this document.")).toBeVisible();
  await page.getByRole("button", { name: "See bookmarks and notes" }).click();
  await expect(
    page.getByRole("dialog").getByText("This text is no longer in the document."),
  ).toBeVisible();
});

test("the folder's marks export as a JSON file", async ({ page }) => {
  await openFixture(page);
  await bookmarkButton(page).click();
  await expect(bookmarkButton(page)).toHaveAttribute("aria-pressed", "true");
  await panelButton(page).click();
  const download = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Export as JSON" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("repo notes.json");
});

test("the Close button returns focus to what opened the dialog", async ({ page }) => {
  await openFixture(page);
  await panelButton(page).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(panelButton(page)).toBeFocused();
});
