import { test, expect } from "@playwright/test";
import { createMockAdapter } from "../lib/mock/adapter";
import { previewSeed } from "../app/dev/design-system/fixtures";
import { parseNaira, formatNaira } from "../lib/format";

test("mock ownership, clone boundaries, stale preference conflict and reset", async () => {
  const a = createMockAdapter(previewSeed, { actorId: "demo-user-a", latencyMs: 0 });
  const b = createMockAdapter(previewSeed, { actorId: "demo-user-b", latencyMs: 0 });
  expect((await b.listMemories("char-amara")).data?.items).toEqual([]);
  expect((await b.listPaymentHistory()).data?.items).toEqual([]);
  expect((await a.listConversations()).data?.items.every((item) => item.userId === "demo-user-a")).toBe(true);
  const first = await a.getCurrentUser();
  if (first.error) throw new Error(first.error.message);
  first.data.displayName = "Changed outside adapter";
  expect((await a.getCurrentUser()).data?.displayName).toBe("Dami");
  const input = { displayName: "Pampam", preferences: first.data.preferences, expectedVersion: 1 };
  expect((await a.updatePreferences(input)).data?.version).toBe(2);
  expect((await a.updatePreferences(input)).error?.code).toBe("CONFLICT");
  expect((await b.getCurrentUser()).data?.displayName).toBe("Alex");
  a.reset();
  expect((await a.getCurrentUser()).data?.displayName).toBe("Dami");
});

test("signed-out and underage actors cannot use mock discovery", async () => {
  expect((await createMockAdapter(previewSeed, { actorId: null, latencyMs: 0 }).listCharacters()).error?.code).toBe("UNAUTHENTICATED");
  const seed = structuredClone(previewSeed);
  seed.users[0].adultAccessState = "blocked";
  expect((await createMockAdapter(seed, { actorId: "demo-user-a", latencyMs: 0 }).listCharacters()).error?.code).toBe("ADULT_ACCESS_BLOCKED");
  const characters = await createMockAdapter(previewSeed, { actorId: "demo-user-a", latencyMs: 0 }).listCharacters();
  expect(characters.data?.items).toHaveLength(8);
  expect(characters.data?.items[0]).not.toHaveProperty("instructions");
  expect(characters.data?.items[0]).not.toHaveProperty("samples");
});

test("money parser preserves kobo and rejects ambiguous or unsafe amounts", () => {
  expect(parseNaira("5000.01")).toBe(500001);
  expect(parseNaira("0.10")).toBe(10);
  for (const invalid of ["-1", "0", "1.234", "5,000", "1e5", "NaN", "Infinity", "9007199254740991"]) expect(parseNaira(invalid)).toBeNull();
  expect(formatNaira(500001)).toContain("5,000.01");
  expect(() => formatNaira(1.5)).toThrow();
});
