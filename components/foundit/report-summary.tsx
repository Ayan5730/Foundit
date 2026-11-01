import { MapPin, Package, Clock } from "lucide-react";
import type { PublicReport } from "@/shared/api";
import { ItemVisual } from "./item-visual";
export function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date) + " IST";
}
export function ReportSummary({
  report,
  label,
}: {
  report: PublicReport;
  label?: string;
}) {
  return (
    <section className="report-summary">
      <div className="summary-kind">
        <Package size={19} />
        <span>
          {label ??
            (report.kind === "lost" ? "Reported lost" : "Reported found")}
        </span>
        <span className={"status-badge status-" + report.status}>
          {report.status}
        </span>
      </div>
      <ItemVisual key={report.id} report={report} />
      {report.has_shared_preview ? (
        <p className="item-visual-caption">Shared item preview. Staff still verify private evidence.</p>
      ) : null}
      <h2>{report.title}</h2>
      <p className="summary-description">{report.description}</p>
      <dl>
        <div>
          <dt>Category</dt>
          <dd>{report.category}</dd>
        </div>
        <div>
          <dt>Color</dt>
          <dd>{report.color ?? "Not specified"}</dd>
        </div>
        <div>
          <dt>
            <MapPin size={13} /> Event area
          </dt>
          <dd>{report.location}</dd>
        </div>
        <div>
          <dt>
            <Clock size={13} /> Approximate time
          </dt>
          <dd>{formatTime(report.occurred_at)}</dd>
        </div>
      </dl>
      {report.visible_features.length ? (
        <div className="feature-tags">
          {report.visible_features.map((feature, index) => (
            <span key={index}>{feature}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
