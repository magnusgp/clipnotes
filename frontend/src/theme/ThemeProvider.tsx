import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "clipnotes-theme";
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  prefersReducedMotion: boolean;
  setTheme: (theme: ThemeSetting) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): ThemeSetting | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeSetting(stored)) {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light";
}

function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty("color-scheme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  const themeColorMeta = document.querySelector<HTMLMetaElement>("#theme-color");
  if (themeColorMeta) {
    themeColorMeta.content = theme === "dark" ? "#020617" : "#f8fafc";
  }

  const lightFavicon = document.getElementById("favicon-light") as HTMLLinkElement | null;
  const darkFavicon = document.getElementById("favicon-dark") as HTMLLinkElement | null;
  if (lightFavicon && darkFavicon) {
    if (theme === "dark") {
      darkFavicon.media = "all";
      lightFavicon.media = "not all";
    } else {
      lightFavicon.media = "all";
      darkFavicon.media = "not all";
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>(() => readStoredTheme() ?? "system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(MOTION_QUERY).matches;
  });

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.reducedMotion = prefersReducedMotion ? "true" : "false";
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const colorSchemeMatcher = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleSchemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(colorSchemeMatcher.matches ? "dark" : "light");

    if (typeof colorSchemeMatcher.addEventListener === "function") {
      colorSchemeMatcher.addEventListener("change", handleSchemeChange);
      return () => {
        colorSchemeMatcher.removeEventListener("change", handleSchemeChange);
      };
    }

    colorSchemeMatcher.addListener(handleSchemeChange);
    return () => {
      colorSchemeMatcher.removeListener(handleSchemeChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const motionMatcher = window.matchMedia(MOTION_QUERY);
    const handleMotionChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(motionMatcher.matches);

    if (typeof motionMatcher.addEventListener === "function") {
      motionMatcher.addEventListener("change", handleMotionChange);
      return () => {
        motionMatcher.removeEventListener("change", handleMotionChange);
      };
    }

    motionMatcher.addListener(handleMotionChange);
    return () => {
      motionMatcher.removeListener(handleMotionChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // no-op
    }
  }, [theme]);

  const setTheme = useCallback((value: ThemeSetting) => {
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((previous) => {
      const current = previous === "system" ? systemTheme : previous;
      return current === "dark" ? "light" : "dark";
    });
  }, [systemTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, prefersReducedMotion, setTheme, toggleTheme }),
    [theme, resolvedTheme, prefersReducedMotion, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
