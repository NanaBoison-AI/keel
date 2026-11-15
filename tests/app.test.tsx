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

it("Today: the done screen lets you go back to the last card", async () => {
  const { Today } = await import("../src/app/Today");
  const { ToastProvider } = await import("../src/components/Toast");
  const { MemoryRouter } = await import("react-router");
  const { localDate } = await import("../src/lib/hooks");
  const { fireEvent } = await import("@testing-library/react");
  await db.delete();
  await db.open();
  const card = (n: number) => ({
    id: `bk-0${n}`,
    pillar: "mind" as const,
    format: "idea" as const,
    hook: `Hook number ${n} here`,
    body: "A body that is comfortably long enough.",
    mixable: true,
    version: 1,
  });
  const pack = {
    schemaVersion: 1 as const,
    id: "bk",
    type: "standalone" as const,
    title: "BK",
    pillar: "mind" as const,
    origin: "source" as const,
    publicDomain: false,
    summary: "s",
    estMinutes: 1,
    version: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    cards: [card(1), card(2)],
  };
  await db.packs.put({ id: "bk", version: 1, json: pack });
  await db.daily.put({
    date: localDate(),
    cardIds: ["bk-01", "bk-02"],
    packIds: ["bk", "bk"],
    position: 2,
  });
  render(
    <ToastProvider>
      <MemoryRouter>
        <Today />
      </MemoryRouter>
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("You're done for today.")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Back to the last card" }));
  await waitFor(() => expect(screen.getByText("Hook number 2 here")).toBeInTheDocument());
});
