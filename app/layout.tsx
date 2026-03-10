import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yiling Protocol — Oracle-Free Prediction Markets",
  description:
    "Oracle-free truth discovery infrastructure powered by game theory. Build prediction markets, governance, dispute resolution, and more. Built on Harvard's SKC mechanism.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
