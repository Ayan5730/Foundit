import { ClaimStatusView } from "@/components/foundit/claim-status";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClaimStatusView id={id} />;
}
