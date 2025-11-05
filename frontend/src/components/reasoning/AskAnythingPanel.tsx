import { FormEvent, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../Card";

interface AskAnythingPanelProps {
  clipCount: number;
  isSending: boolean;
  onSend: (payload: { message: string }) => Promise<unknown>;
  errorMessage?: string | null;
  disabled?: boolean;
}

function AskAnythingPanel({ clipCount, isSending, onSend, errorMessage, disabled }: AskAnythingPanelProps) {
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<string | null>(null);

  const canSubmit = clipCount > 0 && message.trim().length > 0 && !isSending && !disabled;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!clipCount) {
      setLocalError("Select at least one analyzed clip before sending a follow-up question.");
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      setLocalError("Enter a follow-up question.");
      return;
    }

    setLocalError(null);
    setSuccessState(null);

    const runSend = async () => {
      try {
        await onSend({ message: trimmed });
        setMessage("");
        setSuccessState("Follow-up sent.");
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unable to send follow-up.";
        setLocalError(messageText);
      }
    };

    void runSend();
  };

  return (
    <Card interactive={false} surface="glass">
      <CardHeader className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-accent-primary">Ask anything</p>
        <CardTitle className="text-lg">Continue the conversation</CardTitle>
        <p className="text-sm text-text-secondary">
          Follow up on the comparison or ask targeted questions about the selected clips. Answers persist in history so you
          can revisit them later.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <form className="space-y-3" onSubmit={handleSubmit} noValidate>
          <textarea
            className="min-h-[96px] w-full rounded-2xl border border-border-glass/75 bg-surface-glass/70 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setLocalError(null);
              setSuccessState(null);
            }}
            placeholder={clipCount ? "What else should we investigate?" : "Select clips to enable follow-up questions."}
            disabled={disabled}
          />

          {localError ? (
            <p role="alert" className="text-sm text-rose-400">
              {localError}
            </p>
          ) : null}

          {errorMessage && !localError ? (
            <p role="alert" className="text-sm text-rose-400">
              {errorMessage}
            </p>
          ) : null}

          {successState ? <p className="text-xs text-emerald-500">{successState}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-text-primary px-4 py-2 text-sm font-semibold text-surface-canvas transition hover:bg-text-accent focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 focus:ring-offset-surface-glass disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
            >
              {isSending ? "Sending…" : "Send follow-up"}
            </button>
            <span className="text-xs text-text-secondary/75">
              {clipCount > 0 ? `Active selection: ${clipCount} clip${clipCount === 1 ? "" : "s"}.` : "No clips selected."}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default AskAnythingPanel;
