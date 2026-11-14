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

it("done screen offers a way back to the last card", async () => {
  const { DoneScreen } = await import("../src/app/Today");
  const { MemoryRouter } = await import("react-router");
  const { fireEvent } = await import("@testing-library/react");
  let back = 0;
  render(
    <MemoryRouter>
      <DoneScreen onBack={() => back++} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to the last card" }));
  expect(back).toBe(1);
});
