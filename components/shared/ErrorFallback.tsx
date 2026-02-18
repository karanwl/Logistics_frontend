"use client";

export function ErrorFallback({
  title,
  message,
  errorId,
  onRetry
}: {
  title: string;
  message: string;
  errorId: string;
  onRetry: () => void;
}) {
  return (
    <div className="shell">
      <section className="card mx-auto max-w-2xl">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-steel-600">{message}</p>
          <p className="text-xs text-steel-500">
            Error ID: <span className="font-mono text-steel-600">{errorId}</span>
          </p>
          <button className="btn btn-primary" onClick={onRetry} type="button">
            Try again
          </button>
        </div>
      </section>
    </div>
  );
}
