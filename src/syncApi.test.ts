import { afterEach, expect, it, vi } from "vitest";
import {
  checkSyncService,
  createRemote,
  createSyncConnection,
  syncError,
} from "./syncApi";
afterEach(() => vi.unstubAllGlobals());
it("connects without AbortSignal.timeout, including on older Safari, and trims pasted setup codes", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
    throw Error("Unavailable in this Safari");
  });
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect((options.headers as Record<string, string>)["X-Setup-Key"]).toBe(
      "synthetic-setup-key-123456789012345",
    );
    return Response.json({ revision: 1 }, { status: 201 });
  });
  vi.stubGlobal("fetch", fetcher);
  try {
    await createRemote(
      createSyncConnection("https://tezisce-sync.test.workers.dev"),
      "  synthetic-setup-key-123456789012345\n",
      { version: 1, iv: "AAAAAAAAAAAAAAAA", data: "AAAAAAAAAAAAAAAAAAAAAA" },
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(timeout).not.toHaveBeenCalled();
  } finally {
    timeout.mockRestore();
  }
});
it("turns Safari network failures into a visible recovery message and verifies the actual service", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("Load failed");
  });
  await expect(
    checkSyncService("https://tezisce-sync.test.workers.dev"),
  ).rejects.toThrow(/Safari.*povezave/);
  vi.stubGlobal("fetch", async () =>
    Response.json({ service: "tezisce-encrypted-sync", version: 1 }),
  );
  await expect(
    checkSyncService("https://tezisce-sync.test.workers.dev"),
  ).resolves.toBeUndefined();
  vi.stubGlobal(
    "fetch",
    async () => new Response("Not found", { status: 404 }),
  );
  await expect(
    checkSyncService("https://tezisce-sync.test.workers.dev"),
  ).rejects.toThrow(/HTTP 404/);
  expect(syncError(new DOMException("Timeout", "AbortError"))).toMatch(
    /20 sekundah/,
  );
});
