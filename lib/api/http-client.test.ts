import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/http-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest session refresh", () => {
  it("shares one refresh request across concurrent 401 responses", async () => {
    let protectedRequestCount = 0;
    let refreshRequestCount = 0;
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith("/api/auth/refresh")) {
        refreshRequestCount += 1;
        await refreshGate;
        return new Response(null, { status: 204 });
      }
      if (path.endsWith("/api/first") || path.endsWith("/api/second")) {
        protectedRequestCount += 1;
        if (protectedRequestCount <= 2) {
          return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
        }
        return Response.json({ ok: true });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const requests = Promise.all([
      apiRequest<{ ok: boolean }>("/api/first"),
      apiRequest<{ ok: boolean }>("/api/second"),
    ]);

    await vi.waitFor(() => {
      expect(protectedRequestCount).toBe(2);
      expect(refreshRequestCount).toBe(1);
    });
    releaseRefresh?.();

    await expect(requests).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshRequestCount).toBe(1);
    expect(protectedRequestCount).toBe(4);
  });
});
