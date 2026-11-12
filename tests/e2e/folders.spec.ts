import { expect, test } from "@playwright/test";

test("close a folder, return home, reopen it and switch without the picker", async ({ page }) => {
  // The picker stands in with OPFS folders, one per call, in order: alpha, beta.
  await page.addInitScript(() => {
    const names = ["alpha", "beta"];
    window.showDirectoryPicker = async () => {
      const name = names.shift()!;
      const dir = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(name, {
        create: true,
      });
      const file = await dir.getFileHandle("README.md", { create: true });
      const writable = await file.createWritable();
      await writable.write(`# ${name} readme`);
      await writable.close();
      return dir;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).click();
  await expect(page.getByRole("heading", { name: "alpha readme" })).toBeVisible();

  // Open a second folder through the picker so both are known.
  await page.getByRole("button", { name: "alpha" }).click();
  await page.getByRole("button", { name: "Open another folder…" }).click();
  await expect(page.getByRole("heading", { name: "beta readme" })).toBeVisible();

  // Close: home lists both folders and the demo.
  await page.getByRole("button", { name: "beta" }).click();
  await page.getByRole("button", { name: "Close folder" }).click();
  await expect(page.getByRole("heading", { name: "Read the docs in a folder" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  const known = page.getByRole("list", { name: "Known folders" });
  await expect(known.getByRole("button", { name: /^(alpha|beta)/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Try the demo folder" })).toBeVisible();

  // Reopen alpha from the list, then switch to beta from the reader menu: no picker either time.
  await known.getByRole("button", { name: /^alpha/ }).click();
  await expect(page.getByRole("heading", { name: "alpha readme" })).toBeVisible();
  await page.getByRole("button", { name: "alpha" }).click();
  await page
    .getByRole("list", { name: "Known folders" })
    .getByRole("button", { name: /^beta/ })
    .click();
  await expect(page.getByRole("heading", { name: "beta readme" })).toBeVisible();

  // Forget alpha from home; beta stays.
  await page.getByRole("button", { name: "beta" }).click();
  await page.getByRole("button", { name: "Close folder" }).click();
  await page.getByRole("button", { name: "Forget alpha" }).click();
  await expect(known.getByRole("button", { name: /^alpha/ })).toHaveCount(0);
  await expect(known.getByRole("button", { name: /^beta/ })).toHaveCount(1);
});
