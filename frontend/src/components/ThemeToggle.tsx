import { useMemo } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "../theme/ThemeProvider";
import { cn } from "../utils/cn";

const options = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const activeLabel = useMemo(() => {
    const activeOption = options.find((option) => option.value === theme);
    return activeOption ? activeOption.label : "System";
  }, [theme]);

  return (
    <div className={cn("inline-flex flex-col items-end gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Theme</span>
      <div
        role="radiogroup"
        aria-label="Appearance theme"
        className="relative flex items-center gap-1 rounded-full border border-border-glass/80 bg-surface-glass/80 p-1 shadow-glass backdrop-blur-xl"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-glass/30",
                isActive
                  ? "bg-accent-primary/15 text-text-accent shadow-[0_0_0_1px_rgba(14,165,233,0.45)]"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[0.65rem] uppercase tracking-wide text-text-secondary/70">
        Active: <span className="font-semibold text-text-accent">{activeLabel === "System" ? resolvedTheme : activeLabel}</span>
      </p>
    </div>
  );
}
