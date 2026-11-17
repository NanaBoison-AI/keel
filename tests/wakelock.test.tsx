import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { IDLE_MS, useKeepAwake } from "../src/lib/wakelock";

class FakeSentinel extends EventTarget {
  released = false;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

let sentinels: FakeSentinel[];
let request: ReturnType<typeof vi.fn>;

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  sentinels = [];
  request = vi.fn(async () => {
    const s = new FakeSentinel();
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error remove the mock between tests
  delete navigator.wakeLock;
});

describe("useKeepAwake", () => {
  it("requests a screen wake lock while enabled and releases it on unmount", async () => {
    const { unmount } = renderHook(() => useKeepAwake(true));
    await flush();
    expect(request).toHaveBeenCalledWith("screen");
    unmount();
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it("does nothing when disabled", async () => {
    renderHook(() => useKeepAwake(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it("does nothing where the API is missing", async () => {
    // @ts-expect-error simulate an unsupported browser
    delete navigator.wakeLock;
    expect(() => renderHook(() => useKeepAwake(true))).not.toThrow();
  });

  it("releases after the idle time and takes the lock again on the next touch", async () => {
    renderHook(() => useKeepAwake(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(IDLE_MS + 1);
    });
    expect(sentinels[0].release).toHaveBeenCalled();
    await act(async () => {
      document.dispatchEvent(new Event("pointerdown"));
    });
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("touching the screen resets the idle timer", async () => {
    renderHook(() => useKeepAwake(true));
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(IDLE_MS - 1000);
      document.dispatchEvent(new Event("touchstart"));
      vi.advanceTimersByTime(IDLE_MS - 1000);
    });
    expect(sentinels[0].release).not.toHaveBeenCalled();
  });

  it("re-acquires when the page becomes visible again (the browser drops the lock when hidden)", async () => {
    renderHook(() => useKeepAwake(true));
    await flush();
    await act(async () => {
      await sentinels[0].release(); // what the browser does when the page is hidden
    });
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("survives a denied request", async () => {
    request.mockRejectedValueOnce(new Error("NotAllowedError"));
    expect(() => renderHook(() => useKeepAwake(true))).not.toThrow();
    await flush();
  });
});
