"use client";
import type { Claim } from "@/shared/api";
import { useResource } from "@/lib/client/use-resource";
import { RequireSession } from "./session";
import { ErrorState } from "./workspace";
import { formatTime } from "./report-summary";
export function ClaimStatusView({ id }: { id: string }) {
  return (
    <main id="main-content" className="site-width workspace-page">
      <a className="back-link" href="/workspace">
        ← My reports
      </a>
      <div className="page-title">
        <p className="section-kicker">Your private recovery request</p>
        <h1>A little closer to home.</h1>
      </div>
      <RequireSession>
        <StatusData id={id} />
      </RequireSession>
    </main>
  );
}
function StatusData({ id }: { id: string }) {
  const claim = useResource<Claim>("/claims/" + encodeURIComponent(id));
  if (claim.loading) return <p role="status">Loading your recovery ticket…</p>;
  if (claim.error)
    return <ErrorState text={claim.error} retry={claim.refresh} />;
  if (!claim.data) return null;
  const value = claim.data,
    step =
      value.status === "recovered" ? 3 : value.status === "approved" ? 2 : 1;
  return (
    <section className="claim-ticket">
      <div className="ticket-top">
        <strong>Recovery ticket {value.id.slice(0, 8)}</strong>
        <span className={"status-badge status-" + value.status}>
          {value.status}
        </span>
      </div>
      <div className="claim-ticket-body">
        <h2>
          {value.status === "recovered"
            ? "Handover confirmed."
            : value.status === "approved"
              ? "Approved. Collection is next."
              : value.status === "rejected"
                ? "This request was not approved."
                : "Your request is with the help desk."}
        </h2>
        <p>
          {value.status === "recovered"
            ? "Staff have confirmed the handover and marked both reports recovered."
            : value.status === "approved"
              ? "Staff have approved the ownership check. Arrange collection with the help desk; the item is recovered only after handover is confirmed."
              : value.status === "rejected"
                ? "Staff could not approve this claim. You can continue checking your report for other candidates."
                : "Staff will compare your evidence privately with the finder’s identifying clue."}
        </p>
        <ol className="recovery-timeline">
          {[
            "Private request submitted",
            "Ownership check approved",
            "Handover confirmed",
          ].map((label, index) => (
            <li
              className={
                index < step && value.status !== "rejected" ? "complete" : ""
              }
              key={label}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{label}</strong>
                {index === 0 ? (
                  <small>{formatTime(value.created_at)}</small>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="field-hint">
          Last updated {formatTime(value.updated_at)}
        </p>
        <details className="private-evidence">
          <summary>Your private evidence</summary>
          <p>{value.evidence}</p>
        </details>
        <div className="workspace-toolbar">
          <button className="button button-secondary" onClick={claim.refresh}>
            Refresh status
          </button>
          <a className="text-action" href={"/reports/" + value.lost_report_id}>
            Back to my lost report
          </a>
        </div>
      </div>
    </section>
  );
}
