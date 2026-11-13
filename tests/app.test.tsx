import { render, screen } from "@testing-library/react";
import { App } from "../src/app/App";

it("renders", () => {
  render(<App />);
  expect(screen.getByText("Keel")).toBeInTheDocument();
});
