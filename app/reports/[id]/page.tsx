import { ReportMatches } from "@/components/foundit/matches";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportMatches id={id} />;
}
