import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { ThemeProvider, useTheme } from "../../src/theme/ThemeProvider";
import { ThemeToggle } from "../../src/components/ThemeToggle";

function ThemeConsumer({ children }: { children?: ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <p data-testid="active-theme">{resolvedTheme}</p>
      <button type="button" onClick={() => setTheme("light")}>light</button>
      <button type="button" onClick={() => setTheme("dark")}>dark</button>
      {children}
    </div>
  );
}

describe("ThemeProvider", () => {
  const matchMediaMock = {
    matches: true,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue(matchMediaMock),
    });
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("persists selected theme and restores it on next mount", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeConsumer />
      </ThemeProvider>,
    );

    const activeTheme = screen.getByTestId("active-theme");
  expect(activeTheme.textContent).toBe("dark");

    const selectLight = screen.getByRole("radio", { name: "Light" });
    fireEvent.click(selectLight);

    expect(localStorage.getItem("clipnotes-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    cleanup();

    const matchMediaLightMock = {
      ...matchMediaMock,
      matches: true,
    } as unknown as MediaQueryList;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue(matchMediaLightMock),
    });

    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeConsumer />
      </ThemeProvider>,
    );

    const nextActiveTheme = screen.getByTestId("active-theme");
    expect(nextActiveTheme.textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
