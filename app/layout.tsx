import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MerchantMind — Explainable AI Commerce Agent",
  description:
    "AI-powered revenue recovery with human-controlled financial actions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
