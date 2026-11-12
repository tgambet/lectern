import { expect, it } from "vite-plus/test";
import { marksToJson } from "./export.ts";

it("exports what a reader wrote, without internal ids", () => {
  const out = JSON.parse(
    marksToJson(
      "repo",
      [{ folderId: "f", path: "a.md", title: "A", createdAt: 0 }],
      [
        {
          id: "secret-id",
          folderId: "f",
          path: "a.md",
          quote: { exact: "quoted", prefix: "p", suffix: "s" },
          text: "my note",
          createdAt: 0,
          updatedAt: 1000,
        },
      ],
      0,
    ),
  ) as Record<string, unknown>;
  expect(out).toEqual({
    lectern: 1,
    folder: "repo",
    exportedAt: "1970-01-01T00:00:00.000Z",
    bookmarks: [{ path: "a.md", title: "A", createdAt: "1970-01-01T00:00:00.000Z" }],
    notes: [
      {
        path: "a.md",
        quote: "quoted",
        text: "my note",
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:01.000Z",
      },
    ],
  });
});
