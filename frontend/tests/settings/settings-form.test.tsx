/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../test-utils/providers";
import { ModelParamsForm, HafniaKeyForm } from "../../src/components/settings/SettingsForms";

describe("saas-settings ModelParamsForm", () => {
  it("rejects_fps_values_outside_supported_range", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ModelParamsForm
        initialValues={{ fps: 24, temperature: 0.7, default_prompt: "" }}
        onSubmit={async () => {}}
      />,
    );

    const fpsInput = await screen.findByLabelText(/frames per second/i);
    await user.clear(fpsInput);
    await user.type(fpsInput, "0");

    const submitButton = screen.getByRole("button", { name: /save model settings/i });
    await user.click(submitButton);

    expect(await screen.findByText(/fps must be between 1 and 120/i)).toBeInTheDocument();
  });

  it("rejects_temperature_values_above_maximum", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ModelParamsForm
        initialValues={{ fps: 24, temperature: 0.7, default_prompt: "" }}
        onSubmit={async () => {}}
      />,
    );

    const temperatureInput = await screen.findByLabelText(/temperature/i);
    await user.clear(temperatureInput);
    await user.type(temperatureInput, "2.5");

    const submitButton = screen.getByRole("button", { name: /save model settings/i });
    await user.click(submitButton);

    expect(await screen.findByText(/temperature must be between 0 and 2/i)).toBeInTheDocument();
  });

  it("shows_success_toast_when_submission_succeeds", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <ModelParamsForm
        initialValues={{ fps: 24, temperature: 0.7, default_prompt: "" }}
        onSubmit={handleSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save model settings/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/model settings saved/i)).toBeInTheDocument();
  });
});

describe("saas-settings HafniaKeyForm", () => {
  it("displays_a_masked_placeholder_when_key_already_configured", () => {
    renderWithProviders(
      <HafniaKeyForm keyConfigured onSubmit={async () => {}} />,
    );

    const keyInput = screen.getByLabelText(/hafnia api key/i) as HTMLInputElement;
    expect(keyInput.value).toBe("**********");
    expect(keyInput).toHaveAttribute("type", "password");
  });

  it("surfaces_toast_and_masks_value_after_successful_save", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <HafniaKeyForm keyConfigured={false} onSubmit={handleSubmit} />,
    );

    const keyInput = screen.getByLabelText(/hafnia api key/i) as HTMLInputElement;
    await user.type(keyInput, "hf_test_key_12345");

    const submitButton = screen.getByRole("button", { name: /save hafnia key/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith("hf_test_key_12345");
    });

    expect(await screen.findByText(/hafnia key saved/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(keyInput.value).toBe("**********");
    });
  });
});
