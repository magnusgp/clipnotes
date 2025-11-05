import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";

import { ThemeProvider } from "../../src/theme/ThemeProvider";
import { ToastProvider } from "../../src/components/toast/ToastProvider";
import { FeatureFlagProvider, DEFAULT_FLAGS } from "../../src/flags";
import type { FeatureFlagMap } from "../../src/types/config";

interface ProviderOptions {
  queryClient?: QueryClient;
  featureFlags?: FeatureFlagMap;
  withFeatureFlags?: boolean;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function withProviders(
  children: ReactNode,
  options: ProviderOptions = {},
): { element: ReactNode; queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const flags = { ...DEFAULT_FLAGS, ...(options.featureFlags ?? {}) };
  const withFeatureFlags = options.withFeatureFlags ?? true;

  return {
    queryClient,
    element: (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {withFeatureFlags ? (
            <FeatureFlagProvider initialFlags={flags}>
              <ToastProvider>{children}</ToastProvider>
            </FeatureFlagProvider>
          ) : (
            <ToastProvider>{children}</ToastProvider>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    ),
  };
}

export function renderWithProviders(
  ui: ReactNode,
  options: ProviderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { element, queryClient } = withProviders(ui, options);
  return {
    queryClient,
    ...render(element),
  };
}
