import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, it } from "vitest";
import { App } from "../src/app/App";
import { db } from "../src/lib/db";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
});

it("renders the shell and an empty state before content arrives", async () => {
  await db.delete();
  await db.open();
  globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
  render(<App />);
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Getting your reading ready/)).toBeInTheDocument());
});
