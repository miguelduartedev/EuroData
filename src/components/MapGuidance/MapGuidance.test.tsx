import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { MAP_EXPLORATION_HINT_DISMISSAL_KEY, MapGuidance } from "./MapGuidance";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

it("renders the two-step map exploration hint without the obsolete comparison action", () => {
  render(<MapGuidance />);

  expect(screen.getByRole("heading", { name: "Explore the map" })).toBeInTheDocument();
  expect(screen.getByText("Select a region")).toBeInTheDocument();
  expect(screen.getByText("View its value, ranking and history.")).toBeInTheDocument();
  expect(screen.getByText("Select another region")).toBeInTheDocument();
  expect(screen.getByText("Compare both regions side by side.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Compare regions" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dismiss tip" })).toBeInTheDocument();
});

it("dismisses immediately and persists the choice for subsequent visits", () => {
  const firstView = render(<MapGuidance />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));

  expect(screen.queryByRole("heading", { name: "Explore the map" })).not.toBeInTheDocument();
  expect(window.localStorage.getItem(MAP_EXPLORATION_HINT_DISMISSAL_KEY)).toBe("true");

  firstView.unmount();
  render(<MapGuidance />);
  expect(screen.queryByRole("heading", { name: "Explore the map" })).not.toBeInTheDocument();
});

it("shows again after the stored dismissal has been cleared", () => {
  window.localStorage.setItem(MAP_EXPLORATION_HINT_DISMISSAL_KEY, "true");
  const firstView = render(<MapGuidance />);
  expect(screen.queryByRole("heading", { name: "Explore the map" })).not.toBeInTheDocument();

  firstView.unmount();
  window.localStorage.clear();
  render(<MapGuidance />);
  expect(screen.getByRole("heading", { name: "Explore the map" })).toBeInTheDocument();
});
