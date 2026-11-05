import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naviya — Every way. Every possibility.",
  description: "Explore Malaysia and enjoy Naviya digital rewards.",
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
      <head><link rel="stylesheet" href="/icons.css"/><link rel="stylesheet" href="/responsive.css"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
