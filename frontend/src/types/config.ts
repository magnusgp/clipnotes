export interface ModelParams {
  fps: number;
  temperature: number;
  max_tokens?: number | null;
  default_prompt?: string | null;
}

export type FeatureFlagKey = "ENABLE_LIVE_MODE" | "ENABLE_GRAPH_VIEW" | (string & {});

export type FeatureFlagMap = Record<string, boolean>;

export interface ThemeOverrides {
  [key: string]: unknown;
}

export interface ConfigResponse {
  model: ModelParams;
  flags: FeatureFlagMap;
  theme?: ThemeOverrides | null;
  updated_at: string;
  updated_by?: string | null;
}

export interface ConfigUpdateRequest {
  model?: ModelParams;
  flags?: FeatureFlagMap;
  theme?: ThemeOverrides | null;
}

export interface FlagsResponse {
  flags: FeatureFlagMap;
}

export interface KeyStatusResponse {
  configured: boolean;
  last_updated: string | null;
}

export interface HafniaKeyRequest {
  key: string;
}

export interface StandardErrorPayload {
  error?: {
    code?: string;
    message?: string;
    detail?: string;
  };
  message?: string;
  detail?: string;
}
