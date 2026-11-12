import { describe, expect, it } from "vite-plus/test";
import { MemoryFS } from "./memory-fs.ts";
import { contractFixture, describeVirtualFS } from "./virtual-fs.contract.ts";

describeVirtualFS(
  "MemoryFS",
  async () =>
    new MemoryFS(contractFixture.name, contractFixture.files, contractFixture.lastModified),
);

describe("MemoryFS", () => {
  it("accepts a per-file lastModified", async () => {
    const fs = new MemoryFS("x", { "a.md": { content: "a", lastModified: 42 } });
    expect((await fs.stat("a.md")).lastModified).toBe(42);
  });

  it("rejects a file that collides with a directory", () => {
    expect(() => new MemoryFS("x", { "a/b.md": "", a: "" })).toThrow(/not-a-file/);
    expect(() => new MemoryFS("x", { a: "", "a/b.md": "" })).toThrow(/not-a-directory/);
  });

  it("returns blobs that do not alias its storage", async () => {
    const fs = new MemoryFS("x", { "a.bin": new Uint8Array([1, 2]) });
    const first = new Uint8Array(await (await fs.readBlob("a.bin")).arrayBuffer());
    first[0] = 9;
    const second = new Uint8Array(await (await fs.readBlob("a.bin")).arrayBuffer());
    expect(second[0]).toBe(1);
  });
});
