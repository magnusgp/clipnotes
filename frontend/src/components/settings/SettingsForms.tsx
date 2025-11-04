import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { useToast } from "../toast/ToastProvider";

export interface ModelParamsFormValues {
  fps: number;
  temperature: number;
  default_prompt?: string | null;
}

export interface ModelParamsFormProps {
  initialValues: ModelParamsFormValues;
  onSubmit: (values: ModelParamsFormValues) => Promise<void> | void;
  isSaving?: boolean;
}

const FPS_MIN = 1;
const FPS_MAX = 120;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;

interface ModelParamsErrors {
  fps?: string;
  temperature?: string;
  submit?: string;
}

export function ModelParamsForm({ initialValues, onSubmit, isSaving }: ModelParamsFormProps): ReactElement {
  const [formValues, setFormValues] = useState(() => ({
    fps: String(initialValues.fps ?? FPS_MIN),
    temperature: String(initialValues.temperature ?? 1),
    default_prompt: initialValues.default_prompt ?? "",
  }));
  const [errors, setErrors] = useState<ModelParamsErrors>({});
  const toast = useToast();

  useEffect(() => {
    setFormValues({
      fps: String(initialValues.fps ?? FPS_MIN),
      temperature: String(initialValues.temperature ?? 1),
      default_prompt: initialValues.default_prompt ?? "",
    });
    setErrors({});
  }, [initialValues.fps, initialValues.temperature, initialValues.default_prompt]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
  };

  const validate = (fpsValue: number, temperatureValue: number): ModelParamsErrors => {
    const nextErrors: ModelParamsErrors = {};

    if (!Number.isFinite(fpsValue) || fpsValue < FPS_MIN || fpsValue > FPS_MAX) {
      nextErrors.fps = "FPS must be between 1 and 120";
    }

    if (!Number.isFinite(temperatureValue) || temperatureValue < TEMPERATURE_MIN || temperatureValue > TEMPERATURE_MAX) {
      nextErrors.temperature = "Temperature must be between 0 and 2";
    }

    return nextErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fpsValue = Number(formValues.fps);
    const temperatureValue = Number(formValues.temperature);
    const defaultPromptValue = formValues.default_prompt?.trim() ?? "";

    const validationErrors = validate(fpsValue, temperatureValue);
    if (validationErrors.fps || validationErrors.temperature) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const runSubmit = async () => {
      try {
        await onSubmit({
          fps: fpsValue,
          temperature: temperatureValue,
          default_prompt: defaultPromptValue.length > 0 ? defaultPromptValue : null,
        });
        toast.push({
          variant: "success",
          title: "Model settings saved",
          description: "New analyses will use these parameters.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save model settings.";
        setErrors({ submit: message });
        toast.push({
          variant: "error",
          title: "Model settings failed",
          description: message,
        });
      }
    };

    void runSubmit();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-text-primary" htmlFor="model-fps">
          Frames per second
        </label>
        <input
          id="model-fps"
          name="fps"
          type="number"
          min={FPS_MIN}
          max={FPS_MAX}
          step={1}
          inputMode="numeric"
          value={formValues.fps}
          onChange={handleChange}
          disabled={isSaving}
          className="w-full rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
          aria-invalid={Boolean(errors.fps)}
        />
        {errors.fps ? (
          <p role="alert" className="text-sm text-rose-400">
            {errors.fps}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-semibold text-text-primary" htmlFor="model-temperature">
          Temperature
        </label>
        <input
          id="model-temperature"
          name="temperature"
          type="number"
          min={TEMPERATURE_MIN}
          max={TEMPERATURE_MAX}
          step={0.1}
          inputMode="decimal"
          value={formValues.temperature}
          onChange={handleChange}
          disabled={isSaving}
          className="w-full rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
          aria-invalid={Boolean(errors.temperature)}
        />
        {errors.temperature ? (
          <p role="alert" className="text-sm text-rose-400">
            {errors.temperature}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-semibold text-text-primary" htmlFor="model-default-prompt">
          Default prompt
        </label>
        <textarea
          id="model-default-prompt"
          name="default_prompt"
          value={formValues.default_prompt ?? ""}
          onChange={handleChange}
          disabled={isSaving}
          rows={3}
          className="w-full rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
          placeholder="Optional prompt to preload for new sessions."
        />
        <p className="text-xs text-text-secondary/75">Leave blank to use defaults from the Hafnia Playbook.</p>
      </div>

      {errors.submit ? (
        <p role="alert" className="text-sm text-rose-400">
          {errors.submit}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : "Save model settings"}
      </button>
    </form>
  );
}

export interface HafniaKeyFormProps {
  keyConfigured: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  isSaving?: boolean;
}

const MASKED_KEY_VALUE = "**********";

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  ENABLE_LIVE_MODE: {
    label: "Enable live mode",
    description: "Stream live Hafnia updates while clips upload.",
  },
  ENABLE_GRAPH_VIEW: {
    label: "Enable graph view",
    description: "Show experimental usage graphs on monitoring pages.",
  },
};

const FLAG_ORDER = ["ENABLE_LIVE_MODE", "ENABLE_GRAPH_VIEW"] as const;
const FLAG_SET = new Set<string>(FLAG_ORDER);

function formatFlagLabel(flag: string): { label: string; description: string } {
  const preset = FLAG_LABELS[flag];
  if (preset) {
    return preset;
  }

  const pretty = flag
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
  return {
    label: pretty,
    description: "Toggle this experimental feature flag.",
  };
}

export interface FeatureFlagsFormProps {
  flags: Record<string, boolean>;
  onSubmit: (nextFlags: Record<string, boolean>) => Promise<void> | void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function FeatureFlagsForm({ flags, onSubmit, isSaving, isLoading }: FeatureFlagsFormProps): ReactElement {
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(() => ({ ...flags }));
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setLocalFlags({ ...flags });
    setError(null);
  }, [flags]);

  const orderedKeys = useMemo(() => {
    const known = FLAG_ORDER.filter((flag) => flag in localFlags);
    const others = Object.keys(localFlags)
      .filter((key) => !FLAG_SET.has(key))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...others];
  }, [localFlags]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setLocalFlags((current) => ({ ...current, [name]: checked }));
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!Object.keys(localFlags).length) {
      setError("No feature flags configured yet.");
      return;
    }

    setError(null);

    const runSubmit = async () => {
      try {
        const payload = Object.fromEntries(Object.entries(localFlags)) as Record<string, boolean>;
        await onSubmit(payload);
        toast.push({
          variant: "success",
          title: "Feature flags updated",
          description: "Flag changes are now active for new sessions.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save feature flags.";
        setError(message);
        toast.push({
          variant: "error",
          title: "Feature flag save failed",
          description: message,
        });
      }
    };

    void runSubmit();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-text-primary">Feature flags</h3>
          <p className="text-xs text-text-secondary/75">
            Toggle experimental capabilities for the monitoring experience. Flags update immediately for new sessions.
          </p>
        </header>

        <fieldset className="space-y-3" disabled={isSaving}>
          <legend className="sr-only">Feature flags</legend>

          {isLoading && !orderedKeys.length ? (
            <p className="text-sm text-text-secondary/70">Loading feature flags…</p>
          ) : null}

          {orderedKeys.map((flagKey) => {
            const info = formatFlagLabel(flagKey);
            const inputId = `flag-${flagKey.toLowerCase()}`;
            return (
              <label key={flagKey} htmlFor={inputId} className="flex items-start gap-3">
                <input
                  id={inputId}
                  name={flagKey}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border border-border-glass bg-surface-canvas/70 text-emerald-300 focus:ring-emerald-400"
                  checked={Boolean(localFlags[flagKey])}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                <span>
                  <span className="block text-sm font-semibold text-text-primary">{info.label}</span>
                  <span className="text-xs text-text-secondary/75">{info.description}</span>
                </span>
              </label>
            );
          })}

          {!orderedKeys.length && !isLoading ? (
            <p className="text-sm text-text-secondary/70">No feature flags available for this environment.</p>
          ) : null}
        </fieldset>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : "Save feature flags"}
      </button>
    </form>
  );
}

export function HafniaKeyForm({ keyConfigured, onSubmit, isSaving }: HafniaKeyFormProps): ReactElement {
  const [value, setValue] = useState(keyConfigured ? MASKED_KEY_VALUE : "");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setValue(keyConfigured ? MASKED_KEY_VALUE : "");
    setError(null);
  }, [keyConfigured]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    setError(null);
  };

  const handleFocus = () => {
    if (keyConfigured && value === MASKED_KEY_VALUE) {
      setValue("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a Hafnia API key.");
      return;
    }

    setError(null);

    const runSubmit = async () => {
      try {
        await onSubmit(trimmed);
        setValue(MASKED_KEY_VALUE);
        toast.push({
          variant: "success",
          title: "Hafnia key saved",
          description: "A masked placeholder will appear when you revisit.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save Hafnia API key.";
        setError(message);
        toast.push({
          variant: "error",
          title: "Hafnia key save failed",
          description: message,
        });
      }
    };

    void runSubmit();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-text-primary" htmlFor="hafnia-api-key">
          Hafnia API key
        </label>
        <input
          id="hafnia-api-key"
          name="hafnia_key"
          type="password"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          disabled={isSaving}
          autoComplete="off"
          className="w-full rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
          placeholder="Paste your API key from Hafnia."
        />
        <p className="text-xs text-text-secondary/75">Keys are hashed and stored securely for Hafnia workloads.</p>
        {error ? (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
      >
        {isSaving ? "Saving…" : "Save Hafnia key"}
      </button>
    </form>
  );
}
