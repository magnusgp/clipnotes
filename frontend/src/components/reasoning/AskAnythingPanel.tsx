import { FormEvent, useState } from "react";

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
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-emerald-400">Ask anything</p>
        <h2 className="text-lg font-semibold text-slate-100">Continue the conversation</h2>
        <p className="text-sm text-slate-300">
          Follow up on the comparison or ask targeted questions about the selected clips. Answers persist in history so you can
          revisit them later.
        </p>
      </header>

      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        <textarea
          className="min-h-[96px] w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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

        {successState ? <p className="text-xs text-emerald-400">{successState}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
          >
            {isSending ? "Sending…" : "Send follow-up"}
          </button>
          <span className="text-xs text-slate-400">
            {clipCount > 0 ? `Active selection: ${clipCount} clip${clipCount === 1 ? "" : "s"}.` : "No clips selected."}
          </span>
        </div>
      </form>
    </section>
  );
}

export default AskAnythingPanel;
