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
    expect(screen.getByLabelText("Previous card")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Next card"));
    await waitFor(() => expect(screen.getByText("Hook number 1")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Previous card"));
    await waitFor(() => expect(screen.getByText("Hook number 0")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Next card"));
    await waitFor(() => screen.getByText("Hook number 1"));
    fireEvent.click(screen.getByLabelText("Next card"));
    await waitFor(() => screen.getByText("Hook number 2"));
    fireEvent.click(screen.getByLabelText("Finish"));
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

  it("'Less like this' is reachable from the menu and advances", async () => {
    const onLess = vi.fn();
    render(<Harness onLess={onLess} />);
    await userEvent.click(screen.getByLabelText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Less like this" }));
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
