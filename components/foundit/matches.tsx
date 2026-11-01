"use client";
import { useRef, useState, type FormEvent } from "react";
import type { PublicReport, Matches, Claim, CreateClaim } from "@/shared/api";
import { useResource } from "@/lib/client/use-resource";
import { post, message, requestIdentity } from "@/lib/client/api";
import { RequireSession } from "./session";
import { ReportSummary } from "./report-summary";
import { ErrorState, EmptyState } from "./workspace";
import { RecoveryGuidance } from "./guidance";
import { ItemVisual } from "./item-visual";
export function ReportMatches({ id }: { id: string }) {
  return (
    <main id="main-content" className="site-width workspace-page">
      <a className="back-link" href="/workspace">
        ← My reports
      </a>
      <div className="page-title">
        <p className="section-kicker">Compare the clues</p>
        <h1>A possible way back.</h1>
        <p>
          A candidate is a starting point. Private evidence and a staff check
          establish ownership.
        </p>
      </div>
      <RequireSession>
        <MatchesData id={id} />
      </RequireSession>
    </main>
  );
}
function MatchesData({ id }: { id: string }) {
  const report = useResource<PublicReport>(
      "/reports/" + encodeURIComponent(id),
    ),
    matches = useResource<Matches>(
      "/reports/" + encodeURIComponent(id) + "/matches",
    );
  const [selected, setSelected] = useState<string | null>(null);
  const [hidingPreview, setHidingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const retry = () => {
    report.refresh();
    matches.refresh();
  };
  if (report.loading || matches.loading)
    return (
      <p className="service-state" role="status">
        Finding possible connections…
      </p>
    );
  if (report.error || matches.error)
    return <ErrorState text={report.error || matches.error} retry={retry} />;
  if (!report.data || !matches.data) return null;
  const source = report.data,
    candidates = matches.data.candidates,
    candidate =
      candidates.find((item) => item.candidate.id === selected) ??
      candidates[0];
  async function hidePreview() {
    setHidingPreview(true);
    setPreviewError("");
    try {
      await post<PublicReport>("/reports/" + encodeURIComponent(source.id) + "/preview/hide", {});
      retry();
    } catch (reason) {
      setPreviewError(message(reason));
    } finally {
      setHidingPreview(false);
    }
  }
  return (
    <>
      <div className="workspace-toolbar">
        <span className={"status-badge status-" + source.status}>
          {source.status}
        </span>
        <button className="text-action" onClick={retry}>
          Refresh matches
        </button>
        {source.has_shared_preview ? (
          <button className="text-action" onClick={hidePreview} disabled={hidingPreview}>
            {hidingPreview ? "Hiding preview…" : "Hide shared preview"}
          </button>
        ) : null}
      </div>
      {previewError ? <p className="field-error" role="alert">{previewError}</p> : null}
      {matches.data.retrieval_complete === false ? <p className="submission-notice" role="status">Only part of this large inventory was checked. Ask the help desk to search remaining records; an empty result is not a complete search.</p> : null}
      {source.status !== "active" ? (
        <div className="submission-notice" role="status">
          {source.status === "recovered"
            ? "This report is marked recovered."
            : "This report is reserved for an approved recovery. Handover is still to be confirmed."}
        </div>
      ) : null}
      {candidate ? (
        <>
          <div
            className="candidate-tabs"
            role="group"
            aria-label="Possible matches"
          >
            {candidates.map((item) => (
              <button
                key={item.candidate.id}
                type="button"
                aria-pressed={candidate.candidate.id === item.candidate.id}
                onClick={() => setSelected(item.candidate.id)}
              >
                <ItemVisual report={item.candidate} compact />
                <span className="candidate-copy">
                  <strong>{item.candidate.title}</strong>
                  <span>{item.score}/100 similarity</span>
                </span>
              </button>
            ))}
          </div>
          <div className="comparison-grid">
            <ReportSummary report={source} label="Your report" />
            <ReportSummary report={candidate.candidate} />
          </div>
          <section className="matching-evidence">
            <div>
              <h2>Why these reports may be related</h2>
              <p>{matches.data.score_label}</p>
            </div>
            <strong className="actual-score">
              {candidate.score}
              <small>/100</small>
            </strong>
            <ul>
              {candidate.reasons.map((reason) => (
                <li key={reason.factor}>
                  <span
                    className={"assessment assessment-" + reason.assessment}
                  >
                    {reason.assessment}
                  </span>
                  <strong>{reason.factor}</strong>
                  <span>{reason.text}</span>
                </li>
              ))}
            </ul>
          </section>
          {source.kind === "lost" && source.status === "active" ? (
            <ClaimRequest
              key={candidate.candidate.id}
              lostId={source.id}
              foundId={candidate.candidate.id}
            />
          ) : (
            <div className="submission-notice">
              These are possible owner reports. Help-desk staff handle private
              verification and handover.
            </div>
          )}
        </>
      ) : (
        <>
          <ReportSummary report={source} />
          <EmptyState
            title={
              source.status === "active"
                ? "No suitable match yet."
                : "No active candidates."
            }
            text={
              source.status === "active"
                ? "Your report is saved. Check back as other people report items. We won’t invent a match when the clues don’t support one."
                : "Reserved and recovered reports are excluded from matching."
            }
          />
          {source.status === "active" && source.kind === "lost" ? (
            <RecoveryGuidance />
          ) : null}
        </>
      )}
    </>
  );
}
function ClaimRequest({
  lostId,
  foundId,
}: {
  lostId: string;
  foundId: string;
}) {
  const [evidence, setEvidence] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const identity = useRef<{ payload: string; id: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!evidence.trim()) {
      setError(
        "Describe one identifying detail absent from the public report.",
      );
      return;
    }
    const payload = {
      lost_report_id: lostId,
      found_report_id: foundId,
      evidence: evidence.trim(),
    };
    identity.current = requestIdentity(identity.current, payload);
    setBusy(true);
    setError("");
    try {
      const claim = await post<Claim>("/claims", {
        ...payload,
        client_request_id: identity.current.id,
      } satisfies CreateClaim);
      window.location.assign("/claims/" + claim.id);
    } catch (reason) {
      setError(message(reason));
      setBusy(false);
    }
  }
  return (
    <section className="claim-request">
      <h2>Think this could be yours?</h2>
      <p>
        Describe a hidden identifying detail for staff. It will be compared
        privately with the finder’s recorded clue.
      </p>
      <form onSubmit={submit} autoComplete="off">
        <div className="field">
          <label htmlFor="evidence">Your private ownership evidence</label>
          <textarea
            id="evidence"
            value={evidence}
            maxLength={2000}
            rows={4}
            onChange={(e) => setEvidence(e.target.value)}
            aria-describedby={error ? "claim-error" : "evidence-hint"}
            required
          />
          <span className="field-hint" id="evidence-hint">
            Keep this detail out of public descriptions. A similarity score does
            not prove ownership.
          </span>
        </div>
        {error ? (
          <p id="claim-error" role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        <button className="button button-primary" disabled={busy}>
          {busy ? "Sending private request…" : "Request a private check"}
        </button>
      </form>
    </section>
  );
}
