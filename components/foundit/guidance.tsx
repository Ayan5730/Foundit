"use client";
import { useState } from "react";
import type { Guidance } from "@/shared/api";
import { post, message } from "@/lib/client/api";
import { formatTime } from "./report-summary";
export function RecoveryGuidance() {
  const [result, setResult] = useState<Guidance | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function search() {
    setLoading(true);
    setError("");
    try {
      setResult(
        await post<Guidance>("/recovery-guidance", {
          organization: "rapid_metro",
        }),
      );
    } catch (reason) {
      setError(message(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="guidance-panel">
      <p className="section-kicker">Another useful next step</p>
      <h2>Could it have been left on your journey?</h2>
      <p>
        If you travelled on Rapid Metro, check its official lost-property
        process. This searches recovery instructions, not an item inventory.
      </p>
      <button
        className="button button-secondary"
        disabled={loading}
        onClick={search}
      >
        {loading
          ? "Looking up official sources…"
          : "Check Rapid Metro recovery guidance"}
      </button>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {result?.status === "available" ? (
        <div className="source-list">
          <p className="field-hint">
            Retrieved {formatTime(result.retrieved_at)}
          </p>
          {result.sources.map((source) => (
            <article key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
              <small>{new URL(source.url).hostname}</small>
              <p>{source.excerpt}</p>
            </article>
          ))}
        </div>
      ) : result ? (
        <p className="submission-notice" role="status">
          {result.status === "no_sources"
            ? "No official source was found in this search. Your report remains available in My reports."
            : "Official recovery guidance is temporarily unavailable. Try again later or contact the operator through its official website."}
        </p>
      ) : null}
    </section>
  );
}
