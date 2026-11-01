"use client";
import { useRef, useState, useEffect } from "react";
import type {
  Claim,
  ClaimSummary,
  ClaimStatus,
  StaffClaim,
} from "@/shared/api";
import { useResource } from "@/lib/client/use-resource";
import { post, message } from "@/lib/client/api";
import { RequireSession } from "./session";
import { ReportSummary, formatTime } from "./report-summary";
import { ErrorState, EmptyState } from "./workspace";
type Queue = { claims: ClaimSummary[]; counts: Record<ClaimStatus, number> };
type Action = "approved" | "rejected" | "handover";
export function StaffWorkspace({ claimId }: { claimId?: string }) {
  return (
    <main id="main-content" className="site-width workspace-page">
      <div className="page-title">
        <p className="section-kicker">Authorized help-desk staff</p>
        <h1>Make the right return.</h1>
        <p>
          Compare private evidence and confirm the item is at the help desk
          before approving. Confirm handover only after the item is collected.
        </p>
      </div>
      <RequireSession staff>
        <StaffData claimId={claimId} />
      </RequireSession>
    </main>
  );
}
function StaffData({ claimId }: { claimId?: string }) {
  const [offset, setOffset] = useState(0);
  const queue = useResource<Queue>("/staff/claims?offset=" + offset);
  if (queue.loading) return <p role="status">Loading the review desk…</p>;
  if (queue.error)
    return <ErrorState text={queue.error} retry={queue.refresh} />;
  return (
    <>
      <div className="staff-counts">
        {Object.entries(queue.data?.counts ?? {}).map(([label, count]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="staff-layout">
        <aside className="staff-queue">
          <div className="section-heading">
            <h2>Recovery queue</h2>
            <button className="text-action" onClick={queue.refresh}>
              Refresh
            </button>
          </div>
          {queue.data?.claims.length ? (
            queue.data.claims.map((item) => (
              <a
                key={item.id}
                href={"/staff?claim=" + item.id}
                className={
                  "staff-queue-item" + (item.id === claimId ? " selected" : "")
                }
              >
                <strong>Ticket {item.id.slice(0, 8)}</strong>
                <span className={"status-badge status-" + item.status}>
                  {item.status}
                </span>
                <small>{formatTime(item.created_at)}</small>
              </a>
            ))
          ) : (
            <EmptyState
              title="No requests waiting."
              text="New private recovery requests will appear here."
            />
          )}
          <div className="workspace-toolbar" aria-label="Recovery queue pages">
            <button className="text-action" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>Previous</button>
            <span>Page {Math.floor(offset / 100) + 1}</span>
            <button className="text-action" disabled={offset + (queue.data?.claims.length ?? 0) >= Object.values(queue.data?.counts ?? {}).reduce((sum, count) => sum + count, 0)} onClick={() => setOffset(offset + 100)}>Next</button>
          </div>
        </aside>
        <div>
          {claimId ? (
            <StaffDetail key={claimId} id={claimId} onChange={queue.refresh} />
          ) : (
            <EmptyState
              title="Choose a ticket to review."
              text="Private clues and evidence are shown only after you open a request."
            />
          )}
        </div>
      </div>
    </>
  );
}
function StaffDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const detail = useResource<StaffClaim>(
    "/staff/claims/" + encodeURIComponent(id),
  );
  const [action, setAction] = useState<Action | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [note, setNote] = useState(""),
    [custodyConfirmed, setCustodyConfirmed] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (action) confirmRef.current?.focus();
  }, [action]);
  async function confirm() {
    if (!action || (action === "approved" && !custodyConfirmed)) return;
    setBusy(true);
    setError("");
    try {
      const value = await post<Claim>(
        "/staff/claims/" +
          encodeURIComponent(id) +
          (action === "handover" ? "/handover" : "/review"),
        action === "handover"
          ? {}
          : { decision: action, note: note.trim() || null, custody_confirmed: action === "approved" && custodyConfirmed },
      );
      setSuccess(
        value.status === "recovered"
          ? "Handover confirmed. Both reports are recovered."
          : value.status === "approved"
            ? "Claim approved. Handover is still required."
            : "Claim rejected.",
      );
      setAction(null);
      setCustodyConfirmed(false);
      setNote("");
      detail.refresh();
      onChange();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }
  if (detail.loading) return <p role="status">Loading private evidence…</p>;
  if (detail.error)
    return <ErrorState text={detail.error} retry={detail.refresh} />;
  if (!detail.data) return null;
  const value = detail.data;
  return (
    <section className="staff-detail">
      <div className="section-heading">
        <h2>Ticket {value.id.slice(0, 8)}</h2>
        <span className={"status-badge status-" + value.status}>
          {value.status}
        </span>
      </div>
      {success ? (
        <p className="success-notice" role="status">
          {success}
        </p>
      ) : null}
      <div className="comparison-grid">
        <ReportSummary report={value.lost_report} />
        <ReportSummary report={value.found_report} />
      </div>
      <div className="private-comparison">
        <section>
          <h3>Finder’s recorded private clue</h3>
          <p>{value.private_clue}</p>
        </section>
        <section>
          <h3>Claimant’s private evidence</h3>
          <p>{value.evidence}</p>
        </section>
      </div>
      {value.media_ids.length ? (
        <div className="private-photos">
          {value.media_ids.map((mediaId) => (
            <PrivatePhoto key={mediaId} id={mediaId} />
          ))}
        </div>
      ) : null}
      <p className="field-hint">
        Keep these details with authorized staff. Similarity alone is not an
        ownership check.
      </p>
      {value.status === "pending" ? (
        <>
          <div className="field">
            <label htmlFor="review-note">
              Private review note <small>Optional</small>
            </label>
            <textarea
              id="review-note"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="workspace-toolbar">
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                setCustodyConfirmed(false);
                setAction("approved");
              }}
            >
              Approve claim
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setAction("rejected")}
            >
              Reject claim
            </button>
          </div>
        </>
      ) : value.status === "approved" ? (
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() => setAction("handover")}
        >
          Confirm handover
        </button>
      ) : null}
      {action ? (
        <div
          ref={confirmRef}
          tabIndex={-1}
          className="confirmation-panel"
          role="group"
          aria-label="Confirm staff action"
        >
          <h3>
            {action === "handover"
              ? "Has the item been handed over?"
              : action === "approved"
                ? "Approve this ownership claim?"
                : "Reject this ownership claim?"}
          </h3>
          <p>
            {action === "handover"
              ? "Confirm only after physical collection. Both reports will be marked recovered."
              : action === "approved"
                ? "Compare the private evidence and check that the physical item is at the help desk. Approval reserves both reports; collection is a separate step."
                : "The claim will be marked rejected. Its evidence remains private."}
          </p>
          {action === "approved" ? (
            <label className="custody-confirmation">
              <input
                type="checkbox"
                checked={custodyConfirmed}
                onChange={(event) => setCustodyConfirmed(event.target.checked)}
                disabled={busy}
              />
              I have confirmed the physical item is at the help desk.
            </label>
          ) : null}
          <div className="workspace-toolbar">
            <button
              className="button button-primary"
              disabled={busy || (action === "approved" && !custodyConfirmed)}
              onClick={confirm}
            >
              {busy ? "Saving…" : "Confirm action"}
            </button>
            <button
              className="text-action"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setCustodyConfirmed(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
function PrivatePhoto({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className="field-hint">
      Private photo unavailable. Refresh your sign-in if needed.
    </p>
  ) : (
    <img
      src={"/api/v1/media/" + encodeURIComponent(id)}
      alt="Private item photo for staff verification"
      onError={() => setFailed(true)}
    />
  );
}
