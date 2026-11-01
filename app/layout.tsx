import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/foundit/site-header";
import { SessionProvider } from "@/components/foundit/session";
import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";

export const metadata: Metadata = {
  title: "FoundIt | A way back to your things",
  description:
    "Prepare a lost or found item report for the FoundIt event help desk.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const netlify = process.env.FOUNDIT_DEPLOY_TARGET === "netlify";
  return (
    <html lang="en">
      <body className="foundit-app antialiased">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SessionProvider
          authProvider={netlify ? "netlify" : "sites"}
          signInHref={netlify ? "/account" : chatGPTSignInPath("/workspace")}
          signOutHref={netlify ? "/account?mode=signout" : chatGPTSignOutPath("/")}
        >
          <SiteHeader />
          {children}
          <footer className="site-footer site-width">
            <a href="/">foundit.</a>
            <p>A little care goes a long way.</p>
            <span>Event lost property</span>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
