import { expect, test, type Page } from "@playwright/test";
import { openFixture, repoFixture, stubFolderPicker } from "./fixture.ts";

const wide = "w".repeat(200);
const files = {
  ...repoFixture,
  "reflow.md": `# ${wide}\n\nhttps://example.com/${wide}\n\nInline \`src/${wide}.ts\` here.\n`,
  "wide.md": `# Wide\n\n\`\`\`ts\nconst line = "${wide}";\n\`\`\`\n\n| a |\n|---|\n| ${wide} |\n`,
  "anchors.md": `# Anchors\n\n[First link](README.md)\n\n${"Filler.\n\n".repeat(60)}## Target\n\n[Second link](README.md)\n`,
  "from.md": "# From\n\n[To the target](anchors.md#target)\n",
  ...Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [`many/doc${i}.md`, `# Doc ${i}\n\nneedle ${i}\n`]),
  ),
};

async function openFiles(page: Page, name = "repo") {
  await stubFolderPicker(page, files, name);
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).click();
  await page.getByRole("heading", { level: 1, name: "Repo" }).waitFor();
}

const field = (page: Page) => page.getByRole("combobox", { name: "Search the documentation" });
const main = (page: Page) => page.locator("main#main");
/** The page itself scrolls sideways. */
const overflows = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe("focus follows what the reader does", () => {
  test("opening a folder lands on the document, named after it", async ({ page }) => {
    await openFixture(page);
    await expect(main(page)).toBeFocused();
    await expect(main(page)).toHaveAttribute("aria-label", "Repo");
  });

  test("closing a folder lands on the home screen's main action", async ({ page }) => {
    await openFixture(page);
    await page.getByRole("button", { name: "repo" }).click();
    await page.getByRole("button", { name: "Close folder" }).click();
    await expect(page.getByRole("button", { name: "Open a folder…" })).toBeFocused();
  });

  test("forgetting the last folder keeps the focus on the screen", async ({ page }) => {
    await openFixture(page);
    await page.getByRole("button", { name: "repo" }).click();
    await page.getByRole("button", { name: "Close folder" }).click();
    await page.getByRole("button", { name: "Forget repo" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Forget repo" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open a folder…" })).toBeFocused();
  });

  test("zen mode keeps the focus when it hides or removes what held it", async ({ page }) => {
    await openFixture(page);
    const toggle = page.getByRole("button", { name: /Zen mode/ });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(main(page)).toBeFocused();
    await page.getByRole("button", { name: /Leave zen mode/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(toggle).toBeFocused();
  });

  test("a link to another document's section lands on that section", async ({ page }) => {
    await openFiles(page);
    await page.goto("/read/repo/from.md");
    await page.getByRole("link", { name: "To the target" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Target" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Second link" })).toBeFocused();
  });

  for (const [name, trigger, panel] of [
    ["Reading width menu", { name: "Reading width" }, "#width-menu"],
    ["folder menu", { name: "repo" }, "#folder-menu"],
  ] as const) {
    test(`the ${name} closes when the focus leaves it`, async ({ page }) => {
      await openFixture(page);
      await page.getByRole("button", trigger).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(panel)).toBeVisible();
      await page.getByRole("button", { name: /Zen mode/ }).focus();
      await expect(page.locator(panel)).toHaveCount(0);
    });
  }
});

test.describe("search and filter", () => {
  test("the selected result stays in view and the count is announced", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 420 });
    await openFiles(page);
    await field(page).fill("needle");
    const list = page.getByRole("listbox");
    await expect(list.getByRole("option")).not.toHaveCount(0);
    await expect(page.locator(".lc-search").getByRole("status")).toHaveText(/\d+ results?\./);
    for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowDown");
    const selected = list.locator('[aria-selected="true"]');
    await expect(selected).toBeInViewport({ ratio: 1 });
    const inside = await selected.evaluate((el) => {
      const box = el.closest('[role="listbox"]')!.getBoundingClientRect();
      const { top, bottom } = el.getBoundingClientRect();
      return top >= box.top && bottom <= box.bottom;
    });
    expect(inside).toBe(true);
  });

  test("an empty search is announced", async ({ page }) => {
    await openFixture(page);
    await field(page).fill("zzqqxxnothing");
    await expect(page.locator(".lc-search").getByRole("status")).toHaveText(
      "No document matches “zzqqxxnothing”.",
    );
  });

  test("Enter does nothing once the results are closed", async ({ page }) => {
    await openFixture(page);
    await field(page).fill("installer");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.keyboard.press("Enter");
    await expect(field(page)).toBeFocused();
    await expect(page).toHaveURL(/README\.md$/);
  });

  test("picking a result lands on the document", async ({ page }) => {
    await openFixture(page);
    await field(page).fill("installer");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Guide" })).toBeVisible();
    await expect(main(page)).toBeFocused();
  });

  test("the tree filter announces what it found", async ({ page }) => {
    await openFixture(page);
    const status = page.locator(".lc-tree").getByRole("status");
    await page.getByRole("searchbox", { name: "Filter by name" }).fill("guide");
    await expect(status).toHaveText("1 document found.");
    await page.getByRole("searchbox", { name: "Filter by name" }).fill("zzz");
    await expect(status).toHaveText("No document name matches “zzz”.");
  });
});

test.describe("keyboard shortcuts need a modifier (WCAG 2.1.4)", () => {
  test("plain z and / do nothing", async ({ page }) => {
    await openFixture(page);
    await page.locator("article").click();
    await page.keyboard.press("z");
    await page.keyboard.press("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(field(page)).not.toBeFocused();
  });

  test("Ctrl+K reaches the search, even from another field", async ({ page }) => {
    await openFixture(page);
    await page.getByRole("searchbox", { name: "Filter by name" }).focus();
    await page.keyboard.press("Control+k");
    await expect(field(page)).toBeFocused();
  });

  test("Alt+Z enters and leaves zen mode", async ({ page }) => {
    await openFixture(page);
    await page.keyboard.press("Alt+z");
    await expect(page.getByRole("banner")).toBeHidden();
    await page.keyboard.press("Alt+z");
    await expect(page.getByRole("banner")).toBeVisible();
  });
});

test("wide code blocks and tables scroll from the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 700 });
  await openFiles(page);
  await page.goto("/read/repo/wide.md");
  await page.locator(".lc-code button").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".lc-code pre")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".lc-table-scroll")).toBeFocused();
});

test("the current row and filter matches do not rest on a faint background", async ({ page }) => {
  await openFixture(page);
  const row = page.getByRole("treeitem", { name: "README.md" });
  await expect(row).toHaveCSS("border-left-width", "2px");
  const [bar, accent] = await row.evaluate((el) => [
    getComputedStyle(el).borderLeftColor,
    getComputedStyle(el.querySelector(".lc-ic")!).color,
  ]);
  expect(bar).toBe(accent);
  await page.getByRole("searchbox", { name: "Filter by name" }).fill("read");
  await expect(page.locator(".lc-tree mark").first()).toHaveCSS(
    "text-decoration-line",
    "underline",
  );
});

test("a missing document is announced", async ({ page }) => {
  await openFixture(page);
  await page.goto("/read/repo/nope.md");
  await expect(page.getByRole("alert")).toContainText("No file at");
});

test.describe("zoom and small windows", () => {
  // 1280 x 1024 at 400 %.
  const zoomed = { width: 320, height: 256 };

  test("long words wrap instead of scrolling the page sideways", async ({ page }) => {
    await openFiles(page);
    await page.setViewportSize(zoomed);
    await page.goto("/read/repo/reflow.md");
    await expect(page.locator("article h1")).toBeVisible();
    expect(await overflows(page)).toBe(false);
  });

  test("the folder menu stays on screen", async ({ page }) => {
    await openFixture(page);
    await page.setViewportSize(zoomed);
    await page.locator(".lc-folders-menu > button").click();
    const box = (await page.locator("#folder-menu").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(zoomed.width);
  });

  test("the header scrolls away when the window is short", async ({ page }) => {
    await openFixture(page);
    await page.setViewportSize(zoomed);
    await page.evaluate(() => scrollTo(0, 800));
    await expect(page.getByRole("banner")).not.toBeInViewport();
  });

  test("the search field stays usable at 320 px, whatever else is in the header", async ({
    page,
  }) => {
    await openFixture(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => field(page).evaluate((el) => el.closest(".lc-search")!.clientWidth))
      .toBeGreaterThanOrEqual(128);
    expect(await overflows(page)).toBe(false);
  });

  for (const width of [480, 700, 1000]) {
    test(`a long folder name keeps the header on one line at ${width} px`, async ({ page }) => {
      await openFiles(page, "a-rather-long-folder-name-for-documentation-site");
      await page.setViewportSize({ width, height: 700 });
      await expect
        .poll(() => page.getByRole("banner").evaluate((el: HTMLElement) => el.offsetHeight))
        .toBeLessThan(70);
      expect(await overflows(page)).toBe(false);
    });
  }

  test("an HTML document keeps a usable height under the tree", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 500 });
    await openFixture(page);
    await page.goto("/read/repo/site/index.html");
    await expect(page.getByRole("button", { name: "Run scripts" })).toBeVisible();
    const box = (await page.locator("iframe").boundingBox())!;
    expect(box.height).toBeGreaterThan(300);
  });
});

test.describe("the tree's width without dragging (WCAG 2.5.7)", () => {
  const trigger = (page: Page) => page.getByRole("button", { name: "Tree options" });
  const tree = (page: Page) =>
    page.locator(".lc-tree").evaluate((el) => el.getBoundingClientRect().width);

  test("Wider and Narrower resize it and return to the menu's button", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await openFixture(page);
    const start = await tree(page);
    await trigger(page).click();
    await page.getByRole("button", { name: "Wider" }).click();
    await expect.poll(() => tree(page)).toBe(start + 48);
    await expect(trigger(page)).toBeFocused();
    await trigger(page).click();
    await page.getByRole("button", { name: "Narrower" }).click();
    await expect.poll(() => tree(page)).toBe(start);
  });

  test("they stop at the limits", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await openFixture(page);
    for (let i = 0; i < 2; i++) {
      await trigger(page).click();
      await page.getByRole("button", { name: "Narrower" }).click();
    }
    await trigger(page).click();
    await expect(page.getByRole("button", { name: "Narrower" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Wider" })).toBeEnabled();
  });

  test("they are gone when the tree sits above the document", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 700 });
    await openFixture(page);
    await trigger(page).click();
    await expect(page.getByRole("button", { name: "Expand all" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wider" })).toBeHidden();
  });
});

test("the splitter is a 24 px target", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openFixture(page);
  const box = (await page.getByRole("separator").boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
});
