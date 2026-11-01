import type { Metadata } from "next";
import { ReportForm } from "@/components/foundit/report-form";
export const metadata: Metadata = { title: "Report a found item | FoundIt" };
export default function FoundReportPage() { return <ReportForm kind="found" />; }
