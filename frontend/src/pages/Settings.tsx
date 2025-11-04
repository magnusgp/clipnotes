import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/Card";
import {
  FeatureFlagsForm,
  HafniaKeyForm,
  ModelParamsForm,
  type ModelParamsFormValues,
} from "../components/settings/SettingsForms";
import { useConfigManager, useHafniaKeyManager } from "../hooks/useConfig";

type SettingsTab = "model" | "flags" | "keys";

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; description: string }> = [
  {
    id: "model",
    label: "Model parameters",
    description: "Tune Hafnia analysis defaults for future clip processing.",
  },
  {
    id: "flags",
    label: "Feature flags",
    description: "Toggle experimental capabilities for the monitoring experience.",
  },
  {
    id: "keys",
    label: "Hafnia API key",
    description: "Rotate credentials used for Hafnia uploads and analyses.",
  },
];

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    void error;
    return null;
  }
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("model");
  const configManager = useConfigManager();
  const hafniaKeyManager = useHafniaKeyManager();

  const modelInitialValues = useMemo<ModelParamsFormValues>(
    () => ({
      fps: configManager.model?.fps ?? 24,
      temperature: configManager.model?.temperature ?? 0.7,
      default_prompt: configManager.model?.default_prompt ?? "",
    }),
    [configManager.model],
  );

  const configUpdatedAt = formatTimestamp(configManager.config?.updated_at ?? null);
  const keyLastUpdated = formatTimestamp(hafniaKeyManager.data?.last_updated ?? null);

  const renderBody = () => {
    switch (activeTab) {
      case "model":
        return (
          <ModelParamsForm
            initialValues={modelInitialValues}
            onSubmit={async (values) => {
              await configManager.saveModelParams(values);
            }}
            isSaving={configManager.isSavingModel}
          />
        );
      case "flags":
        return (
          <FeatureFlagsForm
            flags={configManager.flags}
            onSubmit={async (nextFlags) => {
              await configManager.saveFlags(nextFlags);
            }}
            isSaving={configManager.isSavingFlags}
            isLoading={configManager.isLoading && !Object.keys(configManager.flags).length}
          />
        );
      case "keys":
        return (
          <HafniaKeyForm
            keyConfigured={Boolean(hafniaKeyManager.data?.configured)}
            onSubmit={async (value) => {
              await hafniaKeyManager.saveKey(value);
            }}
            isSaving={hafniaKeyManager.isSaving}
          />
        );
      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (activeTab === "model" || activeTab === "flags") {
      if (!configUpdatedAt) {
        return null;
      }
  return <p className="text-xs text-text-secondary/70">Last updated {configUpdatedAt}.</p>;
    }

    if (activeTab === "keys") {
      if (!keyLastUpdated) {
  return <p className="text-xs text-text-secondary/70">No Hafnia key configured yet.</p>;
      }
  return <p className="text-xs text-text-secondary/70">Last rotated {keyLastUpdated}.</p>;
    }

    return null;
  };

  const activeError =
    activeTab === "keys"
      ? hafniaKeyManager.error
      : configManager.error && configManager.status === "error"
      ? configManager.error
      : null;

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.26em] text-emerald-400">Operator settings</p>
        <h1 className="text-3xl font-semibold text-slate-100">Configure SaaS controls</h1>
        <p className="text-sm text-slate-300">
          Adjust Hafnia defaults, toggle feature access, and manage credentials for the premium monitoring shell.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card interactive={false} padded={false} className="w-full lg:min-w-[240px] lg:max-w-[280px]">
          <nav
            className="flex flex-row flex-wrap gap-2 p-4 lg:flex-col"
            role="tablist"
            aria-label="Settings sections"
          >
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`settings-panel-${tab.id}`}
                  className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                      : "border-transparent bg-surface-canvas/50 text-text-secondary hover:bg-surface-canvas/70"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="text-sm font-semibold text-text-primary">{tab.label}</span>
                  <span className="text-xs text-text-secondary/70">{tab.description}</span>
                </button>
              );
            })}
          </nav>
        </Card>

        <Card id={`settings-panel-${activeTab}`} interactive={false} className="flex-1">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">
              {SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label ?? "Settings"}
            </CardTitle>
            <CardDescription className="text-base text-text-secondary">
              {SETTINGS_TABS.find((tab) => tab.id === activeTab)?.description ?? "Manage settings."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {activeError ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200"
              >
                {activeError.message}
              </p>
            ) : null}

            {renderBody()}

            {renderFooter()}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
