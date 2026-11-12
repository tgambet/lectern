import { expect, test } from "@playwright/test";

/** A generated repository: 50 folders × (60 Markdown + 40 other files) = 5,000 files. */
async function stubLargeRepo(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const longTasks: number[] = [];
    (window as unknown as { longTasks: number[] }).longTasks = longTasks;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });

    window.showDirectoryPicker = async () => {
      const opfs = await navigator.storage.getDirectory();
      const root = await opfs.getDirectoryHandle("big", { create: true });
      const filler = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20);
      const write = async (dir: FileSystemDirectoryHandle, name: string, text: string) => {
        const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
        await w.write(text);
        await w.close();
      };
      await write(root, "README.md", "# Big repository\n\nStart here.");
      const jobs: Promise<void>[] = [];
      for (let d = 0; d < 50; d++) {
        const dir = await root.getDirectoryHandle(`module-${d}`, { create: true });
        for (let f = 0; f < 60; f++) {
          jobs.push(
            write(
              dir,
              `page-${f}.md`,
              `# Module ${d} page ${f}\n\n## Section\n\n${filler} token${d}x${f}\n`,
            ),
          );
        }
        for (let f = 0; f < 40; f++)
          jobs.push(write(dir, `source-${f}.ts`, `export const v${f} = ${f};\n`));
      }
      await Promise.all(jobs);
      return root;
    };
  });
}

test("a 5,000-file repository stays responsive and is searchable while indexing", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await stubLargeRepo(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Big repository" })).toBeVisible({
    timeout: 120_000,
  });
  const opened = Date.now();
  await expect(page.getByText("big · 3001 documents")).toBeVisible({ timeout: 30_000 });
  const treeMs = Date.now() - opened;

  // Search answers while the worker indexes.
  const search = page.getByRole("combobox", { name: "Search the documentation" });
  await search.fill("token7x3");
  await expect(page.getByRole("listbox").getByRole("option").first()).toContainText(
    "module-7/page-3.md",
    {
      timeout: 60_000,
    },
  );
  await expect(page.locator(".lc-search__status")).toHaveCount(0, { timeout: 120_000 });
  const indexedMs = Date.now() - opened;

  // Opening a folder with 60 documents in the tree, once the results are closed.
  await search.press("Escape");
  await page.getByRole("treeitem", { name: "module-12" }).click();
  await expect(page.getByRole("treeitem", { name: "page-59.md" })).toBeVisible();

  const longTasks = await page.evaluate(
    () => (window as unknown as { longTasks: number[] }).longTasks,
  );
  const worst = Math.max(0, ...longTasks);
  console.log(
    `large repo: tree ${treeMs} ms, indexed ${indexedMs} ms, long tasks ${longTasks.length}, worst ${Math.round(worst)} ms`,
  );
  // Seeding the fixture itself causes long tasks before this point; after opening, no single task may freeze the page.
  expect(worst).toBeLessThan(500);
});
