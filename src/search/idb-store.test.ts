import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { DB_NAME, closeLecternDb } from "../storage/db.ts";
import { IdbSearchStore } from "./idb-store.ts";

afterEach(async () => {
  await closeLecternDb();
  indexedDB.deleteDatabase(DB_NAME);
});

describe("IdbSearchStore", () => {
  it("keeps indexes and texts per folder", async () => {
    const store = new IdbSearchStore();
    await store.save("a", { version: 1, index: "{}", docs: {} });
    await store.putTexts("a", [
      { path: "x.md", text: "one" },
      { path: "y.md", text: "two" },
    ]);
    await store.putTexts("b", [{ path: "x.md", text: "other" }]);
    expect(await store.load("a")).toEqual({ version: 1, index: "{}", docs: {} });
    expect(await store.load("b")).toBeNull();
    expect(await store.getText("a", "x.md")).toBe("one");
    expect(await store.getText("b", "x.md")).toBe("other");
    await store.deleteTexts("a", ["x.md"]);
    expect(await store.getText("a", "x.md")).toBeNull();
    expect(await store.getText("a", "y.md")).toBe("two");
  });
});
