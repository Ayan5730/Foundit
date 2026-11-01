import type { Metadata } from "next";
import { ReportForm } from "@/components/foundit/report-form";
export const metadata: Metadata = { title: "Report a lost item | FoundIt" };
export default function LostReportPage() { return <ReportForm kind="lost" />; }
