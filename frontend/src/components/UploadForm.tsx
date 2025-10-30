import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import type { AnalyzeStatus } from "../hooks/useAnalyze";

interface UploadFormProps {
  status: AnalyzeStatus;
  onAnalyze: (file: File) => void;
  onCancel: () => void;
  onReset: () => void;
}

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export function UploadForm({ status, onAnalyze, onCancel, onReset }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isUploading = status === "uploading";

  useEffect(() => {
    if (status === "success") {
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [status]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setFormError("Choose an MP4 or MKV clip before analyzing.");
      return;
    }
    setFormError(null);
    onAnalyze(selectedFile);
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSelectedFile(null);
    setFormError(null);
    onReset();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <form
      className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow"
      onSubmit={handleSubmit}
      noValidate
    >
      <fieldset className="flex flex-col gap-4" disabled={isUploading}>
        <legend className="text-lg font-semibold text-slate-100">Upload clip</legend>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="video-upload">
            Video file
          </label>
          <input
            ref={inputRef}
            id="video-upload"
            name="video"
            type="file"
            accept="video/mp4,video/x-matroska"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-describedby="video-upload-hint"
          />
          <p className="text-xs text-slate-400" id="video-upload-hint">
            Supports MP4 or MKV up to 100 MB and roughly 30 seconds of footage.
          </p>
          {selectedFile ? (
            <p className="text-xs text-slate-300">
              Selected: <span className="font-medium">{selectedFile.name}</span> · {formatFileSize(selectedFile.size)}
            </p>
          ) : null}
          {formError ? (
            <p className="text-sm text-rose-400" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedFile || isUploading}
          >
            Analyze clip
          </button>
          {isUploading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-md border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

export default UploadForm;
