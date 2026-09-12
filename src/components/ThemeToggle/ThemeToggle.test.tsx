import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

it("defaults to light mode and persists an accessible dark-mode toggle", () => {
  render(<ThemeToggle />);

  const toggle = screen.getByRole("button", { name: "Switch to dark theme" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(document.documentElement).not.toHaveClass("dark");

  fireEvent.click(toggle);

  expect(screen.getByRole("button", { name: "Switch to light theme" })).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement).toHaveClass("dark");
  expect(window.localStorage.getItem("nordic-life-theme")).toBe("dark");
});
