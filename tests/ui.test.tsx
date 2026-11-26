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

function Stack({
  onOpenBook,
  onLess,
  onIndexChange,
  index = 0,
}: {
  onOpenBook?: (k: string) => void;
  onLess?: (k: string) => void;
  onIndexChange?: (i: number) => void;
  index?: number;
}) {
  return (
    <ToastProvider>
      <MemoryRouter>
        <div style={{ height: 600 }}>
          <CardStack
            items={items}
            index={index}
            onIndexChange={onIndexChange ?? (() => {})}
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

describe("Today controls (stack with an open-book button)", () => {
  it("shows thumbs-down, open book and bookmark: no arrows, no ⋯ menu, no swipe-up hint", () => {
    render(<Stack onOpenBook={() => {}} />);
    expect(screen.getByLabelText("Less like this")).toBeInTheDocument();
    expect(screen.getByLabelText("Open the book")).toBeInTheDocument();
    expect(screen.getByLabelText("Save to Notebook")).toBeInTheDocument();
    expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
    expect(screen.queryByText(/swipe up/i)).not.toBeInTheDocument();
  });

  it("the open-book button opens the book for the current card", async () => {
    const onOpenBook = vi.fn();
    render(<Stack onOpenBook={onOpenBook} />);
    await userEvent.click(screen.getByLabelText("Open the book"));
    expect(onOpenBook).toHaveBeenCalledWith("c0");
  });
});

describe("Deck controls (no open-book button)", () => {
  it("has thumbs-down and bookmark only", () => {
    render(<Stack />);
    expect(screen.getByLabelText("Less like this")).toBeInTheDocument();
    expect(screen.getByLabelText("Save to Notebook")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open the book")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
  });
});

describe("Navigation is left/right only", () => {
  // use-gesture reads targetTouches (changedTouches on touchend) and tracks touches by identifier.
  const swipe = (surface: Element, from: [number, number], to: [number, number]) => {
    const t = ([x, y]: [number, number]) => [{ identifier: 1, clientX: x, clientY: y }];
    const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    fireEvent.touchStart(surface, { touches: t(from), targetTouches: t(from) });
    fireEvent.touchMove(surface, { touches: t(mid), targetTouches: t(mid) });
    fireEvent.touchMove(surface, { touches: t(to), targetTouches: t(to) });
    fireEvent.touchEnd(surface, { touches: [], targetTouches: [], changedTouches: t(to) });
  };

  it("the card is draggable sideways, and its scrolling text box allows only vertical pans", () => {
    // Regression: touch-action is not inherited through a scroll container, so without
    // touch-pan-y on the text box the browser cancels sideways swipes that start on the text.
    const { container } = render(<Stack index={1} />);
    const card = container.querySelector(".card-face") as HTMLElement;
    expect(card.style.touchAction).toBe("pan-y");
    expect(container.querySelector('[aria-label="Card text"]')).toHaveClass("touch-pan-y");
  });

  it("swiping up or down does nothing (the card text just scrolls)", () => {
    const onIndexChange = vi.fn();
    const onOpenBook = vi.fn();
    const onLess = vi.fn();
    const { container } = render(
      <Stack onIndexChange={onIndexChange} onOpenBook={onOpenBook} onLess={onLess} index={1} />,
    );
    const surface = container.querySelector(".stack-surface")!;
    swipe(surface, [200, 500], [200, 100]);
    swipe(surface, [200, 100], [200, 500]);
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(onOpenBook).not.toHaveBeenCalled();
    expect(onLess).not.toHaveBeenCalled();
  });

  it("swiping left no longer means 'less like this'", () => {
    const onLess = vi.fn();
    const { container } = render(<Stack onLess={onLess} index={0} />);
    swipe(container.querySelector(".stack-surface")!, [320, 300], [40, 300]);
    expect(onLess).not.toHaveBeenCalled();
  });

  it("arrow keys and the screen-reader buttons still move", async () => {
    const onIndexChange = vi.fn();
    render(<Stack onIndexChange={onIndexChange} index={1} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    await userEvent.click(screen.getByRole("button", { name: "Next card" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: "Previous card" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });
});
