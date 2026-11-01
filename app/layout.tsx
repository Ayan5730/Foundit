import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoundIt | Shared foundation",
  description: "Shared development foundation for FoundIt, an event lost-property recovery service.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
