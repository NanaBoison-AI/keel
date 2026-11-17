import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { useState } from "react";
import { CardStack, type StackItem } from "../src/components/CardStack";
import { Markdown } from "../src/components/Markdown";
import { ToastProvider } from "../src/components/Toast";

beforeEach(() => {
  cleanup();
  // jsdom lacks these
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

const items: StackItem[] = [0, 1, 2].map((i) => ({
  key: `c${i}`,
  view: {
    card: {
      hook: `Hook number ${i}`,
      body: `Body number ${i}`,
      deeper: i === 0 ? "The deeper text." : undefined,
    },
    pillar: "mind",
    packId: "p",
    packTitle: "Pack",
  },
}));

function Harness(props: {
  onFinish?: () => void;
  onLess?: (k: string) => void;
  onSave?: (k: string) => void;
}) {
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  return (
    <ToastProvider>
      <MemoryRouter>
        <div style={{ height: 600 }}>
          <CardStack
            items={items}
            index={i}
            onIndexChange={setI}
            onFinish={props.onFinish ?? (() => {})}
            isSaved={(k) => saved.has(k)}
            onToggleSave={(k) => {
              props.onSave?.(k);
              setSaved((s) => new Set(s).add(k));
            }}
            onLess={props.onLess ?? (() => {})}
          />
        </div>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe("CardStack", () => {
  it("navigates with the visible buttons and finishes", async () => {
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);
    expect(screen.getByText("Hook number 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous card" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Previous card" }));
    await waitFor(() => expect(screen.getByText("Hook number 0")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => screen.getByText("Hook number 1"));
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => screen.getByText("Hook number 2"));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("expands deeper text with Read more", async () => {
    render(<Harness />);
    expect(screen.queryByText("The deeper text.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(screen.getByText("The deeper text.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText("The deeper text.")).not.toBeInTheDocument();
  });

  it("saves via the bookmark button", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    await userEvent.click(screen.getByLabelText("Save to Notebook"));
    expect(onSave).toHaveBeenCalledWith("c0");
    expect(screen.getByLabelText("Remove from Notebook")).toHaveAttribute("aria-pressed", "true");
  });

  it("thumbs-down is 'Less like this' and advances", async () => {
    const onLess = vi.fn();
    render(<Harness onLess={onLess} />);
    await userEvent.click(screen.getByLabelText("Less like this"));
    expect(onLess).toHaveBeenCalledWith("c0");
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
  });
});

describe("Markdown", () => {
  it("renders bold, italic and lists", () => {
    const { container } = render(
      <Markdown text={"A **bold** and *italic* line\n\n1. one\n2. two\n\n- a\n- b"} />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
  });
});

describe("Mentor badge", () => {
  const view = (origin: "ai" | "source") => ({
    card: {
      hook: "A hook",
      body: "Body",
      source: origin === "ai" ? undefined : { ref: "Book 2, §1" },
    },
    pillar: "mentor" as const,
    packId: "p",
    packTitle: "Lesson",
    origin,
  });
  it("shows 'Written by Claude' for ai cards and the ref for book cards", async () => {
    const { CardFace } = await import("../src/components/Card");
    render(
      <MemoryRouter>
        <CardFace view={view("ai")} expanded={false} onToggleExpand={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Written by Claude")).toBeInTheDocument();
    cleanup();
    render(
      <MemoryRouter>
        <CardFace view={view("source")} expanded={false} onToggleExpand={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Written by Claude")).not.toBeInTheDocument();
    expect(screen.getByText("Book 2, §1")).toBeInTheDocument();
  });
});

describe("CardStack in Today mode", () => {
  function TodayHarness({
    onLess,
    onOpenBook,
  }: {
    onLess?: (k: string) => void;
    onOpenBook?: (k: string) => void;
  }) {
    const [i, setI] = useState(0);
    return (
      <ToastProvider>
        <MemoryRouter>
          <div style={{ height: 600 }}>
            <CardStack
              mode="today"
              items={items}
              index={i}
              onIndexChange={setI}
              onFinish={() => {}}
              isSaved={() => false}
              onToggleSave={() => {}}
              onLess={onLess ?? (() => {})}
              onOpenBook={onOpenBook}
            />
          </div>
        </MemoryRouter>
      </ToastProvider>
    );
  }

  it("shows thumbs-down and bookmark, with no ⋯ menu", () => {
    render(<TodayHarness />);
    expect(screen.getByLabelText("Less like this")).toBeInTheDocument();
    expect(screen.getByLabelText("Save to Notebook")).toBeInTheDocument();
    expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
  });

  it("thumbs-down records 'less' and advances", async () => {
    const onLess = vi.fn();
    render(<TodayHarness onLess={onLess} />);
    await userEvent.click(screen.getByLabelText("Less like this"));
    expect(onLess).toHaveBeenCalledWith("c0");
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
  });

  it("keeps screen-reader/keyboard access to next, previous and the book", async () => {
    const onOpenBook = vi.fn();
    render(<TodayHarness onOpenBook={onOpenBook} />);
    await userEvent.click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Previous card" }));
    await waitFor(() => expect(screen.getByText("Hook number 0")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Open the book" }));
    expect(onOpenBook).toHaveBeenCalledWith("c0");
  });

  it("arrow keys move left and right", async () => {
    render(<TodayHarness />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByText("Hook number 0")).toBeInTheDocument());
  });
});

describe("Today swipe-up hint", () => {
  const renderStack = (showOpenHint: boolean, mode: "today" | "deck" = "today") =>
    render(
      <ToastProvider>
        <MemoryRouter>
          <div style={{ height: 600 }}>
            <CardStack
              mode={mode}
              showOpenHint={showOpenHint}
              items={items}
              index={0}
              onIndexChange={() => {}}
              onFinish={() => {}}
              isSaved={() => false}
              onToggleSave={() => {}}
              onLess={() => {}}
            />
          </div>
        </MemoryRouter>
      </ToastProvider>,
    );
  it("shows the hint when asked", () => {
    renderStack(true);
    expect(screen.getByText("Swipe up to read the book")).toBeInTheDocument();
  });
  it("hides it otherwise, and never in deck mode", () => {
    renderStack(false);
    expect(screen.queryByText("Swipe up to read the book")).not.toBeInTheDocument();
    cleanup();
    renderStack(true, "deck");
    expect(screen.queryByText("Swipe up to read the book")).not.toBeInTheDocument();
  });
});

describe("CardStack in deck mode", () => {
  it("has thumbs-down and bookmark but no arrow buttons or ⋯ menu", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Less like this")).toBeInTheDocument();
    expect(screen.getByLabelText("Save to Notebook")).toBeInTheDocument();
    expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next card")).not.toBeInTheDocument(); // only a screen-reader button remains
    expect(screen.queryByText("Open the book")).not.toBeInTheDocument();
  });
});

describe("vertical touch swipes keep working after the first card change", () => {
  const swipeUp = (surface: Element) => {
    fireEvent.touchStart(surface, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchMove(surface, { touches: [{ clientX: 200, clientY: 250 }] });
    fireEvent.touchMove(surface, { touches: [{ clientX: 200, clientY: 150 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 200, clientY: 150 }] });
  };
  it("swipe up moves to the next card, then to the one after (the leaving card must not clear the scroll ref)", async () => {
    const { container } = render(<Harness />);
    const surface = container.querySelector(".stack-surface")!;
    expect(screen.getByText("Hook number 0")).toBeInTheDocument();
    swipeUp(surface);
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
    // let the outgoing card finish its exit animation and unmount
    await waitFor(() => expect(screen.queryByText("Hook number 0")).not.toBeInTheDocument());
    swipeUp(surface);
    await waitFor(() => expect(screen.getByText("Hook number 2")).toBeInTheDocument());
  });
});
