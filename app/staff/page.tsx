import { StaffWorkspace } from "@/components/foundit/staff";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim } = await searchParams;
  return <StaffWorkspace claimId={claim} />;
}
