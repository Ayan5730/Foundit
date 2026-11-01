import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/foundit/site-header";

export const metadata: Metadata = {
  title: "FoundIt | A way back to your things",
  description: "Prepare a lost or found item report for the FoundIt event help desk.",
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
  return (
    <html lang="en">
      <body className="foundit-app antialiased">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <footer className="site-footer site-width"><a href="/">foundit.</a><p>A little care goes a long way.</p><span>Event lost property</span></footer>
      </body>
    </html>
  );
}
