"use client";
import type { PublicReport, ClaimSummary } from "@/shared/api";
import { RequireSession, useSession } from "./session";
import { useResource } from "@/lib/client/use-resource";
import { formatTime } from "./report-summary";
import { ItemVisual } from "./item-visual";
export function Workspace() {
  return (
    <main id="main-content" className="site-width workspace-page">
      <div className="page-title">
        <p className="section-kicker">Your help-desk record</p>
        <h1>My reports & recoveries</h1>
        <p>
          Keep track of what you’ve reported and the private checks in progress.
        </p>
      </div>
      <RequireSession>
        <WorkspaceData />
      </RequireSession>
    </main>
  );
}
function WorkspaceData() {
  const session = useSession(),
    reports = useResource<PublicReport[]>("/me/reports"),
    claims = useResource<ClaimSummary[]>("/me/claims");
  const refresh = () => {
    reports.refresh();
    claims.refresh();
  };
  return (
    <>
      <div className="workspace-toolbar">
        <a className="button button-primary" href="/report/lost">
          Report a lost item
        </a>
        <a className="button button-secondary" href="/report/found">
          Report a found item
        </a>
        <button className="text-action" onClick={refresh}>
          Refresh
        </button>
      </div>
      <section className="workspace-section">
        <div className="section-heading">
          <h2>My reports</h2>
          {reports.data ? (
            <span className="section-note">{reports.data.length} reports</span>
          ) : null}
        </div>
        {reports.loading ? (
          <p role="status">Loading reports…</p>
        ) : reports.error ? (
          <ErrorState text={reports.error} retry={reports.refresh} />
        ) : !reports.data?.length ? (
          <EmptyState
            title="Your first report starts here."
            text="Tell us about something you lost or an item you’d like to return."
          />
        ) : (
          <div className="record-list">
            {reports.data.map((report) => (
              <a
                className="record-row"
                href={"/reports/" + report.id}
                key={report.id}
              >
                <ItemVisual report={report} compact />
                <span className="record-main">
                  <strong>{report.title}</strong>
                  <small>
                    {report.location} · {formatTime(report.occurred_at)}
                  </small>
                </span>
                <span className={"status-badge status-" + report.status}>
                  {report.status}
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="workspace-section">
        <div className="section-heading">
          <h2>Recovery requests</h2>
        </div>
        {claims.loading ? (
          <p role="status">Loading requests…</p>
        ) : claims.error ? (
          <ErrorState text={claims.error} retry={claims.refresh} />
        ) : !claims.data?.length ? (
          <EmptyState
            title="No recovery requests yet."
            text="When a lost report has a promising candidate, you can submit a private ownership check."
          />
        ) : (
          <div className="record-list">
            {claims.data.map((claim) => (
              <a
                href={"/claims/" + claim.id}
                className="record-row"
                key={claim.id}
              >
                <span className="record-initial">R</span>
                <span className="record-main">
                  <strong>Recovery ticket {claim.id.slice(0, 8)}</strong>
                  <small>Submitted {formatTime(claim.created_at)}</small>
                </span>
                <span className={"status-badge status-" + claim.status}>
                  {claim.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
      {session.data?.user ? (
        <details className="account-details">
          <summary>My account details</summary>
          <p>
            Your Site account ID can be supplied to the publishing owner when
            staff access is needed. It does not grant staff access by itself.
          </p>
          <code>{session.data.user.id}</code>
        </details>
      ) : null}
    </>
  );
}
export function ErrorState({
  text,
  retry,
}: {
  text: string;
  retry: () => void;
}) {
  return (
    <div className="error-summary" role="alert">
      <p>{text}</p>
      <button type="button" className="text-action" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
