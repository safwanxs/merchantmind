import { describe, expect, it } from "vitest";
import { InMemoryStore } from "./index";

describe("InMemoryStore atomic operations", () => {
  it("prevents concurrent single-use consumption", async () => {
    const store = new InMemoryStore();
    const results = await Promise.all(Array.from({ length: 20 }, () => store.setIfNotExists("token", true)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("keeps concurrent increments exact", async () => {
    const store = new InMemoryStore();
    await Promise.all(Array.from({ length: 100 }, () => store.increment("budget", 50)));
    expect(await store.get<number>("budget")).toBe(5000);
  });
});
