import { redirect } from "next/navigation";
import { AccountForm, type AccountMode } from "@/components/foundit/account-form";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (process.env.FOUNDIT_DEPLOY_TARGET !== "netlify") redirect("/signin-with-chatgpt?return_to=%2Fworkspace");
  const requested = (await searchParams).mode;
  const mode: AccountMode = requested === "signout" || requested === "password" ? requested : "login";
  return <main id="main-content" className="site-width workspace-page"><AccountForm initialMode={mode} /></main>;
}
