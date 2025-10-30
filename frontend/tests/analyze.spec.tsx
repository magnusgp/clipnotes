import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import UploadForm from "../src/components/UploadForm";

function renderUploadForm(overrides?: Partial<React.ComponentProps<typeof UploadForm>>) {
  const props: React.ComponentProps<typeof UploadForm> = {
    status: "idle",
    onAnalyze: vi.fn(),
    onCancel: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<UploadForm {...props} />),
    props,
  };
}

describe("UploadForm", () => {
  it("invalid_upload_shows_message", async () => {
    const onAnalyze = vi.fn();

    renderUploadForm({ onAnalyze });

    const fileInput = screen.getByLabelText(/video file/i) as HTMLInputElement;
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [textFile] } });
    fireEvent.click(screen.getByRole("button", { name: /analyze clip/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported file type/i);
    expect(onAnalyze).not.toHaveBeenCalled();
  });
});
